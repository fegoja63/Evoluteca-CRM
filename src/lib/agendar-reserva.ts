/**
 * Reserva desde el enlace público para agendar (ver lib/agendar.ts): crea la
 * reunión en la Agenda del vendedor, liga o crea el contacto, avisa al
 * vendedor (push + correo) y le confirma al cliente por correo con invitación
 * de calendario (.ics).
 */
import { z } from "zod";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/html";
import { formatoFechaHora } from "@/lib/fecha-bogota";
import { escIcs, fmtDt } from "@/lib/calendario-ics";
import { enviarPush } from "@/lib/push";
import { registrarErrorServidor } from "@/lib/registrar-error-servidor";
import { usuarioDelEnlace, horariosDelEnlace, ocupadosDelUsuario } from "@/lib/agendar";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";

export const reservaSchema = z.object({
  inicio: z.string().datetime({ offset: true }),
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: z.string().trim().toLowerCase().email("Correo inválido").max(200),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  empresa: z.string().trim().max(160).optional().or(z.literal("")),
  motivo: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type DatosReserva = z.infer<typeof reservaSchema>;

export type ResultadoReserva =
  | { ok: true; actividadId: string; inicio: Date; fin: Date }
  | { ok: false; status: 404 | 409; error: string };

export async function reservarReunion(token: string, datos: DatosReserva, ahora = new Date()): Promise<ResultadoReserva> {
  const u = await usuarioDelEnlace(token);
  if (!u) return { ok: false, status: 404, error: "Este enlace ya no está disponible." };

  const { config, dias } = await horariosDelEnlace(u, ahora);
  const inicio = new Date(datos.inicio);
  const libre = dias.some(d => d.horarios.some(h => h.getTime() === inicio.getTime()));
  if (!libre) return { ok: false, status: 409, error: "Esa hora ya no está disponible. Elige otra." };
  const fin = new Date(inicio.getTime() + config.duracion * 60_000);

  const resultado = await prisma.$transaction(async tx => {
    // Vuelve a mirar justo antes de crear, por si alguien tomó la hora entretanto.
    const choques = (await ocupadosDelUsuario(u.tenantId, u.id, inicio, fin, config.duracion))
      .filter(o => inicio < o.fin && fin > o.inicio);
    if (choques.length) return null;

    const contacto = await tx.contacto.findFirst({
      where: { tenantId: u.tenantId, eliminadoEn: null, email: { equals: datos.email, mode: "insensitive" } },
      select: { id: true, empresaId: true },
    }) ?? await tx.contacto.create({
      data: {
        tenantId: u.tenantId,
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono || null,
        notas: datos.empresa ? `Empresa (dicha al agendar): ${datos.empresa}` : null,
      },
      select: { id: true, empresaId: true },
    });

    const oportunidad = await tx.oportunidad.findFirst({
      where: { tenantId: u.tenantId, eliminadoEn: null, contactoId: contacto.id, etapa: { notIn: ["GANADA", "PERDIDA"] } },
      orderBy: { creadoEn: "desc" },
      select: { id: true },
    });

    const notas = [
      "Agendada por el cliente desde tu enlace para agendar.",
      `Correo: ${datos.email}`,
      datos.telefono ? `Teléfono: ${datos.telefono}` : null,
      datos.empresa ? `Empresa: ${datos.empresa}` : null,
      datos.motivo ? `\nMotivo: ${datos.motivo}` : null,
    ].filter(Boolean).join("\n");

    return tx.actividad.create({
      data: {
        tenantId: u.tenantId,
        tipo: "REUNION",
        titulo: `Reunión con ${datos.nombre}${datos.empresa ? ` (${datos.empresa})` : ""}`.slice(0, 200),
        fecha: inicio,
        notas,
        creadoBy: u.id,
        responsableId: u.id,
        contactoId: contacto.id,
        empresaId: contacto.empresaId,
        oportunidadId: oportunidad?.id ?? null,
      },
      select: { id: true },
    });
  });
  if (!resultado) return { ok: false, status: 409, error: "Esa hora ya no está disponible. Elige otra." };

  await avisar(u, datos, inicio, fin, resultado.id);
  return { ok: true, actividadId: resultado.id, inicio, fin };
}

type Dueno = NonNullable<Awaited<ReturnType<typeof usuarioDelEnlace>>>;

/** Push y correo al vendedor; correo con invitación al cliente. Nunca lanza. */
async function avisar(u: Dueno, datos: DatosReserva, inicio: Date, fin: Date, actividadId: string) {
  const cuando = formatoFechaHora(inicio, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  try {
    await enviarPush(u.tenantId, [u.id], {
      titulo: `📅 ${datos.nombre} agendó una reunión`,
      cuerpo: `${cuando}${datos.empresa ? ` · ${datos.empresa}` : ""}`,
      url: "/dashboard/agenda",
      etiqueta: `agendada-${actividadId}`,
    });
    if (!process.env.RESEND_API_KEY || !u.tenant.emailsActivos) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const esc = (v: unknown) => escapeHtml(String(v ?? ""));

    await resend.emails.send({
      from: "Evoluteca CRM <noreply@evoluteca.com>",
      to: u.email,
      replyTo: datos.email,
      subject: `📅 ${datos.nombre} agendó una reunión contigo`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <p style="font-size:14px;color:#475569">Hola <strong>${esc(u.nombre)}</strong>, <strong>${esc(datos.nombre)}</strong>${datos.empresa ? ` de <strong>${esc(datos.empresa)}</strong>` : ""} agendó una reunión contigo desde tu enlace:</p>
        <p style="font-size:16px;font-weight:700;margin:12px 0">${esc(cuando)}</p>
        <p style="font-size:13px;color:#64748b;margin:0">${esc(datos.email)}${datos.telefono ? ` · ${esc(datos.telefono)}` : ""}</p>
        ${datos.motivo ? `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;font-size:13px;color:#475569;white-space:pre-wrap">${esc(datos.motivo)}</div>` : ""}
        <a href="${BASE_URL}/dashboard/agenda" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver en mi Agenda →</a>
      </div>`,
    });

    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Evoluteca CRM//Agendar//ES", "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${randomUUID()}@evoluteca-crm`,
      `DTSTAMP:${fmtDt(new Date())}`,
      `DTSTART:${fmtDt(inicio)}`,
      `DTEND:${fmtDt(fin)}`,
      `SUMMARY:${escIcs(`Reunión con ${u.nombre} (${u.tenant.nombre})`)}`,
      `ORGANIZER;CN=${escIcs(u.nombre)}:mailto:${u.email}`,
      `ATTENDEE;CN=${escIcs(datos.nombre)};RSVP=FALSE:mailto:${datos.email}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");

    await resend.emails.send({
      from: `${u.nombre} vía Evoluteca CRM <noreply@evoluteca.com>`,
      to: datos.email,
      replyTo: u.email,
      subject: `Reunión confirmada con ${u.nombre} · ${cuando}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <p style="font-size:14px;color:#475569">Hola <strong>${esc(datos.nombre)}</strong>, tu reunión con <strong>${esc(u.nombre)}</strong> (${esc(u.tenant.nombre)}) quedó agendada:</p>
        <p style="font-size:16px;font-weight:700;margin:12px 0">${esc(cuando)} (hora de Colombia)</p>
        <p style="font-size:13px;color:#64748b">Adjuntamos la invitación para agregarla a tu calendario. Si necesitas cambiarla, responde a este correo.</p>
      </div>`,
      attachments: [{ filename: "reunion.ics", content: Buffer.from(ics).toString("base64"), contentType: "text/calendar; method=REQUEST" }],
    });
  } catch (e) {
    await registrarErrorServidor({
      mensaje: `Aviso de reunión agendada: ${e instanceof Error ? e.message : String(e)}`,
      stack: e instanceof Error ? e.stack : null,
      tipo: "email",
      tenantId: u.tenantId,
    });
  }
}
