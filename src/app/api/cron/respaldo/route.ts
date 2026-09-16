import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { put, list, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { cifrar, hayClaveRespaldo } from "@/lib/respaldo-cifrado";

/**
 * Respaldo diario del lado del servidor.
 *
 * Existe porque el respaldo de scripts/backup-db.ts corre en el Programador
 * de tareas de Windows: si el computador está apagado, de viaje o se daña,
 * ese día no hay copia. Aquí no depende de ninguna máquina de nadie.
 *
 * El volcado se comprime, se CIFRA (AES-256-GCM) y se sube a Vercel Blob como
 * blob PRIVADO; el correo lleva un ENLACE FIRMADO temporal (además de las
 * instrucciones para bajarlo del panel de Vercel). Antes iba como adjunto de
 * correo, pero el adjunto tiene un tope (~15 MB) y el día que la base lo
 * cruzaba —sobre todo por los archivos que se guardan dentro de ella— el
 * respaldo dejaba de salir. Blob no tiene ese tope y escala solo. Doble
 * candado: el store es privado (el enlace público directo no sirve) y encima
 * el contenido va cifrado (sin RESPALDO_CLAVE es ilegible). La copia queda
 * FUERA de Neon.
 *
 * Lo invoca el cron de Vercel (ver vercel.json), autenticado con CRON_SECRET,
 * todos los días a las 07:00 UTC = 02:00 en Colombia: cuando nadie usa el CRM
 * y lejos del cron de notificaciones, para que no compitan.
 */

// Igual que el cron de notificaciones: volcar todas las tablas tarda más que
// el límite por defecto.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Se conservan los respaldos de los últimos RETENCION_DIAS en Blob; los más
// viejos se borran en cada corrida para no llenar el almacenamiento.
const RETENCION_DIAS = Number(process.env.RESPALDO_RETENCION_DIAS ?? 30);
// Cuánto vale el enlace firmado del correo. Pasado ese tiempo, la copia SIGUE
// en Blob (se baja desde el panel de Vercel); solo caduca el enlace directo.
const ENLACE_VALIDO_DIAS = 7;
const PREFIJO = "respaldos/";

/** Igual que en el script: se serializa lo que la lectura cruda devuelve como objeto. */
function serializar(_clave: string, valor: unknown) {
  if (typeof valor === "bigint") return valor.toString();
  if (valor && typeof valor === "object" && typeof (valor as { toFixed?: unknown }).toFixed === "function") {
    return (valor as { toFixed: () => string }).toFixed();
  }
  if (Buffer.isBuffer(valor)) return valor.toString("base64");
  return valor;
}

export async function GET(req: Request) {
  // Falla cerrado: sin CRON_SECRET no se atiende a nadie, igual que el cron
  // de notificaciones.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const destino = process.env.RESPALDO_EMAIL || process.env.GMAIL_USER;
  if (!process.env.RESEND_API_KEY || !destino) {
    return NextResponse.json(
      { error: "Falta RESEND_API_KEY o RESPALDO_EMAIL/GMAIL_USER" },
      { status: 503 }
    );
  }

  // Falla cerrado: sin dónde subir la copia o sin con qué cifrarla, no se hace
  // un respaldo a medias. Al conectar un Blob store, Vercel deja BLOB_STORE_ID
  // (stores privados nuevos, que autentican por OIDC) o BLOB_READ_WRITE_TOKEN
  // (modelo clásico); el SDK usa el que haya. RESPALDO_CLAVE la genera el
  // equipo (openssl rand -hex 32).
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "Falta conectar un Blob store en Vercel (BLOB_STORE_ID o BLOB_READ_WRITE_TOKEN)" }, { status: 503 });
  }
  if (!hayClaveRespaldo()) {
    return NextResponse.json({ error: "Falta RESPALDO_CLAVE válida (32 bytes en hex: openssl rand -hex 32)" }, { status: 503 });
  }

  // Se leen las tablas que EXISTEN, no las que declara el esquema: si el
  // código va por delante de la base (una migración sin desplegar), el
  // respaldo tiene que salir igual. Ese fallo ya ocurrió una vez.
  const tablas = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;

  const volcado: Record<string, unknown[]> = {};
  const resumen: Record<string, number> = {};

  for (const { table_name } of tablas) {
    const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${table_name}"`
    );
    volcado[table_name] = filas;
    resumen[table_name] = filas.length;
  }

  const fecha = new Date().toISOString();
  const contenido = JSON.stringify({ fecha, tablas: resumen, datos: volcado }, serializar);
  const comprimido = gzipSync(Buffer.from(contenido, "utf8"));
  // Se cifra el .gz antes de que salga de este proceso: lo que se sube a Blob
  // (URL pública) ya va ilegible sin RESPALDO_CLAVE.
  const cifrado = cifrar(comprimido);
  const tamanoMb = cifrado.length / (1024 * 1024);
  // Nota: se cifra siempre, aunque el store ya sea privado, como segundo
  // candado (defensa en profundidad).

  const resend = new Resend(process.env.RESEND_API_KEY);

  /**
   * Envía y COMPRUEBA el resultado.
   *
   * El SDK de Resend no lanza excepción cuando el envío falla: devuelve un
   * objeto con `error` dentro. La primera versión de esta ruta hacía
   * `await resend.emails.send(...)` sin mirarlo, así que respondía 200 aunque
   * el correo no hubiera salido — justo el fallo silencioso que este cron
   * existe para evitar. El cron de notificaciones ya lo hacía bien.
   */
  async function enviar(params: Parameters<typeof resend.emails.send>[0]) {
    const { error } = await resend.emails.send(params);
    if (error) throw new Error(`Resend rechazó el envío: ${error.name} — ${error.message}`);
  }

  const nombreArchivo = `respaldo-evoluteca-${fecha.slice(0, 10)}.json.gz.enc`;

  const filasTotales = Object.values(resumen).reduce((a, b) => a + b, 0);
  const lineas = Object.entries(resumen)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `<tr><td style="padding:2px 12px 2px 0">${t}</td><td align="right">${n}</td></tr>`)
    .join("");

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Se sube la copia cifrada a Blob como PRIVADA. addRandomSuffix: cada día es
  // un archivo distinto (no se pisan). El prefijo agrupa los respaldos.
  let pathnameRespaldo: string;
  try {
    const blob = await put(`${PREFIJO}${nombreArchivo}`, cifrado, {
      access: "private",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
      token,
    });
    pathnameRespaldo = blob.pathname;
  } catch (e) {
    // Si la subida falla, se avisa por correo en vez de fallar callado: un
    // respaldo que no salió y nadie lo supo es el peor de los casos.
    const motivo = e instanceof Error ? e.message : String(e);
    console.error("[respaldo] no se pudo subir a Blob:", motivo);
    try {
      await enviar({
        from: "Evoluteca CRM <noreply@evoluteca.com>",
        to: destino,
        subject: "⚠️ El respaldo diario NO se pudo guardar",
        html:
          `<p>El respaldo de hoy no se pudo subir al almacenamiento (Blob).</p>` +
          `<p>Motivo técnico: <code>${motivo}</code></p>` +
          `<p>Revisa que el Blob store siga conectado en Vercel. Mientras tanto, corre el respaldo manual: <code>node --env-file=.env scripts/backup-db.ts</code>.</p>`,
      });
    } catch { /* si ni el aviso sale, queda en los logs de Vercel */ }
    return NextResponse.json({ ok: false, motivo, tamanoMb: Number(tamanoMb.toFixed(2)) }, { status: 500 });
  }

  // Purga de respaldos viejos (no fatal): mantener solo los últimos
  // RETENCION_DIAS para no llenar el almacenamiento. Si falla, el respaldo de
  // hoy ya está subido, así que solo se registra.
  try {
    const limite = Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000;
    const { blobs } = await list({ prefix: PREFIJO, token });
    const viejos = blobs.filter(b => new Date(b.uploadedAt).getTime() < limite).map(b => b.url);
    if (viejos.length) await del(viejos, { token });
  } catch (e) {
    console.error("[respaldo] no se pudieron purgar respaldos viejos:", e instanceof Error ? e.message : String(e));
  }

  // Enlace firmado temporal para el correo (no fatal): el store es privado, así
  // que la URL directa no sirve. Si esto falla, la copia SIGUE en Blob y el
  // correo explica cómo bajarla del panel de Vercel.
  let enlace: string | null = null;
  try {
    const validUntil = Date.now() + ENLACE_VALIDO_DIAS * 24 * 60 * 60 * 1000;
    const firma = await issueSignedToken({ pathname: pathnameRespaldo, operations: ["get"], validUntil, token });
    const { presignedUrl } = await presignUrl(
      { clientSigningToken: firma.clientSigningToken, delegationToken: firma.delegationToken },
      { operation: "get", pathname: pathnameRespaldo, access: "private", validUntil: firma.validUntil },
    );
    enlace = presignedUrl;
  } catch (e) {
    console.error("[respaldo] no se pudo firmar el enlace de descarga:", e instanceof Error ? e.message : String(e));
  }

  const bloqueDescarga = enlace
    ? `<p><a href="${enlace}">Descargar respaldo (${nombreArchivo})</a> — enlace válido ${ENLACE_VALIDO_DIAS} días.</p>`
    : `<p>Descárgalo desde Vercel → proyecto <b>evoluteca-crm</b> → Storage → tu Blob → Manage Blobs → <code>${pathnameRespaldo}</code>.</p>`;

  try {
    await enviar({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    to: destino,
    subject: `Respaldo Evoluteca CRM — ${fecha.slice(0, 10)}`,
    html:
      `<p>Respaldo automático de la base de datos, guardado en el almacenamiento seguro (privado y cifrado).</p>` +
      `<p><b>${filasTotales}</b> registros en ${Object.keys(resumen).length} tablas · ` +
      `${tamanoMb.toFixed(2)} MB (cifrado)</p>` +
      bloqueDescarga +
      `<table style="font:13px sans-serif;border-collapse:collapse">${lineas}</table>` +
      `<p style="color:#64748b;font-size:12px">El archivo está CIFRADO: para leerlo hace falta la clave ` +
      `<code>RESPALDO_CLAVE</code>. Para restaurarlo: descárgalo, ` +
      `<code>node --env-file=.env scripts/descifrar-respaldo.ts &lt;archivo.enc&gt; &lt;carpeta&gt;</code> ` +
      `y luego <code>scripts/restaurar-db.ts &lt;carpeta&gt;</code>.</p>`,
    });
  } catch (e) {
    // La copia YA quedó en Blob; falló solo el aviso. Se reporta pero el
    // respaldo existe. El motivo se devuelve y queda en los logs de Vercel.
    const motivo = e instanceof Error ? e.message : String(e);
    console.error("[respaldo] copia subida pero el aviso falló:", motivo);
    return NextResponse.json(
      { ok: true, avisoFallo: motivo, pathname: pathnameRespaldo, destino, tamanoMb: Number(tamanoMb.toFixed(2)) },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    fecha,
    destino,
    pathname: pathnameRespaldo,
    tablas: Object.keys(resumen).length,
    filas: filasTotales,
    tamanoMb: Number(tamanoMb.toFixed(2)),
  });
}
