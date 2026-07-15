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

const SYSTEM = `Eres un asistente comercial dentro de un CRM. Recibes los datos de UN cliente (empresa, sus contactos, oportunidades de negocio, actividades y cotizaciones) y produces un resumen breve y accionable para el vendedor que va a atender la cuenta.

Responde SOLO con el resumen en español, sin preámbulos ni frases como "Aquí está" ni comentarios sobre tu proceso. Usa estas tres secciones cortas con estos títulos exactos, cada una de 1 a 3 frases:

**Estado de la relación** — antigüedad aproximada, nivel de actividad, valor en juego.
**Señales** — riesgos (inactividad, cotizaciones sin cerrar, negocios perdidos y por qué) u oportunidades (negocios calientes, recompra).
**Próxima acción** — la acción concreta más recomendable ahora, específica para este cliente.

Sé concreto y apóyate solo en los datos dados. Si faltan datos para una sección, dilo en una frase. No inventes cifras.`;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
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

  const empresa = await prisma.empresa.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      contactos: { where: { eliminadoEn: null } },
      oportunidades: { where: { eliminadoEn: null }, orderBy: { creadoEn: "asc" } },
      actividades: { orderBy: { fecha: "desc" }, take: 15 },
      cotizaciones: { where: { eliminadoEn: null }, include: { items: true } },
    },
  });
  if (!empresa) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // Contexto compacto en texto plano para el modelo.
  const partes: string[] = [];
  partes.push(`CLIENTE: ${empresa.nombre}`);
  if (empresa.sector) partes.push(`Sector: ${empresa.sector}`);
  partes.push(`Registrado el: ${fecha(empresa.creadoEn)}`);
  if (empresa.notas) partes.push(`Notas internas: ${empresa.notas}`);

  partes.push(`\nCONTACTOS (${empresa.contactos.length}):`);
  partes.push(empresa.contactos.length
    ? empresa.contactos.map(c => `- ${c.nombre}${c.cargo ? ` (${c.cargo})` : ""}`).join("\n")
    : "- (ninguno)");

  partes.push(`\nOPORTUNIDADES (${empresa.oportunidades.length}):`);
  partes.push(empresa.oportunidades.length
    ? empresa.oportunidades.map(o =>
        `- ${o.titulo} | etapa: ${o.etapa}${o.valor ? ` | valor: ${fmt(o.valor)}` : ""}` +
        `${o.etapa === "PERDIDA" && o.motivoPerdida ? ` | motivo pérdida: ${o.motivoPerdida}` : ""} | creada: ${fecha(o.creadoEn)}`
      ).join("\n")
    : "- (ninguna)");

  partes.push(`\nACTIVIDADES recientes (${empresa.actividades.length}, más nuevas primero):`);
  partes.push(empresa.actividades.length
    ? empresa.actividades.map(a => `- ${fecha(a.fecha)} | ${a.titulo}${a.completada ? " [hecha]" : " [pendiente]"}`).join("\n")
    : "- (ninguna)");

  partes.push(`\nCOTIZACIONES (${empresa.cotizaciones.length}):`);
  partes.push(empresa.cotizaciones.length
    ? empresa.cotizaciones.map(c => {
        const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
        return `- #${c.numero} | estado: ${c.estado} | total: ${fmt(total)} | ${fecha(c.creadoEn)}`;
      }).join("\n")
    : "- (ninguna)");

  partes.push(`\n(Hoy es ${fecha(new Date())}.)`);

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1024,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await ms.finalMessage();
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
