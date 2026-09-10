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
const dias = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Propuesta/Cotización",
  NEGOCIACION: "Negociación", GANADA: "Ganada", PERDIDA: "Perdida",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const oportunidadId = String(body?.oportunidadId ?? "");
  const objecion = String(body?.objecion ?? "").trim();
  if (!oportunidadId || objecion.length < 2) return NextResponse.json({ error: "Falta la oportunidad o la objeción." }, { status: 400 });
  if (objecion.length > 500) return NextResponse.json({ error: "La objeción es demasiado larga." }, { status: 400 });

  const permitido = await permitirYRegistrar(`ia-objecion:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiadas respuestas seguidas. Espera un momento." }, { status: 429 });

  // Cupo mensual de IA compartido.
  const periodo = new Date().toISOString().slice(0, 7);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteResumenesIA: true } });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) return NextResponse.json({ error: "El coach de objeciones con IA no está incluido en tu plan." }, { status: 403 });
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({ where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } }, select: { cantidad: true } });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json({ error: `Alcanzaste el límite de ${limite} acciones de IA este mes. Escríbenos para ampliar tu plan.` }, { status: 429 });
    }
  }

  const op = await prisma.oportunidad.findFirst({
    where: { id: oportunidadId, tenantId: session.user.tenantId, eliminadoEn: null },
    select: {
      titulo: true, valor: true, etapa: true, probabilidad: true, notas: true, creadoEn: true, fechaCierre: true,
      empresa: { select: { nombre: true, sector: true } },
      contacto: { select: { nombre: true, cargo: true } },
      actividades: { orderBy: { fecha: "desc" }, take: 3, select: { tipo: true, titulo: true, fecha: true } },
    },
  });
  if (!op) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });

  // Respuesta recomendada de la guía del tenant, si la objeción coincide con una
  // (por texto) — para que la IA parta del criterio del propio equipo.
  const guia = await prisma.objecion.findMany({
    where: { tenantId: session.user.tenantId, activa: true },
    select: { objecion: true, respuesta: true },
  });
  const guiaMatch = guia.find(g => g.objecion.trim().toLowerCase() === objecion.toLowerCase());

  const partes: string[] = [];
  partes.push(`OBJECIÓN DEL CLIENTE: "${objecion}"`);
  partes.push(`\nCONTEXTO DEL NEGOCIO:`);
  partes.push(`- Cliente: ${op.empresa?.nombre ?? "sin cliente"}${op.empresa?.sector ? ` (sector ${op.empresa.sector})` : ""}`);
  if (op.contacto?.nombre) partes.push(`- Interlocutor: ${op.contacto.nombre}${op.contacto.cargo ? ` (${op.contacto.cargo})` : ""}`);
  partes.push(`- Negocio: ${op.titulo}`);
  partes.push(`- Etapa actual: ${ETAPA_LABEL[op.etapa] ?? op.etapa}${op.probabilidad != null ? ` · ${op.probabilidad}% probabilidad` : ""}`);
  if (op.valor) partes.push(`- Valor: ${fmt(op.valor)}`);
  if (op.fechaCierre) partes.push(`- Cierre estimado: ${fecha(op.fechaCierre)}`);
  partes.push(`- Antigüedad: creado hace ${dias(op.creadoEn)} días`);
  if (op.actividades.length) partes.push(`- Últimas gestiones: ${op.actividades.map(a => `${a.titulo} (${fecha(a.fecha)})`).join("; ")}`);
  if (op.notas) partes.push(`- Notas del vendedor: ${op.notas.slice(0, 400)}`);
  if (guiaMatch) partes.push(`\nRESPUESTA BASE DE LA GUÍA DEL EQUIPO (adáptala a este cliente, no la copies literal): "${guiaMatch.respuesta}"`);

  const SYSTEM = `Eres un coach de ventas experto en manejo de objeciones. Ayudas al vendedor a responder la objeción de un cliente en una venta consultiva B2B.

Principio rector: no se trata de "ganar" la objeción, sino de entender la PRIORIDAD, el CONTEXTO y el VALOR PERCIBIDO del cliente. Nunca discutas, no seas agresivo, no ofrezcas descuentos por reflejo, no inventes datos ni cifras que no estén en el contexto.

Responde en español, breve y accionable, con este formato exacto:

RESPUESTA SUGERIDA:
<1 a 3 frases que el vendedor puede decir tal cual, en tono natural y cálido, tratando de "usted", terminando idealmente con una pregunta que abra conversación>

POR QUÉ FUNCIONA:
<1 frase explicando la intención detrás>

Nada más: no agregues saludos, títulos extra ni comentarios sobre tu proceso.`;

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 600,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: partes.join("\n") }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
        try {
          await prisma.usoIA.upsert({
            where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } },
            create: { tenantId: session.user.tenantId, periodo, cantidad: 1, tokensEntrada: final.usage.input_tokens, tokensSalida: final.usage.output_tokens },
            update: { cantidad: { increment: 1 }, tokensEntrada: { increment: final.usage.input_tokens }, tokensSalida: { increment: final.usage.output_tokens } },
          });
        } catch { /* el conteo no debe tumbar la respuesta */ }
      } catch {
        controller.enqueue(encoder.encode("\n\n_No se pudo generar la respuesta en este momento. Inténtalo de nuevo._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
