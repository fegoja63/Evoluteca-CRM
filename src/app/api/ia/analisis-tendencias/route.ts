import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { filtroOwner } from "@/lib/permisos";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import { seriesTendencias } from "@/lib/tendencias";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));
const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
const signo = (n: number | null) => (n == null ? "s/d" : `${n > 0 ? "+" : ""}${n}%`);

const SYSTEM = `Eres un analista comercial dentro de un CRM. Recibes las series de tiempo reales del negocio (ventas ganadas por mes, pipeline nuevo, tasa de cierre, pipeline abierto por etapa, avance de meta, actividad y motivos de pérdida), con los cambios porcentuales ya calculados. Produces un análisis de tendencias breve y accionable para la reunión de ventas.

Responde SOLO con el análisis en español, sin preámbulos ni frases como "Aquí está" ni comentarios sobre tu proceso. Usa estas cinco secciones con estos títulos exactos, cada una de 1 a 3 frases (usa viñetas con "- " cuando enumeres):

**Tendencia** — qué sube y qué baja en los últimos meses, con las cifras y el cambio en % que se te dan.
**Por qué** — dónde se origina el cambio (qué etapa, segmento, tasa de cierre o pipeline nuevo lo explica).
**Proyección** — a este ritmo, ¿se alcanza la meta del mes y del año? ¿cuánto falta?
**Alertas** — quiebres o riesgos (caída de actividad, pipeline nuevo estancado, motivos de pérdida repetidos).
**Qué hacer** — 2 o 3 acciones concretas y priorizadas para estos datos.

Apóyate SOLO en las cifras dadas; no inventes números ni nombres. Si una serie no tiene suficientes datos, dilo en una frase corta.`;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." },
      { status: 503 },
    );
  }

  const permitido = await permitirYRegistrar(`ia-tendencias:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados análisis seguidos. Espera un momento." }, { status: 429 });
  }

  // Cupo mensual de IA compartido (Tenant.limiteResumenesIA sobre UsoIA).
  const periodo = new Date().toISOString().slice(0, 7);
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { limiteResumenesIA: true },
  });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) {
    return NextResponse.json({ error: "Los análisis con IA no están incluidos en tu plan." }, { status: 403 });
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
  const esComercial = Object.keys(filtroOwner(session.user.rol, session.user.id)).length > 0;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  // Nombres de etapa personalizados por tenant; si el tenant no configuró
  // etapas, se usan las cuatro etapas abiertas por defecto.
  const etapasTenant = await prisma.etapaPipeline.findMany({
    where: { tenantId }, select: { key: true, nombre: true, orden: true }, orderBy: { orden: "asc" },
  });
  const etapasBase = etapasTenant.length ? etapasTenant : [
    { key: "PROSPECTO", nombre: "Prospecto", orden: 1 },
    { key: "CALIFICADO", nombre: "Calificado", orden: 2 },
    { key: "PROPUESTA", nombre: "Propuesta", orden: 3 },
    { key: "NEGOCIACION", nombre: "Negociación", orden: 4 },
  ];

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  const [ops, actUltima, actPrevia] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { tenantId, eliminadoEn: null, ...ownerFiltro },
      select: {
        etapa: true, valor: true, probabilidad: true, creadoEn: true,
        fechaCierre: true, fechaEvento: true, extras: true, motivoPerdida: true,
      },
    }),
    prisma.actividad.count({ where: { tenantId, ...ownerFiltro, creadoEn: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    prisma.actividad.count({ where: { tenantId, ...ownerFiltro, creadoEn: { gte: new Date(Date.now() - 14 * 864e5), lt: new Date(Date.now() - 7 * 864e5) } } }),
  ]);

  // Series de tendencia — misma fuente que las gráficas de Reportes (src/lib/tendencias.ts).
  const { meses, porEtapa, valorAbierto, valorPonderado, ganadoMesActual, ganadoAnio, trimestre } =
    seriesTendencias(ops, etapasBase, ahora);

  // Meta del mes y del año.
  let metaMes: number | null = null, metaAnio: number | null = null;
  if (esComercial) {
    const mv = await prisma.metaVendedor.findUnique({
      where: { tenantId_userId_anio_mes: { tenantId, userId: session.user.id, anio: anioActual, mes: mesActual } },
      select: { meta: true },
    });
    metaMes = mv ? Number(mv.meta) : null;
  } else {
    const [mm, ma] = await Promise.all([
      prisma.metaVenta.findUnique({ where: { tenantId_anio_mes: { tenantId, anio: anioActual, mes: mesActual } }, select: { valorObjetivo: true } }),
      prisma.metaVenta.findFirst({ where: { tenantId, anio: anioActual, mes: null }, select: { valorObjetivo: true } }),
    ]);
    metaMes = mm ? Number(mm.valorObjetivo) : null;
    metaAnio = ma ? Number(ma.valorObjetivo) : null;
  }

  // Motivos de pérdida de los últimos 6 meses (por fecha efectiva).
  const desde6 = new Date(anioActual, mesActual - 1 - 5, 1);
  const motivoMap = new Map<string, number>();
  for (const o of ops) {
    if (o.etapa !== "PERDIDA") continue;
    if (fechaEfectiva(o) < desde6) continue;
    const k = o.motivoPerdida?.trim() || "Sin especificar";
    motivoMap.set(k, (motivoMap.get(k) ?? 0) + 1);
  }
  const motivos = Array.from(motivoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Contexto para el modelo ──
  const partes: string[] = [];
  partes.push(`ALCANCE: ${esComercial ? `datos personales de ${session.user.name ?? "el vendedor"}` : "datos de todo el equipo"}.`);
  partes.push(`Hoy: ${ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}.`);

  partes.push(`\nSERIE MENSUAL (últimos 12 meses):`);
  partes.push(`mes | ganado | #ganadas | #perdidas | tasa cierre | pipeline nuevo`);
  for (const m of meses) {
    partes.push(`${m.label} | ${fmt(m.ganado)} | ${m.ganadas} | ${m.perdidas} | ${m.tasa == null ? "s/d" : m.tasa + "%"} | ${m.creadas}`);
  }

  partes.push(`\nTENDENCIA TRIMESTRAL:`);
  partes.push(`- Ganado últimos 3 meses: ${fmt(trimestre.ganadoUlt3)} vs. 3 meses previos: ${fmt(trimestre.ganadoPrev3)} (${signo(pct(trimestre.ganadoUlt3, trimestre.ganadoPrev3))}).`);
  partes.push(`- Pipeline nuevo (oportunidades creadas) últimos 3 meses: ${trimestre.creadasUlt3} vs. previos: ${trimestre.creadasPrev3} (${signo(pct(trimestre.creadasUlt3, trimestre.creadasPrev3))}).`);

  partes.push(`\nPIPELINE ABIERTO POR ETAPA:`);
  partes.push(porEtapa.length
    ? porEtapa.map(g => `- ${g.nombre}: ${g.cantidad} negocios · ${fmt(g.valor)} (ponderado ${fmt(g.ponderado)})`).join("\n")
    : "- (sin oportunidades abiertas)");
  partes.push(`Total abierto: ${fmt(valorAbierto)} · ponderado por probabilidad: ${fmt(valorPonderado)}.`);

  partes.push(`\nMETA:`);
  partes.push(`- Mes actual: ganado ${fmt(ganadoMesActual)}${metaMes != null ? ` de meta ${fmt(metaMes)} (${metaMes > 0 ? Math.round((ganadoMesActual / metaMes) * 100) : 0}%)` : " (sin meta mensual definida)"}.`);
  if (!esComercial) {
    partes.push(`- Año ${anioActual}: ganado ${fmt(ganadoAnio)}${metaAnio != null ? ` de meta anual ${fmt(metaAnio)} (${metaAnio > 0 ? Math.round((ganadoAnio / metaAnio) * 100) : 0}%)` : " (sin meta anual definida)"}.`);
  }

  partes.push(`\nACTIVIDAD REGISTRADA: últimos 7 días ${actUltima} vs. 7 días previos ${actPrevia} (${signo(pct(actUltima, actPrevia))}).`);

  partes.push(`\nMOTIVOS DE PÉRDIDA (últimos 6 meses):`);
  partes.push(motivos.length ? motivos.map(([m, n]) => `- ${m}: ${n}`).join("\n") : "- (ninguna pérdida registrada)");

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1300,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
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
        } catch { /* el conteo no debe tumbar el análisis */ }
      } catch {
        controller.enqueue(encoder.encode("\n\n_No se pudo generar el análisis en este momento. Inténtalo de nuevo._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
