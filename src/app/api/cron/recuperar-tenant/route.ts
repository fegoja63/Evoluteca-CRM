import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { descifrar, hayClaveRespaldo } from "@/lib/respaldo-cifrado";
import { recuperarTenant, fuenteVolcado } from "@/lib/recuperar-tenant";
import { registrarAuditoria } from "@/lib/auditoria";
import { listarRespaldosCorreo, descargarRespaldoCorreo } from "@/lib/respaldo-correo";

/**
 * Recupera los datos comerciales de UN tenant desde un respaldo diario de
 * Vercel Blob, del lado del servidor.
 *
 * Existe porque los respaldos van cifrados con RESPALDO_CLAVE, una variable
 * "Sensitive" de Vercel que no se puede volver a leer desde el panel: el único
 * lugar donde la clave está disponible es aquí, en el servidor. Así el
 * respaldo se descifra en memoria y ni la clave ni los datos salen de Vercel —
 * la respuesta trae solo conteos.
 *
 * La recuperación en sí es src/lib/recuperar-tenant.ts (probada): SOLO agrega
 * lo que falta, nunca borra ni modifica.
 *
 * Se invoca desde el GitHub Action "Recuperar tenant" con CRON_SECRET:
 *   ?tenant=<slug>&listar=1                      lista los respaldos disponibles
 *   ?tenant=<slug>&fecha=AAAA-MM-DD               simulación con el respaldo de ese día
 *   ?tenant=<slug>&fecha=…&aplicar=1&confirmar=<slug>   aplica de verdad
 *
 * Con origen=correo usa en cambio los respaldos que llegaban por CORREO (adjunto
 * .json.gz sin cifrar, hasta el 2026-09-16), leídos por IMAP con las
 * credenciales de Gmail que ya tiene el servidor (src/lib/respaldo-correo.ts).
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PREFIJO = "respaldos/";

export async function GET(req: Request) {
  // Falla cerrado, como los demás crons.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const desdeCorreo = searchParams.get("origen") === "correo";
  if (!desdeCorreo) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      return NextResponse.json({ error: "Falta conectar el Blob store (BLOB_STORE_ID o BLOB_READ_WRITE_TOKEN)" }, { status: 503 });
    }
    if (!hayClaveRespaldo()) {
      return NextResponse.json({ error: "Falta RESPALDO_CLAVE válida" }, { status: 503 });
    }
  }

  const slug = searchParams.get("tenant") ?? "";
  const tenant = slug ? await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true } }) : null;
  if (!tenant) return NextResponse.json({ error: `Tenant '${slug}' no encontrado` }, { status: 404 });

  const listar = searchParams.get("listar") === "1";
  const fecha = searchParams.get("fecha") ?? "";
  if (!listar && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Falta fecha=AAAA-MM-DD (usa listar=1 para ver las disponibles)" }, { status: 400 });
  }
  const aplicar = searchParams.get("aplicar") === "1";
  if (aplicar && searchParams.get("confirmar") !== slug) {
    return NextResponse.json({ error: `Para aplicar, agrega confirmar=${slug}` }, { status: 400 });
  }

  let volcado: { fecha: string; datos: Record<string, Record<string, unknown>[]> };
  let origenDescrito: string;

  if (desdeCorreo) {
    if (listar) {
      const r = await listarRespaldosCorreo(new Date("2026-08-01T00:00:00Z"));
      return NextResponse.json({ tenant: { slug, nombre: tenant.nombre }, origen: "correo", ...r });
    }
    let encontrado: Awaited<ReturnType<typeof descargarRespaldoCorreo>>;
    try {
      encontrado = await descargarRespaldoCorreo(fecha);
    } catch (e) {
      return NextResponse.json({ error: `No se pudo leer el correo: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
    }
    if (!encontrado) return NextResponse.json({ error: `No hay correo de respaldo del ${fecha} con adjunto .json.gz` }, { status: 404 });
    volcado = JSON.parse(gunzipSync(encontrado.gz).toString("utf8"));
    origenDescrito = `correo ${encontrado.cuenta}: ${encontrado.asunto}`;
  } else {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const { blobs } = await list({ prefix: PREFIJO, token, limit: 1000 });
    const respaldos = blobs
      .map(b => ({ url: b.url, pathname: b.pathname, subido: new Date(b.uploadedAt).toISOString(), tamanoMb: Number((b.size / 1048576).toFixed(2)) }))
      .sort((a, b) => b.subido.localeCompare(a.subido));

    if (listar) {
      return NextResponse.json({
        tenant: { slug, nombre: tenant.nombre },
        respaldos: respaldos.map(({ pathname, subido, tamanoMb }) => ({ pathname, subido, tamanoMb })),
      });
    }
    const elegido = respaldos.find(r => r.pathname.includes(`respaldo-evoluteca-${fecha}`));
    if (!elegido) {
      return NextResponse.json({ error: `No hay respaldo del ${fecha}`, disponibles: respaldos.map(r => r.pathname) }, { status: 404 });
    }
    // Descarga → descifra → descomprime, todo en memoria.
    const res = await fetch(elegido.url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: `No se pudo descargar el respaldo (HTTP ${res.status})` }, { status: 502 });
    volcado = JSON.parse(gunzipSync(descifrar(Buffer.from(await res.arrayBuffer()))).toString("utf8"));
    origenDescrito = elegido.pathname;
  }

  const r = await recuperarTenant(prisma, fuenteVolcado(volcado.datos), tenant.id, { aplicar });

  const modelos = Object.fromEntries(
    Object.entries(r.modelos).map(([nombre, m]) => [nombre, {
      enRespaldo: m.enRespaldo,
      yaExisten: m.yaExisten,
      faltan: m.enRespaldo - m.yaExisten,
      ...(aplicar ? { insertadas: m.insertadas, fallidas: m.fallidas.length } : {}),
    }]),
  );
  const insertadas = Object.values(r.modelos).reduce((s, m) => s + m.insertadas, 0);
  const fallidas = Object.entries(r.modelos).flatMap(([n, m]) => m.fallidas.map(f => `${n} ${String(f.id)}: ${f.error}`));

  if (aplicar) {
    await registrarAuditoria({
      tenantId: tenant.id,
      usuario: { name: "Evoluteca (soporte)" },
      accion: "RESTAURAR",
      entidad: "Tenant",
      entidadId: tenant.id,
      descripcion: `Recuperó ${insertadas} registros desde el respaldo del ${volcado.fecha.slice(0, 10)}`,
      despues: Object.fromEntries(Object.entries(r.modelos).map(([n, m]) => [n, m.insertadas])),
      peticion: req,
    });
  }

  return NextResponse.json({
    modo: aplicar ? "APLICADO" : "SIMULACION (no se escribió nada)",
    tenant: { slug, nombre: tenant.nombre },
    respaldo: { origen: origenDescrito, fecha: volcado.fecha },
    modelos,
    ...(aplicar ? { insertadas, fallidas: fallidas.slice(0, 50) } : {}),
  });
}
