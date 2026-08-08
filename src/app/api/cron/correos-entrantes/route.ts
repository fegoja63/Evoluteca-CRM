import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { extraerToken } from "@/lib/correo-inbound";
import { escapeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";
// La conexión IMAP + parseo de varios mensajes puede tardar; se pide margen.
export const maxDuration = 120;

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";
const MAX_CUERPO = 50_000; // evita filas gigantes ante correos con historial largo

// Reúne todas las direcciones destino donde podría venir el token: To, Cc y la
// cabecera Delivered-To que agregan los servidores (Gmail preserva el sub-tag).
function direccionesDestino(parsed: ParsedMail): string[] {
  const dirs: string[] = [];
  const push = (campo: ParsedMail["to"]) => {
    if (!campo) return;
    const lista = Array.isArray(campo) ? campo : [campo];
    for (const c of lista) for (const v of c.value) if (v.address) dirs.push(v.address);
  };
  push(parsed.to);
  push(parsed.cc);
  const deliveredTo = parsed.headers.get("delivered-to");
  if (typeof deliveredTo === "string") dirs.push(deliveredTo);
  return dirs;
}

export async function GET(req: Request) {
  // Falla cerrado: sin CRON_SECRET, una solicitud sin credencial no debe pasar.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ingestBase = process.env.INGEST_EMAIL_BASE;
  const imapPass = process.env.INGEST_IMAP_PASSWORD;
  if (!ingestBase || !imapPass) {
    return NextResponse.json({ error: "Buzón de ingest no configurado (faltan INGEST_EMAIL_BASE / INGEST_IMAP_PASSWORD)." }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const client = new ImapFlow({
    host: process.env.INGEST_IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.INGEST_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: ingestBase, pass: imapPass },
    logger: false,
  });

  let procesados = 0;
  let vinculados = 0;
  let reenviados = 0;
  const incidencias: string[] = [];

  try {
    await client.connect();
  } catch (e) {
    return NextResponse.json({ error: `No se pudo conectar al buzón de ingest: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const lock = await client.getMailboxLock("INBOX");
  try {
    // Solo lo no leído; cada mensaje procesado se marca leído para no repetirlo.
    const uids = (await client.search({ seen: false }, { uid: true })) || [];

    for (const uid of uids) {
      procesados++;
      try {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) { incidencias.push(`uid ${uid}: sin contenido`); continue; }

        const parsed = await simpleParser(msg.source);
        const token = extraerToken(direccionesDestino(parsed), ingestBase);

        if (!token) {
          incidencias.push(`uid ${uid}: sin token de hilo reconocible`);
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          continue;
        }

        // El correo ENVIADO original ancla el tenant y la ficha; la respuesta
        // hereda ese aislamiento (nunca se cuelga de otro tenant).
        const original = await prisma.correoRegistrado.findUnique({
          where: { tokenHilo: token },
          select: { tenantId: true, empresaId: true, contactoId: true, oportunidadId: true, asunto: true, creadoBy: true },
        });
        if (!original) {
          incidencias.push(`uid ${uid}: token ${token} sin correo original`);
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          continue;
        }

        const de = parsed.from?.value[0]?.address ?? "desconocido";
        const asunto = parsed.subject?.trim() || `Re: ${original.asunto}`;
        const htmlPlano = typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "";
        const cuerpo = (parsed.text || htmlPlano || "(sin contenido)").slice(0, MAX_CUERPO);

        await prisma.correoRegistrado.create({
          data: {
            direccion: "RECIBIDO",
            de,
            para: ingestBase,
            asunto,
            cuerpo,
            proveedorMessageId: parsed.messageId ?? null,
            tokenHilo: null, // el token vive en el ENVIADO original; aquí sería duplicado
            creadoBy: null,
            tenantId: original.tenantId,
            empresaId: original.empresaId,
            contactoId: original.contactoId,
            oportunidadId: original.oportunidadId,
          },
        });
        vinculados++;

        // Aviso al vendedor que originó el hilo, con enlace a la ficha.
        if (original.creadoBy) {
          const vendedor = await prisma.usuario.findUnique({ where: { id: original.creadoBy }, select: { email: true } });
          if (vendedor?.email) {
            const enlace = original.oportunidadId
              ? `${BASE_URL}/dashboard/pipeline/${original.oportunidadId}`
              : original.contactoId
                ? `${BASE_URL}/dashboard/contactos/${original.contactoId}`
                : `${BASE_URL}/dashboard`;
            const { error: errFwd } = await resend.emails.send({
              from: "Evoluteca CRM <noreply@evoluteca.com>",
              replyTo: de,
              to: vendedor.email,
              subject: `📨 Respuesta de ${de}: ${asunto}`,
              html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
                <p style="font-size:14px;color:#64748b">Nueva respuesta registrada en tu CRM, de <strong>${escapeHtml(de)}</strong>:</p>
                <div style="border-left:3px solid #e2e8f0;padding:8px 14px;margin:12px 0;white-space:pre-wrap;font-size:14px;color:#334155">${escapeHtml(cuerpo.slice(0, 4000))}</div>
                <a href="${enlace}" style="display:inline-block;background:#2563eb;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Abrir en el CRM →</a>
                <p style="margin-top:14px;font-size:11px;color:#94a3b8">Puedes responder directamente a este correo: llegará a ${escapeHtml(de)}.</p>
              </div>`,
              text: `Nueva respuesta de ${de}:\n\n${cuerpo}\n\nAbrir en el CRM: ${enlace}`,
            });
            if (errFwd) incidencias.push(`uid ${uid}: reenvío falló — ${errFwd.message}`);
            else reenviados++;
          }
        }

        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      } catch (e) {
        // Un mensaje corrupto no debe abortar el lote; se deja sin leer para
        // reintentarlo en la próxima corrida.
        incidencias.push(`uid ${uid}: error — ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }

  return NextResponse.json({ procesados, vinculados, reenviados, incidencias });
}
