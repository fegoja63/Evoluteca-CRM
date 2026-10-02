import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

/**
 * Respaldos diarios que llegaron por CORREO (antes del 2026-09-16 el cron de
 * respaldo los enviaba como adjunto .json.gz sin cifrar; después pasaron a
 * Vercel Blob cifrados). Se leen por IMAP con las credenciales que el servidor
 * ya tiene, para no depender de que alguien entre a Gmail y descargue nada.
 *
 * Solo lectura: no marca, mueve ni borra mensajes.
 */

const ASUNTO = "Respaldo Evoluteca CRM";

type Cuenta = { user: string; pass: string };

/** Buzones con credencial disponible en el servidor (sin repetir). */
function cuentas(): Cuenta[] {
  const posibles: Array<[string | undefined, string | undefined]> = [
    [process.env.GMAIL_USER, process.env.GMAIL_APP_PASSWORD],
    [process.env.INGEST_EMAIL_BASE, process.env.INGEST_IMAP_PASSWORD],
  ];
  const vistas = new Set<string>();
  const out: Cuenta[] = [];
  for (const [user, pass] of posibles) {
    if (!user || !pass || vistas.has(user.toLowerCase())) continue;
    vistas.add(user.toLowerCase());
    out.push({ user, pass: pass.replace(/\s+/g, "") });
  }
  return out;
}

async function conBuzon<T>(cuenta: Cuenta, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: "imap.gmail.com", port: 993, secure: true,
    auth: { user: cuenta.user, pass: cuenta.pass }, logger: false,
  });
  await client.connect();
  try {
    // "Todos" / "All Mail": el respaldo puede estar archivado, no solo en INBOX.
    const buzones = await client.list();
    const todos = buzones.find(b => b.specialUse === "\\All")?.path ?? "INBOX";
    const lock = await client.getMailboxLock(todos, { readOnly: true });
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export type RespaldoEnCorreo = { cuenta: string; uid: number; asunto: string; recibido: string };

/** Lista los correos de respaldo desde una fecha, en todas las cuentas disponibles. */
export async function listarRespaldosCorreo(desde: Date): Promise<{ respaldos: RespaldoEnCorreo[]; errores: string[]; cuentas: string[] }> {
  const respaldos: RespaldoEnCorreo[] = [];
  const errores: string[] = [];
  const cs = cuentas();
  for (const cuenta of cs) {
    try {
      await conBuzon(cuenta, async (c) => {
        const uids = (await c.search({ subject: ASUNTO, since: desde }, { uid: true })) || [];
        if (!uids.length) return;
        for await (const m of c.fetch(uids, { envelope: true }, { uid: true })) {
          respaldos.push({
            cuenta: cuenta.user,
            uid: m.uid,
            asunto: m.envelope?.subject ?? "",
            recibido: m.envelope?.date ? new Date(m.envelope.date).toISOString() : "",
          });
        }
      });
    } catch (e) {
      errores.push(`${cuenta.user}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  respaldos.sort((a, b) => b.recibido.localeCompare(a.recibido));
  return { respaldos, errores, cuentas: cs.map(c => c.user) };
}

/** Descarga el adjunto .json.gz del respaldo de ese día (AAAA-MM-DD). */
export async function descargarRespaldoCorreo(fecha: string): Promise<{ gz: Buffer; cuenta: string; asunto: string } | null> {
  const desde = new Date(`${fecha}T00:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - 1);
  const { respaldos } = await listarRespaldosCorreo(desde);
  const elegido = respaldos.find(r => r.asunto.includes(fecha));
  if (!elegido) return null;

  const cuenta = cuentas().find(c => c.user === elegido.cuenta)!;
  return conBuzon(cuenta, async (c) => {
    const msg = await c.fetchOne(String(elegido.uid), { source: true }, { uid: true });
    if (!msg || !msg.source) return null;
    const parsed = await simpleParser(msg.source);
    const adjunto = parsed.attachments.find(a => a.filename?.endsWith(".json.gz"));
    return adjunto ? { gz: adjunto.content, cuenta: elegido.cuenta, asunto: elegido.asunto } : null;
  });
}
