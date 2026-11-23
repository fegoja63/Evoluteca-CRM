/**
 * Subida por partes de archivos grandes (hasta 15 MB) para la lectura con IA
 * del Gerente Financiero. Vercel no acepta más de 4,5 MB por petición, así
 * que el navegador parte el archivo en pedazos de TAMANO_PARTE y los manda
 * uno por uno (POST /api/finanzas/subir-parte); al final pide leerlo
 * (POST /api/finanzas/leer-ia con subidaId) y el servidor los une y los
 * BORRA en el mismo paso. Cada subida es del usuario y la cuenta que la
 * hicieron; lo que quede a medias se borra a la hora.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MAX_BYTES_ARCHIVO } from "@/lib/finanzas/archivo-ia";

export const TAMANO_PARTE = Math.floor(3.5 * 1024 * 1024);
export const MAX_PARTES = Math.ceil(MAX_BYTES_ARCHIVO / TAMANO_PARTE);
const VIDA_MS = 60 * 60 * 1000;

export const parteSchema = z.object({
  subidaId: z.string().uuid(),
  indice: z.coerce.number().int().min(0).max(MAX_PARTES - 1),
  total: z.coerce.number().int().min(1).max(MAX_PARTES),
  nombre: z.string().trim().min(1).max(200),
});

type Dueno = { tenantId: string; usuarioId: string };

/** Borra las partes viejas de la cuenta (subidas que nunca se leyeron). */
export async function limpiarViejas(tenantId: string, ahora = new Date()) {
  await prisma.parteArchivoTemporal.deleteMany({ where: { tenantId, creadoEn: { lt: new Date(ahora.getTime() - VIDA_MS) } } });
}

export async function guardarParte(d: Dueno, p: z.infer<typeof parteSchema>, datos: Buffer): Promise<{ ok: true } | { ok: false; error: string }> {
  if (p.indice >= p.total) return { ok: false, error: "Parte fuera de orden." };
  if (datos.length === 0 || datos.length > TAMANO_PARTE) return { ok: false, error: "Parte de tamaño inválido." };
  await limpiarViejas(d.tenantId);
  // Una subida no puede mezclar usuarios ni cuentas, ni pasar de 15 MB.
  const previas = await prisma.parteArchivoTemporal.findMany({
    where: { tenantId: d.tenantId, subidaId: p.subidaId }, select: { creadoBy: true, indice: true, datos: true },
  });
  if (previas.some(x => x.creadoBy !== d.usuarioId)) return { ok: false, error: "Subida no válida." };
  const total = previas.filter(x => x.indice !== p.indice).reduce((s, x) => s + x.datos.length, 0) + datos.length;
  if (total > MAX_BYTES_ARCHIVO) return { ok: false, error: "El archivo pesa más de 15 MB." };
  await prisma.parteArchivoTemporal.upsert({
    where: { subidaId_indice: { subidaId: p.subidaId, indice: p.indice }, tenantId: d.tenantId },
    create: { tenantId: d.tenantId, creadoBy: d.usuarioId, subidaId: p.subidaId, indice: p.indice, nombre: p.nombre, datos },
    update: { datos, nombre: p.nombre },
  });
  return { ok: true };
}

/**
 * Une las partes de una subida del usuario y las borra (siempre, aunque
 * falten partes). null si la subida no existe, está incompleta o no es suya.
 */
export async function unirYBorrar(d: Dueno, subidaId: string): Promise<{ nombre: string; buffer: ArrayBuffer } | null> {
  const where = { tenantId: d.tenantId, subidaId, creadoBy: d.usuarioId };
  try {
    const partes = await prisma.parteArchivoTemporal.findMany({ where, orderBy: { indice: "asc" }, select: { indice: true, nombre: true, datos: true } });
    if (partes.length === 0 || partes.some((p, i) => p.indice !== i)) return null;
    const unido = Buffer.concat(partes.map(p => Buffer.from(p.datos)));
    if (unido.length > MAX_BYTES_ARCHIVO) return null;
    return { nombre: partes[0].nombre, buffer: unido.buffer.slice(unido.byteOffset, unido.byteOffset + unido.byteLength) as ArrayBuffer };
  } finally {
    await prisma.parteArchivoTemporal.deleteMany({ where });
  }
}
