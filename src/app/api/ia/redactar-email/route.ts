import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { numeroCotizacion } from "@/lib/cotizaciones";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));
const fecha = (d: Date) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const dias = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

const TIPOS = {
  ENVIO: "Correo para ENVIAR la cotización al cliente por primera vez. Preséntala con calidez, resalta brevemente el valor de la propuesta e invita a revisarla y a agendar una conversación o responder dudas.",
  SEGUIMIENTO: "Correo de SEGUIMIENTO: el cliente ya recibió la cotización pero no ha respondido. Retoma la conversación de forma amable y sin presionar, ofrece resolver dudas y propón un siguiente paso simple.",
  CIERRE: "Correo de CIERRE/NEGOCIACIÓN para impulsar la decisión. Reitera el valor, menciona con tacto la vigencia de la propuesta si aplica y propón un siguiente paso concreto (firma, reunión de cierre). Genera urgencia suave, nunca agresiva.",
} as const;
type Tipo = keyof typeof TIPOS;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const cotizacionId = String(body?.cotizacionId ?? "");
  const tipo = String(body?.tipo ?? "") as Tipo;
  if (!cotizacionId || !TIPOS[tipo]) return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });

  const permitido = await permitirYRegistrar(`ia-email:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados correos seguidos. Espera un momento." }, { status: 429 });

  // Cupo mensual de IA compartido.
  const periodo = new Date().toISOString().slice(0, 7);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteResumenesIA: true } });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) return NextResponse.json({ error: "El redactor con IA no está incluido en tu plan." }, { status: 403 });
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({ where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } }, select: { cantidad: true } });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json({ error: `Alcanzaste el límite de ${limite} acciones de IA este mes. Escríbenos para ampliar tu plan.` }, { status: 429 });
    }
  }

  const cot = await prisma.cotizacion.findFirst({
    where: { id: cotizacionId, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      empresa: { select: { nombre: true, actividades: { where: { completada: false }, orderBy: { fecha: "desc" }, take: 1, select: { titulo: true, fecha: true } } } },
      contacto: { select: { nombre: true, cargo: true } },
      items: true,
    },
  });
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

  const subtotal = cot.items.reduce((a, it) => a + it.cantidad * Number(it.precioUnit), 0);
  const cliente = cot.empresa?.nombre ?? "el cliente";
  const contacto = cot.contacto?.nombre ?? "";

  const partes: string[] = [];
  partes.push(`TIPO DE CORREO: ${TIPOS[tipo]}`);
  partes.push(`\nDATOS DE LA COTIZACIÓN:`);
  partes.push(`- Número: ${numeroCotizacion(cot)}`);
  partes.push(`- Cliente: ${cliente}`);
  if (contacto) partes.push(`- Destinatario: ${contacto}${cot.contacto?.cargo ? ` (${cot.contacto.cargo})` : ""}`);
  partes.push(`- Estado actual: ${cot.estado}`);
  partes.push(`- Creada: ${fecha(cot.creadoEn)} (hace ${dias(cot.creadoEn)} días)`);
  if (cot.fechaValidez) partes.push(`- Válida hasta: ${fecha(cot.fechaValidez)}`);
  if (subtotal > 0) partes.push(`- Valor de la propuesta (ítems): ${fmt(subtotal)}`);
  if (cot.items.length) partes.push(`- Incluye: ${cot.items.slice(0, 6).map(i => i.descripcion).join("; ")}`);
  if (cot.condicionesComerciales) partes.push(`- Condiciones: ${cot.condicionesComerciales}`);
  const ultAct = cot.empresa?.actividades?.[0];
  if (tipo === "SEGUIMIENTO" && ultAct) partes.push(`- Última gestión pendiente con el cliente: "${ultAct.titulo}" (${fecha(ultAct.fecha)})`);
  partes.push(`\nFIRMA: ${session.user.name ?? "el equipo comercial"}.`);

  const SYSTEM = `Eres un asistente que redacta correos comerciales para el vendedor de un CRM. Escribes en español, con un tono profesional y cálido, natural (no robótico), claro y breve (máximo ~150 palabras el cuerpo). Tratas al destinatario de "usted".

Devuelve SOLO el correo, con este formato exacto y nada más:
Asunto: <asunto corto y concreto>

<cuerpo del correo, con saludo, 1-2 párrafos y despedida, firmado con el nombre dado>

No inventes datos, cifras ni compromisos que no estén en la información dada. No incluyas explicaciones sobre tu proceso ni comentarios. Si falta el nombre del destinatario, usa un saludo general cordial.`;

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 800,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
        try {
          await prisma.usoIA.upsert({
            where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } },
            create: { tenantId: session.user.tenantId, periodo, cantidad: 1, tokensEntrada: final.usage.input_tokens, tokensSalida: final.usage.output_tokens },
            update: { cantidad: { increment: 1 }, tokensEntrada: { increment: final.usage.input_tokens }, tokensSalida: { increment: final.usage.output_tokens } },
          });
        } catch { /* el conteo no debe tumbar el correo */ }
      } catch {
        controller.enqueue(encoder.encode("\n\n_No se pudo redactar el correo en este momento. Inténtalo de nuevo._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
