import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { extraerToken, conTope, TopeExcedido, TOPES_CORREO } from "@/lib/correo-inbound";
import { escapeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";
// La conexión IMAP + parseo de varios mensajes puede tardar; se pide margen.
export const maxDuration = 120;
// Cada paso que espera a Gmail o a Resend tiene su tope y solo se empieza un
// mensaje dentro del presupuesto del lote (ver TOPES_CORREO): así la función
// siempre responde antes de maxDuration. El 2026-10-29 y el 2026-11-05 Gmail
// respondió lento y Vercel la cortó (504); antes el presupuesto solo se miraba
// entre mensajes y la conexión, la búsqueda o una descarga podían colgarse.

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
    // Si Gmail no responde, mejor fallar rápido y reintentar en la próxima
    // corrida que consumir todo el tiempo de la función.
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
  const inicio = Date.now();

  let procesados = 0;
  let vinculados = 0;
  let reenviados = 0;
  let pendientes = 0;
  const incidencias: string[] = [];

  // Cierre forzado cuando Gmail dejó de responder: no se espera el logout.
  const cerrar = () => { try { client.close(); } catch { /* ya cerrada */ } };
  const marcarLeido = (uid: number) =>
    conTope(client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true }), TOPES_CORREO.marcarLeido, "marcar leído");

  try {
    await conTope(client.connect(), TOPES_CORREO.conexion, "conexión");
  } catch (e) {
    cerrar();
    return NextResponse.json({ error: `No se pudo conectar al buzón de ingest: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  let lock: Awaited<ReturnType<typeof client.getMailboxLock>>;
  let uids: number[];
  try {
    lock = await conTope(client.getMailboxLock("INBOX"), TOPES_CORREO.buzon, "abrir buzón");
    // Solo lo no leído; cada mensaje procesado se marca leído para no repetirlo.
    uids = (await conTope(client.search({ seen: false }, { uid: true }), TOPES_CORREO.buzon, "buscar no leídos")) || [];
  } catch (e) {
    cerrar();
    return NextResponse.json({ error: `El buzón de ingest no respondió: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  let colgado = false;
  try {
    for (const [i, uid] of uids.entries()) {
      if (Date.now() - inicio > TOPES_CORREO.lote) {
        pendientes = uids.length - i; // siguen sin leer: los toma la próxima corrida
        break;
      }
      procesados++;
      try {
        const msg = await conTope(client.fetchOne(String(uid), { source: true }, { uid: true }), TOPES_CORREO.descarga, "descargar mensaje");
        if (!msg || !msg.source) { incidencias.push(`uid ${uid}: sin contenido`); continue; }

        const parsed = await simpleParser(msg.source);
        const token = extraerToken(direccionesDestino(parsed), ingestBase);

        if (!token) {
          incidencias.push(`uid ${uid}: sin token de hilo reconocible`);
          await marcarLeido(uid);
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
          await marcarLeido(uid);
          continue;
        }

        // Evita duplicar si una corrida anterior lo guardó pero no alcanzó a
        // marcarlo leído (p. ej. Vercel la cortó por tiempo): no se guarda ni se
        // reenvía otra vez, solo se marca leído.
        if (parsed.messageId) {
          const yaRegistrado = await prisma.correoRegistrado.findFirst({
            where: { tenantId: original.tenantId, direccion: "RECIBIDO", proveedorMessageId: parsed.messageId },
            select: { id: true },
          });
          if (yaRegistrado) {
            incidencias.push(`uid ${uid}: ya estaba registrado (no se duplicó)`);
            await marcarLeido(uid);
            continue;
          }
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
            const { error: errFwd } = await conTope(resend.emails.send({
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
            }), TOPES_CORREO.aviso, "aviso al vendedor");
            if (errFwd) incidencias.push(`uid ${uid}: reenvío falló — ${errFwd.message}`);
            else reenviados++;
          }
        }

        await marcarLeido(uid);
      } catch (e) {
        // Un mensaje corrupto no debe abortar el lote; se deja sin leer para
        // reintentarlo en la próxima corrida.
        incidencias.push(`uid ${uid}: error — ${e instanceof Error ? e.message : String(e)}`);
        // Si Gmail o Resend dejaron de responder, seguir solo acumula esperas:
        // se corta el lote y el resto queda sin leer para la próxima corrida.
        if (e instanceof TopeExcedido) {
          colgado = true;
          pendientes = uids.length - i - 1;
          break;
        }
      }
    }
  } finally {
    lock.release();
    if (colgado) cerrar();
    else await conTope(client.logout(), TOPES_CORREO.cierre, "cerrar sesión").catch(cerrar);
  }

  return NextResponse.json({ procesados, vinculados, reenviados, pendientes, incidencias });
}
