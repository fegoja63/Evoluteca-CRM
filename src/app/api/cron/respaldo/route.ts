import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

/**
 * Respaldo diario del lado del servidor.
 *
 * Existe porque el respaldo de scripts/backup-db.ts corre en el Programador
 * de tareas de Windows: si el computador está apagado, de viaje o se daña,
 * ese día no hay copia. Aquí no depende de ninguna máquina de nadie.
 *
 * El volcado sale por correo comprimido. Se eligió así porque no añade
 * ninguna cuenta ni servicio nuevo —Resend ya está configurado— y porque
 * deja la copia FUERA de Neon y FUERA de Vercel: si se perdiera el acceso a
 * cualquiera de los dos, el respaldo sigue en el buzón.
 *
 * Lo invoca el cron de Vercel (ver vercel.json), autenticado con CRON_SECRET,
 * todos los días a las 07:00 UTC = 02:00 en Colombia: cuando nadie usa el CRM
 * y lejos del cron de notificaciones, para que no compitan.
 */

// Igual que el cron de notificaciones: volcar todas las tablas tarda más que
// el límite por defecto.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Tope de seguridad del adjunto. Resend admite bastante más, pero un respaldo
 * que crece sin control acabaría rebotando en silencio justo el día que hace
 * falta. Al pasarse, se avisa por correo en vez de fallar callado.
 */
const MAXIMO_ADJUNTO_MB = 15;

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
  const tamanoMb = comprimido.length / (1024 * 1024);

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

  const nombreArchivo = `respaldo-evoluteca-${fecha.slice(0, 10)}.json.gz`;

  const filasTotales = Object.values(resumen).reduce((a, b) => a + b, 0);
  const lineas = Object.entries(resumen)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `<tr><td style="padding:2px 12px 2px 0">${t}</td><td align="right">${n}</td></tr>`)
    .join("");

  // Demasiado grande: se avisa en vez de mandar un adjunto que el correo
  // rechazaría. Un respaldo que falla en silencio es peor que no tenerlo.
  if (tamanoMb > MAXIMO_ADJUNTO_MB) {
    await enviar({
      from: "Evoluteca CRM <noreply@evoluteca.com>",
      to: destino,
      subject: `⚠️ El respaldo diario ya no cabe en un correo (${tamanoMb.toFixed(1)} MB)`,
      html:
        `<p>El respaldo de hoy pesa <b>${tamanoMb.toFixed(1)} MB</b> comprimido, por encima del tope de ${MAXIMO_ADJUNTO_MB} MB.</p>` +
        `<p><b>No se envió el archivo.</b> Hay que mover el respaldo a un almacenamiento de archivos.</p>` +
        `<p>Suele deberse a los adjuntos, que se guardan dentro de la base.</p>`,
    });

    return NextResponse.json(
      { ok: false, motivo: "adjunto demasiado grande", tamanoMb: Number(tamanoMb.toFixed(2)) },
      { status: 500 }
    );
  }

  try {
    await enviar({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    to: destino,
    subject: `Respaldo Evoluteca CRM — ${fecha.slice(0, 10)}`,
    html:
      `<p>Respaldo automático de la base de datos.</p>` +
      `<p><b>${filasTotales}</b> registros en ${Object.keys(resumen).length} tablas · ` +
      `${tamanoMb.toFixed(2)} MB comprimidos</p>` +
      `<table style="font:13px sans-serif;border-collapse:collapse">${lineas}</table>` +
      `<p style="color:#64748b;font-size:12px">Guarda este correo. Para restaurarlo: ` +
      `descomprime el .gz y usa <code>scripts/restaurar-db.ts</code>.</p>`,
    attachments: [{ filename: nombreArchivo, content: comprimido.toString("base64") }],
    });
  } catch (e) {
    // El motivo se devuelve en la respuesta y se deja en los logs de Vercel:
    // la ruta solo la invoca el cron con CRON_SECRET, así que no hay a quién
    // filtrarle nada, y sin el motivo el diagnóstico es adivinar.
    const motivo = e instanceof Error ? e.message : String(e);
    console.error("[respaldo] no se pudo enviar:", motivo);
    return NextResponse.json(
      { ok: false, motivo, destino, tamanoMb: Number(tamanoMb.toFixed(2)) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    fecha,
    destino,
    tablas: Object.keys(resumen).length,
    filas: filasTotales,
    tamanoMb: Number(tamanoMb.toFixed(2)),
  });
}
