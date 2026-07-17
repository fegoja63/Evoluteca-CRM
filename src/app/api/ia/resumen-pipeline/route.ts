import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { filtroOwner } from "@/lib/permisos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));
const fecha = (d: Date) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const dias = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

const SYSTEM = `Eres un asesor comercial dentro de un CRM. Recibes un panorama agregado del pipeline de ventas de un equipo (o de un vendedor): oportunidades abiertas por etapa, valor y valor ponderado, negocios calientes, negocios estancados, cierres y pérdidas recientes, y el avance contra la meta del mes. Produces un brief ejecutivo breve y accionable para la reunión de ventas.

Responde SOLO con el brief en español, sin preámbulos ni frases como "Aquí está" ni comentarios sobre tu proceso. Usa estas cinco secciones con estos títulos exactos, cada una de 1 a 3 frases:

**Panorama** — tamaño del pipeline abierto, valor total y ponderado, dónde se concentra el valor.
**Calientes** — los negocios con mayor probabilidad de cierre próximo y qué los hace prioritarios.
**En riesgo** — negocios estancados (muchos días en la misma etapa), inactividad o patrones de pérdida reciente.
**Meta** — avance del mes contra el objetivo y si el pipeline alcanza para cerrar la brecha.
**Prioridades de la semana** — 2 o 3 acciones concretas, específicas para estos datos.

Sé concreto y apóyate solo en los datos dados. No inventes cifras. Si falta información para una sección, dilo en una frase.`;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." },
      { status: 503 },
    );
  }

  // Tope por usuario para que nadie dispare costos: 15 resúmenes por minuto.
  const permitido = await permitirYRegistrar(`ia-pipeline:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados resúmenes seguidos. Espera un momento." }, { status: 429 });
  }

  // Cupo mensual de IA compartido con los Resúmenes de cliente (Tenant.limiteResumenesIA
  // sobre UsoIA). null = ilimitado · 0 = desactivado · N>0 = tope mensual.
  const periodo = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { limiteResumenesIA: true },
  });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) {
    return NextResponse.json({ error: "Los Resúmenes con IA no están incluidos en tu plan." }, { status: 403 });
  }
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({
      where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } },
      select: { cantidad: true },
    });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json(
        { error: `Alcanzaste el límite de ${limite} acciones de IA este mes. Escríbenos para ampliar tu plan.` },
        { status: 429 },
      );
    }
  }

  const tenantId = session.user.tenantId;
  // Un COMERCIAL solo ve su propio pipeline; Gerente/Admin ven todo el equipo.
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);
  const esComercial = Object.keys(ownerFiltro).length > 0;

  // Nombres de etapa personalizados por tenant (key -> nombre visible).
  const etapasTenant = await prisma.etapaPipeline.findMany({
    where: { tenantId },
    select: { key: true, nombre: true, orden: true },
    orderBy: { orden: "asc" },
  });
  const nombreEtapa = (key: string) => etapasTenant.find(e => e.key === key)?.nombre ?? key;

  // Oportunidades abiertas (ni ganadas ni perdidas) con el último cambio de etapa,
  // para estimar cuántos días llevan en la etapa actual.
  const abiertas = await prisma.oportunidad.findMany({
    where: {
      tenantId,
      eliminadoEn: null,
      etapa: { notIn: ["GANADA", "PERDIDA"] },
      ...ownerFiltro,
    },
    select: {
      titulo: true, valor: true, etapa: true, probabilidad: true, creadoEn: true,
      empresa: { select: { nombre: true } },
      cambiosEtapa: { orderBy: { creadoEn: "desc" }, take: 1, select: { creadoEn: true } },
    },
  });

  // Enriquecer con días en la etapa actual y valor ponderado.
  const items = abiertas.map(o => {
    const entroEtapa = o.cambiosEtapa[0]?.creadoEn ?? o.creadoEn;
    const valor = Number(o.valor ?? 0);
    const prob = o.probabilidad ?? 50;
    return {
      titulo: o.titulo,
      empresa: o.empresa?.nombre ?? "(sin cliente)",
      etapa: o.etapa,
      valor,
      prob,
      ponderado: valor * (prob / 100),
      diasEnEtapa: dias(entroEtapa),
    };
  });

  // Agregados por etapa (respetando el orden del tenant).
  const porEtapa = etapasTenant
    .filter(e => e.key !== "GANADA" && e.key !== "PERDIDA")
    .map(e => {
      const grupo = items.filter(i => i.etapa === e.key);
      return {
        nombre: e.nombre,
        cantidad: grupo.length,
        valor: grupo.reduce((a, i) => a + i.valor, 0),
        ponderado: grupo.reduce((a, i) => a + i.ponderado, 0),
      };
    })
    .filter(g => g.cantidad > 0);

  const valorTotal = items.reduce((a, i) => a + i.valor, 0);
  const valorPonderado = items.reduce((a, i) => a + i.ponderado, 0);

  // Calientes: mayor valor ponderado. Estancados: más días en la misma etapa.
  const calientes = [...items].sort((a, b) => b.ponderado - a.ponderado).slice(0, 8);
  const estancados = [...items].sort((a, b) => b.diasEnEtapa - a.diasEnEtapa).slice(0, 8);

  // Cierres y pérdidas del mes en curso (vía CambioEtapa, más confiable que fechaCierre).
  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const [ganadasMes, perdidasRecientes] = await Promise.all([
    prisma.cambioEtapa.findMany({
      where: {
        etapaNueva: "GANADA",
        creadoEn: { gte: inicioMes },
        oportunidad: { tenantId, ...ownerFiltro },
      },
      select: { oportunidad: { select: { valor: true, titulo: true } } },
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, eliminadoEn: null, etapa: "PERDIDA", motivoPerdida: { not: null }, ...ownerFiltro },
      select: { titulo: true, valor: true, motivoPerdida: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
      take: 8,
    }),
  ]);
  const valorGanadoMes = ganadasMes.reduce((a, c) => a + Number(c.oportunidad.valor ?? 0), 0);

  // Meta del mes: MetaVendedor si es comercial, si no MetaVenta del tenant (mensual o anual).
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth() + 1;
  let metaMes: number | null = null;
  if (esComercial) {
    const mv = await prisma.metaVendedor.findUnique({
      where: { tenantId_userId_anio_mes: { tenantId, userId: session.user.id, anio, mes } },
      select: { meta: true },
    });
    metaMes = mv ? Number(mv.meta) : null;
  } else {
    const m = await prisma.metaVenta.findUnique({
      where: { tenantId_anio_mes: { tenantId, anio, mes } },
      select: { valorObjetivo: true },
    });
    metaMes = m ? Number(m.valorObjetivo) : null;
  }

  // ── Contexto compacto en texto plano para el modelo ──
  const partes: string[] = [];
  partes.push(`ALCANCE: ${esComercial ? `pipeline personal de ${session.user.name ?? "el vendedor"}` : "pipeline de todo el equipo"}.`);
  partes.push(`Periodo: ${periodo}. Hoy es ${fecha(new Date())}.`);

  partes.push(`\nRESUMEN GENERAL (oportunidades abiertas):`);
  partes.push(`- Total abiertas: ${items.length}`);
  partes.push(`- Valor total en juego: ${fmt(valorTotal)}`);
  partes.push(`- Valor ponderado (valor × probabilidad): ${fmt(valorPonderado)}`);

  partes.push(`\nPOR ETAPA:`);
  partes.push(porEtapa.length
    ? porEtapa.map(g => `- ${g.nombre}: ${g.cantidad} negocios · ${fmt(g.valor)} (ponderado ${fmt(g.ponderado)})`).join("\n")
    : "- (sin oportunidades abiertas)");

  partes.push(`\nNEGOCIOS CALIENTES (mayor valor ponderado):`);
  partes.push(calientes.length
    ? calientes.map(i => `- ${i.titulo} | ${i.empresa} | ${nombreEtapa(i.etapa)} | ${fmt(i.valor)} · ${i.prob}% | ${i.diasEnEtapa}d en etapa`).join("\n")
    : "- (ninguno)");

  partes.push(`\nNEGOCIOS ESTANCADOS (más días en la misma etapa):`);
  partes.push(estancados.length
    ? estancados.map(i => `- ${i.titulo} | ${i.empresa} | ${nombreEtapa(i.etapa)} | ${i.diasEnEtapa}d sin avanzar | ${fmt(i.valor)}`).join("\n")
    : "- (ninguno)");

  partes.push(`\nCERRADO ESTE MES: ${ganadasMes.length} negocios ganados por ${fmt(valorGanadoMes)}.`);
  partes.push(`META DEL MES: ${metaMes != null ? fmt(metaMes) : "(no definida)"}.`);
  if (metaMes != null) {
    const brecha = metaMes - valorGanadoMes;
    partes.push(`- Avance: ${fmt(valorGanadoMes)} de ${fmt(metaMes)}. ${brecha > 0 ? `Falta ${fmt(brecha)}.` : "Meta cumplida."}`);
  }

  partes.push(`\nPÉRDIDAS RECIENTES (motivos):`);
  partes.push(perdidasRecientes.length
    ? perdidasRecientes.map(p => `- ${p.titulo} | ${fmt(p.valor)} | motivo: ${p.motivoPerdida} | ${fecha(p.creadoEn)}`).join("\n")
    : "- (ninguna registrada)");

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1200,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
        // Registra el consumo del mes (best-effort; no rompe la respuesta).
        try {
          await prisma.usoIA.upsert({
            where: { tenantId_periodo: { tenantId, periodo } },
            create: {
              tenantId, periodo, cantidad: 1,
              tokensEntrada: final.usage.input_tokens, tokensSalida: final.usage.output_tokens,
            },
            update: {
              cantidad: { increment: 1 },
              tokensEntrada: { increment: final.usage.input_tokens },
              tokensSalida: { increment: final.usage.output_tokens },
            },
          });
        } catch { /* el conteo no debe tumbar el resumen */ }
      } catch {
        controller.enqueue(encoder.encode("\n\n_No se pudo generar el resumen en este momento. Inténtalo de nuevo._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
