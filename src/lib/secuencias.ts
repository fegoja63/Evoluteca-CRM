/**
 * Secuencias de seguimiento: correos que salen solos al cliente, con días de
 * espera entre uno y otro, hasta que responda.
 *
 * - La plantilla (Secuencia) tiene pasos { diasEspera, asunto, cuerpo }.
 * - Al inscribir un contacto, el primer paso sale de inmediato si su
 *   diasEspera es 0; si no, el día que toque. Cada paso siguiente se programa
 *   para el inicio del día (hora de Bogotá) que resulta de sumar sus días de
 *   espera, así el envío de la mañana lo toma ese mismo día.
 * - El cron de días hábiles (procesarSecuencias) envía los pasos vencidos.
 *   Antes de cada envío se revisa si hay que frenar:
 *     RESPONDIO          el contacto respondió (correo recibido después de inscribirlo)
 *     NEGOCIO_CERRADO    el negocio ligado se ganó o se perdió
 *     SIN_CORREO         el contacto ya no tiene correo o fue eliminado
 *     SECUENCIA_INACTIVA la secuencia se desactivó o se borró
 *     USUARIO_INACTIVO   el vendedor que inscribió ya no está activo
 * - Los correos salen con el nombre del vendedor y su respuesta vuelve al CRM
 *   (lib/enviar-correo.ts), igual que los que se envían desde la ficha.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { medianocheBogota } from "@/lib/fecha-bogota";
import { enviarCorreoAlCliente } from "@/lib/enviar-correo";

export const pasoSchema = z.object({
  diasEspera: z.number().int().min(0).max(90),
  asunto: z.string().trim().min(1, "Cada paso necesita asunto").max(200),
  cuerpo: z.string().trim().min(1, "Cada paso necesita texto").max(5000),
});
export const pasosSchema = z.array(pasoSchema).min(1, "Agrega al menos un correo").max(10);

export const secuenciaSchema = z.object({
  nombre: z.string().trim().min(2, "Ponle un nombre").max(120),
  descripcion: z.string().trim().max(300).optional().or(z.literal("")),
  pasos: pasosSchema,
  activa: z.boolean().optional(),
});

export type PasoSecuencia = z.infer<typeof pasoSchema>;

export const VARIABLES = ["{{nombre}}", "{{nombre_completo}}", "{{empresa}}", "{{vendedor}}", "{{negocio}}"] as const;

export function pasosDe(json: unknown): PasoSecuencia[] {
  const r = pasosSchema.safeParse(json);
  return r.success ? r.data : [];
}

/** Reemplaza {{nombre}}, {{empresa}}, etc. Las que no tienen dato quedan vacías. */
export function aplicarVariables(texto: string, v: { nombre: string; empresa?: string | null; vendedor?: string | null; negocio?: string | null }): string {
  const primerNombre = v.nombre.trim().split(/\s+/)[0] ?? "";
  const valores: Record<string, string> = {
    nombre: primerNombre,
    nombre_completo: v.nombre.trim(),
    empresa: v.empresa ?? "",
    vendedor: v.vendedor ?? "",
    negocio: v.negocio ?? "",
  };
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (todo, clave: string) =>
    clave.toLowerCase() in valores ? valores[clave.toLowerCase()] : todo);
}

/** Inicio (hora Bogotá) del día que cae `dias` días después de `desde`. */
export function diaDeEnvio(dias: number, desde: Date): Date {
  return medianocheBogota(dias, desde);
}

export type ResultadoInscripcion =
  | { ok: true; inscripcionId: string; enviadoAhora: boolean }
  | { ok: false; status: 400 | 404 | 409; error: string };

/** Inscribe un contacto en una secuencia a nombre del usuario. */
export async function inscribir(p: {
  tenantId: string; usuarioId: string; secuenciaId: string; contactoId: string; oportunidadId?: string | null; ahora?: Date;
}): Promise<ResultadoInscripcion> {
  const ahora = p.ahora ?? new Date();
  const [secuencia, contacto] = await Promise.all([
    prisma.secuencia.findFirst({ where: { id: p.secuenciaId, tenantId: p.tenantId }, select: { id: true, activa: true, pasos: true } }),
    prisma.contacto.findFirst({ where: { id: p.contactoId, tenantId: p.tenantId, eliminadoEn: null }, select: { id: true, email: true } }),
  ]);
  if (!secuencia) return { ok: false, status: 404, error: "Secuencia no encontrada" };
  if (!secuencia.activa) return { ok: false, status: 400, error: "La secuencia está desactivada" };
  if (!contacto) return { ok: false, status: 404, error: "Contacto no encontrado" };
  if (!contacto.email) return { ok: false, status: 400, error: "El contacto no tiene correo" };
  const pasos = pasosDe(secuencia.pasos);
  if (pasos.length === 0) return { ok: false, status: 400, error: "La secuencia no tiene correos" };

  if (p.oportunidadId) {
    const o = await prisma.oportunidad.findFirst({ where: { id: p.oportunidadId, tenantId: p.tenantId, eliminadoEn: null }, select: { id: true } });
    if (!o) return { ok: false, status: 404, error: "Oportunidad no encontrada" };
  }
  const yaActiva = await prisma.inscripcionSecuencia.findFirst({
    where: { tenantId: p.tenantId, contactoId: contacto.id, estado: "ACTIVA" },
    select: { id: true },
  });
  if (yaActiva) return { ok: false, status: 409, error: "Este contacto ya está en una secuencia activa. Detenla primero." };

  const primero = pasos[0];
  const inscripcion = await prisma.inscripcionSecuencia.create({
    data: {
      tenantId: p.tenantId,
      secuenciaId: secuencia.id,
      contactoId: contacto.id,
      oportunidadId: p.oportunidadId || null,
      usuarioId: p.usuarioId,
      creadoEn: ahora,
      proximoEnvio: primero.diasEspera === 0 ? ahora : diaDeEnvio(primero.diasEspera, ahora),
    },
    select: { id: true },
  });
  let enviadoAhora = false;
  if (primero.diasEspera === 0) {
    await procesarInscripcion(inscripcion.id, p.tenantId, ahora);
    enviadoAhora = true;
  }
  return { ok: true, inscripcionId: inscripcion.id, enviadoAhora };
}

async function finalizar(id: string, tenantId: string, estado: "COMPLETADA" | "DETENIDA", motivoFin: string | null, ahora: Date) {
  await prisma.inscripcionSecuencia.updateMany({
    where: { id, tenantId, estado: "ACTIVA" },
    data: { estado, motivoFin, finalizadoEn: ahora, proximoEnvio: null },
  });
}

export type ResultadoPaso = "enviado" | "completada" | "detenida" | "error" | "omitida";

/** Revisa y, si toca, envía el siguiente correo de una inscripción. */
export async function procesarInscripcion(id: string, tenantId: string, ahora = new Date()): Promise<ResultadoPaso> {
  const ins = await prisma.inscripcionSecuencia.findFirst({
    where: { id, tenantId, estado: "ACTIVA" },
    include: {
      secuencia: { select: { activa: true, pasos: true } },
      contacto: { select: { nombre: true, email: true, eliminadoEn: true, empresaId: true, empresa: { select: { nombre: true } } } },
      oportunidad: { select: { titulo: true, etapa: true, eliminadoEn: true } },
      usuario: { select: { id: true, nombre: true, email: true, activo: true } },
      tenant: { select: { emailsActivos: true, activo: true } },
    },
  });
  if (!ins) return "omitida";
  if (!ins.tenant.activo || !ins.tenant.emailsActivos) return "omitida"; // cuenta suspendida: se retoma al reactivarla

  const parar = async (motivo: string) => { await finalizar(ins.id, ins.tenantId, "DETENIDA", motivo, ahora); return "detenida" as const; };
  if (!ins.secuencia.activa) return parar("SECUENCIA_INACTIVA");
  if (!ins.usuario.activo) return parar("USUARIO_INACTIVO");
  if (ins.contacto.eliminadoEn || !ins.contacto.email) return parar("SIN_CORREO");
  if (ins.oportunidad && (ins.oportunidad.etapa === "GANADA" || ins.oportunidad.etapa === "PERDIDA")) return parar("NEGOCIO_CERRADO");
  const respondio = await prisma.correoRegistrado.findFirst({
    where: { tenantId: ins.tenantId, contactoId: ins.contactoId, direccion: "RECIBIDO", fecha: { gt: ins.creadoEn } },
    select: { id: true },
  });
  if (respondio) return parar("RESPONDIO");

  const pasos = pasosDe(ins.secuencia.pasos);
  const paso = pasos[ins.pasoSiguiente];
  if (!paso) { await finalizar(ins.id, ins.tenantId, "COMPLETADA", null, ahora); return "completada"; }

  const vars = {
    nombre: ins.contacto.nombre,
    empresa: ins.contacto.empresa?.nombre ?? null,
    vendedor: ins.usuario.nombre,
    negocio: ins.oportunidad && !ins.oportunidad.eliminadoEn ? ins.oportunidad.titulo : null,
  };
  const r = await enviarCorreoAlCliente({
    tenantId: ins.tenantId,
    remitente: { id: ins.usuario.id, nombre: ins.usuario.nombre, email: ins.usuario.email },
    para: ins.contacto.email,
    asunto: aplicarVariables(paso.asunto, vars),
    cuerpo: aplicarVariables(paso.cuerpo, vars),
    contactoId: ins.contactoId,
    empresaId: ins.contacto.empresaId,
    oportunidadId: ins.oportunidadId,
  });
  if (!r.ok) {
    // Sin configuración de correo se reintenta en la próxima corrida; otro error, igual.
    return "error";
  }

  const siguiente = pasos[ins.pasoSiguiente + 1];
  await prisma.inscripcionSecuencia.updateMany({
    where: { id: ins.id, tenantId: ins.tenantId, estado: "ACTIVA" },
    data: siguiente
      ? { pasoSiguiente: ins.pasoSiguiente + 1, enviados: { increment: 1 }, proximoEnvio: diaDeEnvio(Math.max(1, siguiente.diasEspera), ahora) }
      : { pasoSiguiente: ins.pasoSiguiente + 1, enviados: { increment: 1 }, estado: "COMPLETADA", finalizadoEn: ahora, proximoEnvio: null },
  });
  return "enviado";
}

/** Envía todos los pasos vencidos (lo llama el cron de días hábiles). */
export async function procesarSecuencias(ahora = new Date(), limite = 200, presupuestoMs = 90_000) {
  const inicio = Date.now();
  const pendientes = await prisma.inscripcionSecuencia.findMany({
    where: { estado: "ACTIVA", proximoEnvio: { lte: ahora } },
    orderBy: { proximoEnvio: "asc" },
    take: limite,
    select: { id: true, tenantId: true },
  });
  const conteo: Record<ResultadoPaso, number> = { enviado: 0, completada: 0, detenida: 0, error: 0, omitida: 0 };
  let sinProcesar = 0;
  for (const [i, p] of pendientes.entries()) {
    if (Date.now() - inicio > presupuestoMs) { sinProcesar = pendientes.length - i; break; }
    conteo[await procesarInscripcion(p.id, p.tenantId, ahora)]++;
  }
  return { ...conteo, revisadas: pendientes.length - sinProcesar, sinProcesar };
}

/** Detiene a mano una inscripción activa. */
export async function detenerInscripcion(id: string, tenantId: string, ahora = new Date()) {
  const r = await prisma.inscripcionSecuencia.updateMany({
    where: { id, tenantId, estado: "ACTIVA" },
    data: { estado: "DETENIDA", motivoFin: "MANUAL", finalizadoEn: ahora, proximoEnvio: null },
  });
  return r.count > 0;
}
