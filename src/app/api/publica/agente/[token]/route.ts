import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";
import { parseOrError } from "@/lib/validations/helpers";
import { verificarCupoIA, registrarUsoIA } from "@/lib/finanzas/cupo-ia";
import { enviarPush } from "@/lib/push";
import { crearLead } from "@/lib/crear-lead";
import {
  configAgente, mensajesDe, datosDe, mezclarDatos, listoParaLead, notasDelLead, systemAgente,
  mensajeVisitanteSchema, respuestaAgenteSchema, MAX_TURNOS, ORIGEN_CHAT_WEB, type MensajeChat,
} from "@/lib/agente-web";

// Chat con IA de la página web del cliente (ver lib/agente-web.ts). Sin
// sesión: el token del tenant identifica la empresa y el `secreto` de cada
// conversación (guardado en el navegador del visitante) permite retomarla.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_DISPONIBLE = "El asistente no está disponible en este momento. Inténtelo más tarde.";

async function tenantDelToken(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const t = await prisma.tenant.findUnique({
    where: { agenteWebToken: token },
    select: { id: true, nombre: true, activo: true, logoUrl: true, colorMarca: true, agenteWebConfig: true },
  });
  if (!t || !t.activo) return null;
  const config = configAgente(t.agenteWebConfig);
  return config.activo ? { ...t, config } : null;
}

export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const t = await tenantDelToken(token);
  if (!t) return NextResponse.json({ error: "Este chat no está disponible." }, { status: 404 });
  return NextResponse.json({
    nombre: t.config.nombre,
    saludo: t.config.saludo,
    empresa: { nombre: t.nombre, logoUrl: t.logoUrl, colorMarca: t.colorMarca },
  });
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  // Freno al abuso: cada mensaje cuesta IA. Por IP y por empresa.
  const ip = obtenerIp(req);
  const porIp = await permitirYRegistrar(`agente-ip:${ip}`, 20, 10 * 60 * 1000);
  const porChat = await permitirYRegistrar(`agente:${token.slice(0, 32)}`, 200, 60 * 60 * 1000);
  if (!porIp || !porChat) return NextResponse.json({ error: "Demasiados mensajes seguidos. Espere un momento." }, { status: 429 });

  const t = await tenantDelToken(token);
  if (!t) return NextResponse.json({ error: "Este chat no está disponible." }, { status: 404 });
  const tenantId = t.id;

  const { data, error } = parseOrError(mensajeVisitanteSchema, await req.json().catch(() => null));
  if (error) return error;

  const conv = data.conversacionId && data.secreto
    ? await prisma.conversacionAgente.findFirst({ where: { id: data.conversacionId, tenantId, secreto: data.secreto } })
    : null;
  const historial = mensajesDe(conv?.mensajes);
  if (historial.filter(m => m.rol === "visitante").length >= MAX_TURNOS) {
    return NextResponse.json({
      error: "Esta conversación llegó a su límite. Déjenos su correo o celular y un asesor le escribe.",
    }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: NO_DISPONIBLE }, { status: 503 });
  // Una conversación cuenta una acción del cupo: se revisa al empezarla.
  if (!conv && await verificarCupoIA(tenantId)) return NextResponse.json({ error: NO_DISPONIBLE }, { status: 503 });

  const responsable = t.config.responsableId
    ? await prisma.usuario.findFirst({
      where: { id: t.config.responsableId, tenantId, activo: true },
      select: { id: true, tokenAgenda: true },
    })
    : null;
  const catalogo = await prisma.producto.findMany({
    where: { tenantId, activo: true }, orderBy: { nombre: "asc" }, take: 60, select: { nombre: true, descripcion: true },
  });

  const system = systemAgente({
    empresa: t.nombre, nombreAsistente: t.config.nombre, info: t.config.info, catalogo,
    puedeAgendar: !!responsable?.tokenAgenda,
  });
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historial.map(m => ({ role: m.rol === "visitante" ? "user" as const : "assistant" as const, content: m.texto })),
    { role: "user", content: data.mensaje },
  ];

  const client = new Anthropic();
  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      output_config: { effort: "low", format: betaZodOutputFormat(respuestaAgenteSchema) },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error("[publica/agente] error de la API:", e.status, e.message);
      return NextResponse.json({ error: "No pude responder ahora. Inténtelo de nuevo en un momento." }, { status: 502 });
    }
    throw e;
  }
  const r = response.parsed_output;
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !r || !r.respuesta.trim()) {
    return NextResponse.json({ error: "No pude responder ese mensaje. ¿Lo puede escribir de otra forma?" }, { status: 502 });
  }
  await registrarUsoIA(tenantId, response.usage, conv ? 0 : 1);

  const datos = mezclarDatos(datosDe(conv?.datos), r.datos);
  const ahora = new Date().toISOString();
  const mensajes: MensajeChat[] = [
    ...historial,
    { rol: "visitante", texto: data.mensaje, en: ahora },
    { rol: "agente", texto: r.respuesta.trim().slice(0, 2000), en: ahora },
  ];

  // Primera vez que hay nombre y un medio de contacto: se crea el lead.
  let oportunidadId = conv?.oportunidadId ?? null;
  if (!oportunidadId && listoParaLead(datos)) {
    const lead = await crearLead(tenantId, {
      empresaNombre: (datos.empresa || datos.nombre || "Visitante del chat").slice(0, 300),
      contactoNombre: datos.nombre,
      contactoEmail: datos.email,
      contactoTelefono: datos.telefono,
      oportunidadTitulo: `${datos.necesidad ? datos.necesidad.slice(0, 80) : "Consulta"} — ${datos.empresa || datos.nombre}`.slice(0, 300),
      origenLead: ORIGEN_CHAT_WEB,
      notas: notasDelLead(datos, r.calificacion),
    }, responsable ? { creadoBy: responsable.id } : {});
    oportunidadId = lead.oportunidadId;
    await avisarLead(tenantId, lead.creadoBy, lead.oportunidadId, datos.nombre ?? "", datos.necesidad);
  }

  const guardar = { mensajes, datos, calificacion: r.calificacion, oportunidadId };
  const guardada = conv
    ? await prisma.conversacionAgente.update({ where: { id: conv.id, tenantId }, data: guardar, select: { id: true, secreto: true } })
    : await prisma.conversacionAgente.create({
      data: { ...guardar, tenantId, secreto: randomBytes(16).toString("hex"), paginaOrigen: data.pagina || null },
      select: { id: true, secreto: true },
    });

  return NextResponse.json({
    conversacionId: guardada.id,
    secreto: guardada.secreto,
    respuesta: mensajes[mensajes.length - 1].texto,
    agendaUrl: r.ofrecerAgenda && responsable?.tokenAgenda ? `/agendar/${responsable.tokenAgenda}` : null,
  });
}

/** Push al dueño del lead o, si no tiene, a administradores y gerentes. */
async function avisarLead(tenantId: string, duenoId: string | null, oportunidadId: string, nombre: string, necesidad?: string) {
  const destino = duenoId
    ? [duenoId]
    : (await prisma.usuario.findMany({
      where: { tenantId, activo: true, rol: { in: ["ADMINISTRADOR", "GERENTE"] } }, select: { id: true },
    })).map(u => u.id);
  await enviarPush(tenantId, destino, {
    titulo: `💬 Nuevo prospecto del chat web: ${nombre}`,
    cuerpo: necesidad ? necesidad.slice(0, 200) : "Dejó sus datos en el chat de la página.",
    url: `/dashboard/pipeline/${oportunidadId}`,
    etiqueta: `chat-${oportunidadId}`,
  });
}
