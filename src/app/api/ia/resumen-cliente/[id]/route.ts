import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));
const fecha = (d: Date) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const diasDesde = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

const SYSTEM = `Eres un asistente comercial dentro de un CRM. Recibes los datos completos de UN cliente (empresa, contactos, oportunidades abiertas/ganadas/perdidas, actividades y cotizaciones, con varias métricas ya calculadas) y produces un informe breve pero rico y accionable para el vendedor que va a atender la cuenta.

Responde SOLO con el informe en español, sin preámbulos ni frases como "Aquí está" ni comentarios sobre tu proceso. Usa estas seis secciones con estos títulos exactos, cada una de 1 a 3 frases (usa viñetas con "- " cuando enumeres varios elementos):

**Panorama de la cuenta** — antigüedad de la relación, sector, valor ya ganado con este cliente, valor en juego ahora y si hay recurrencia.
**Relación y actividad** — hace cuánto fue la última interacción, nivel de actividad, y tareas pendientes o vencidas que requieren seguimiento.
**Oportunidades y cotizaciones** — qué negocios están abiertos, en qué etapa y con qué probabilidad; y el estado de las cotizaciones (enviadas sin cerrar, aceptadas, vencidas).
**Señales** — riesgos (inactividad, cotizaciones sin respuesta o vencidas, negocios perdidos y su motivo) y oportunidades (recompra, negocios calientes, alta probabilidad).
**Contactos clave** — con quién conviene hablar y quién parece decidir, según los cargos; menciona si faltan datos de contacto.
**Próximas acciones** — 2 o 3 acciones concretas y priorizadas, específicas para este cliente y su situación actual.

Sé concreto y apóyate solo en los datos dados. No inventes cifras ni nombres. Si faltan datos para una sección, dilo en una frase corta.`;

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." },
      { status: 503 },
    );
  }

  // Tope por usuario para que nadie dispare costos: 15 resúmenes por minuto.
  const permitido = await permitirYRegistrar(`ia-resumen:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados resúmenes seguidos. Espera un momento." }, { status: 429 });
  }

  // Cupo mensual de resúmenes según el plan del tenant.
  // null = ilimitado · 0 = desactivado · N>0 = tope mensual.
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
        { error: `Alcanzaste el límite de ${limite} resúmenes con IA este mes. Escríbenos para ampliar tu plan.` },
        { status: 429 },
      );
    }
  }

  const empresa = await prisma.empresa.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      contactos: { where: { eliminadoEn: null } },
      oportunidades: { where: { eliminadoEn: null }, orderBy: { creadoEn: "asc" } },
      actividades: { orderBy: { fecha: "desc" }, take: 25 },
      cotizaciones: { where: { eliminadoEn: null }, include: { items: true } },
    },
  });
  if (!empresa) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // ── Métricas calculadas (para que el modelo no tenga que inferir cifras) ──
  const ops = empresa.oportunidades;
  const abiertas = ops.filter(o => o.etapa !== "GANADA" && o.etapa !== "PERDIDA");
  const ganadas  = ops.filter(o => o.etapa === "GANADA");
  const perdidas = ops.filter(o => o.etapa === "PERDIDA");
  const sumaValor = (arr: typeof ops) => arr.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const valorGanado   = sumaValor(ganadas);
  const valorEnJuego  = sumaValor(abiertas);
  const valorPonderado = abiertas.reduce((a, o) => a + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0);
  const valorPerdido  = sumaValor(perdidas);
  const cerrados = ganadas.length + perdidas.length;
  const tasaConversion = cerrados > 0 ? Math.round((ganadas.length / cerrados) * 100) : null;
  const hayRecurrencia = ops.some(o => o.recurrente === true);

  // Actividad: última interacción pasada, pendientes y vencidas.
  const hoy = Date.now();
  const pasadas = empresa.actividades.filter(a => new Date(a.fecha).getTime() <= hoy);
  const ultimaInteraccion = pasadas[0]; // ya vienen ordenadas por fecha desc
  const pendientes = empresa.actividades.filter(a => a.estado !== "COMPLETADA" && !a.completada);
  const vencidas = pendientes.filter(a => new Date(a.fecha).getTime() < hoy);

  // Cotizaciones: total por ítems, estado y vencimiento.
  const cots = empresa.cotizaciones.map(c => {
    const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
    const vencida = c.estado === "ENVIADA" && c.fechaValidez != null && new Date(c.fechaValidez).getTime() < hoy;
    return { numero: c.numero, estado: c.estado, total, vencida, motivoRechazo: c.motivoRechazo, creadoEn: c.creadoEn, fechaValidez: c.fechaValidez };
  });
  const enviadasSinCerrar = cots.filter(c => c.estado === "ENVIADA");
  const aceptadas = cots.filter(c => c.estado === "ACEPTADA");
  const rechazadas = cots.filter(c => c.estado === "RECHAZADA");
  const decididas = aceptadas.length + rechazadas.length;
  const tasaAceptacion = decididas > 0 ? Math.round((aceptadas.length / decididas) * 100) : null;

  // ── Contexto compacto en texto plano para el modelo ──
  const partes: string[] = [];
  partes.push(`CLIENTE: ${empresa.nombre}`);
  if (empresa.sector) partes.push(`Sector: ${empresa.sector}`);
  const canales = [empresa.telefono && `tel ${empresa.telefono}`, empresa.email, empresa.sitioWeb].filter(Boolean);
  if (canales.length) partes.push(`Contacto empresa: ${canales.join(" · ")}`);
  if (empresa.etiquetas?.length) partes.push(`Etiquetas: ${empresa.etiquetas.join(", ")}`);
  partes.push(`Antigüedad de la relación: ${diasDesde(empresa.creadoEn)} días (registrado el ${fecha(empresa.creadoEn)})`);
  if (empresa.condicionesComerciales) partes.push(`Condiciones comerciales pactadas: ${empresa.condicionesComerciales}`);
  if (empresa.notas) partes.push(`Notas internas: ${empresa.notas}`);

  partes.push(`\nRESUMEN DE VALOR:`);
  partes.push(`- Valor ya ganado con este cliente: ${fmt(valorGanado)} (${ganadas.length} negocios ganados)`);
  partes.push(`- Valor en juego ahora (abiertos): ${fmt(valorEnJuego)} · ponderado por probabilidad: ${fmt(valorPonderado)} (${abiertas.length} abiertos)`);
  partes.push(`- Valor perdido: ${fmt(valorPerdido)} (${perdidas.length} negocios perdidos)`);
  if (tasaConversion != null) partes.push(`- Tasa de conversión histórica: ${tasaConversion}% (${ganadas.length} ganados de ${cerrados} cerrados)`);
  partes.push(`- Recurrencia: ${hayRecurrencia ? "sí, hay negocios marcados como recurrentes" : "no registrada"}`);

  partes.push(`\nCONTACTOS (${empresa.contactos.length}):`);
  partes.push(empresa.contactos.length
    ? empresa.contactos.map(c => {
        const datos = [c.cargo, c.email, c.telefono].filter(Boolean).join(" · ");
        return `- ${c.nombre}${datos ? ` — ${datos}` : " — (sin cargo ni datos de contacto)"}`;
      }).join("\n")
    : "- (ninguno registrado)");

  partes.push(`\nOPORTUNIDADES ABIERTAS (${abiertas.length}):`);
  partes.push(abiertas.length
    ? abiertas.map(o =>
        `- ${o.titulo} | etapa: ${o.etapa} | prob: ${o.probabilidad ?? 50}%` +
        `${o.valor ? ` | valor: ${fmt(o.valor)}` : ""}` +
        `${o.fechaCierre ? ` | cierre estimado: ${fecha(o.fechaCierre)}` : ""}` +
        ` | creada hace ${diasDesde(o.creadoEn)}d`
      ).join("\n")
    : "- (ninguna abierta)");

  if (ganadas.length) {
    partes.push(`\nOPORTUNIDADES GANADAS (${ganadas.length}):`);
    partes.push(ganadas.map(o => `- ${o.titulo}${o.valor ? ` | ${fmt(o.valor)}` : ""} | creada ${fecha(o.creadoEn)}`).join("\n"));
  }
  if (perdidas.length) {
    partes.push(`\nOPORTUNIDADES PERDIDAS (${perdidas.length}):`);
    partes.push(perdidas.map(o => `- ${o.titulo}${o.valor ? ` | ${fmt(o.valor)}` : ""} | motivo: ${o.motivoPerdida ?? "no registrado"}`).join("\n"));
  }

  partes.push(`\nACTIVIDAD:`);
  partes.push(ultimaInteraccion
    ? `- Última interacción: "${ultimaInteraccion.titulo}" (${ultimaInteraccion.tipo}) hace ${diasDesde(ultimaInteraccion.fecha)} días.`
    : "- Sin interacciones pasadas registradas.");
  partes.push(`- Tareas pendientes: ${pendientes.length}${vencidas.length ? ` (${vencidas.length} VENCIDAS)` : ""}.`);
  if (pendientes.length) {
    partes.push(pendientes.slice(0, 8).map(a =>
      `  · ${a.titulo} (${a.tipo}) — ${fecha(a.fecha)}${new Date(a.fecha).getTime() < hoy ? " [vencida]" : ""}`
    ).join("\n"));
  }

  partes.push(`\nCOTIZACIONES (${cots.length}):`);
  if (cots.length) {
    partes.push(`- Enviadas sin cerrar: ${enviadasSinCerrar.length}${enviadasSinCerrar.some(c => c.vencida) ? ` (${enviadasSinCerrar.filter(c => c.vencida).length} con validez vencida)` : ""} · Aceptadas: ${aceptadas.length} · Rechazadas: ${rechazadas.length}`);
    if (tasaAceptacion != null) partes.push(`- Tasa de aceptación: ${tasaAceptacion}%`);
    partes.push(cots.map(c =>
      `  · #${c.numero} | ${c.estado}${c.vencida ? " (VENCIDA)" : ""} | ${fmt(c.total)} | ${fecha(c.creadoEn)}` +
      `${c.motivoRechazo ? ` | motivo rechazo: ${c.motivoRechazo}` : ""}`
    ).join("\n"));
  } else {
    partes.push("- (ninguna)");
  }

  partes.push(`\n(Hoy es ${fecha(new Date())}.)`);

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1500,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
        // Registra el consumo del mes (best-effort; no rompe la respuesta).
        try {
          await prisma.usoIA.upsert({
            where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } },
            create: {
              tenantId: session.user.tenantId, periodo, cantidad: 1,
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
