import { prisma } from "@/lib/prisma";
import { medianocheBogota } from "@/lib/fecha-bogota";
import { diasDesde, ultimoMovimiento, type ClienteDormido } from "@/lib/base-dormida";

// Carga de la base dormida (ver lib/base-dormida.ts).

const ETAPAS_EN_CURSO = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"] as const;

/** Lo que se necesita de cada cliente para decidir si está dormido y mostrarlo. */
const seleccion = (ahora: Date) => ({
  id: true, nombre: true, sector: true, creadoEn: true, email: true, telefono: true,
  contactos: {
    where: { eliminadoEn: null }, orderBy: { creadoEn: "asc" as const }, take: 5,
    select: { id: true, nombre: true, cargo: true, email: true, telefono: true },
  },
  oportunidades: {
    where: { eliminadoEn: null }, orderBy: { creadoEn: "desc" as const }, take: 5,
    select: { titulo: true, etapa: true, valor: true, motivoPerdida: true, fechaCierre: true, creadoEn: true, contactoId: true },
  },
  actividades: { where: { fecha: { lte: ahora } }, orderBy: { fecha: "desc" as const }, take: 3, select: { fecha: true, tipo: true, titulo: true } },
  correos: { orderBy: { fecha: "desc" as const }, take: 1, select: { fecha: true } },
});

type EmpresaCargada = Awaited<ReturnType<typeof cargar>>[number];

function cargar(tenantId: string, where: object, ahora: Date, take = 400) {
  return prisma.empresa.findMany({
    where: {
      tenantId, eliminadoEn: null, ...where,
      oportunidades: { none: { eliminadoEn: null, etapa: { in: [...ETAPAS_EN_CURSO] } } },
    },
    select: seleccion(ahora),
    take,
  });
}

function movimientoDe(e: EmpresaCargada): Date {
  return ultimoMovimiento([
    e.actividades[0]?.fecha, e.correos[0]?.fecha,
    ...e.oportunidades.map(o => o.fechaCierre && o.fechaCierre <= new Date() ? o.fechaCierre : o.creadoEn),
  ]) ?? e.creadoEn;
}

/** A quién escribirle: el contacto del último negocio, o el primero con correo o celular. */
function contactoPrincipal(e: EmpresaCargada) {
  const conDatos = e.contactos.filter(c => c.email || c.telefono);
  const delNegocio = e.oportunidades.find(o => o.contactoId)?.contactoId;
  return conDatos.find(c => c.id === delNegocio) ?? conDatos[0] ?? null;
}

/**
 * Clientes dormidos del tenant (el comercial, solo los suyos), los que ya
 * compraron primero y luego los más quietos. Solo los que tienen a quién
 * escribirle.
 */
export async function clientesDormidos(tenantId: string, dias: number, soloDe: string | null, ahora = new Date()): Promise<ClienteDormido[]> {
  const corte = medianocheBogota(-dias, ahora);
  const empresas = await cargar(tenantId, soloDe ? { creadoBy: soloDe } : {}, ahora);
  return empresas
    .map(e => ({ e, mov: movimientoDe(e), contacto: contactoPrincipal(e) }))
    .filter(x => x.mov < corte && x.contacto)
    .map(({ e, mov, contacto }): ClienteDormido => {
      const ultimo = e.oportunidades[0];
      return {
        empresaId: e.id,
        nombre: e.nombre,
        diasQuieto: diasDesde(mov, ahora),
        ultimoNegocio: ultimo ? { titulo: ultimo.titulo, etapa: ultimo.etapa, valor: ultimo.valor === null ? null : Number(ultimo.valor) } : null,
        compro: e.oportunidades.some(o => o.etapa === "GANADA"),
        contacto: contacto && { id: contacto.id, nombre: contacto.nombre, email: contacto.email, telefono: contacto.telefono },
      };
    })
    .sort((a, b) => Number(b.compro) - Number(a.compro) || b.diasQuieto - a.diasQuieto)
    .slice(0, 60);
}

/** Historial de los clientes elegidos, en texto para la IA (solo los del tenant y del alcance). */
export async function historialParaIA(tenantId: string, empresaIds: string[], soloDe: string | null, ahora = new Date()) {
  const empresas = await prisma.empresa.findMany({
    where: { tenantId, eliminadoEn: null, id: { in: empresaIds }, ...(soloDe ? { creadoBy: soloDe } : {}) },
    select: {
      ...seleccion(ahora),
      minutas: { where: { tenantId }, orderBy: { fecha: "desc" }, take: 2, select: { fecha: true, resumen: true } },
    },
  });
  return empresas.map(e => {
    const c = contactoPrincipal(e);
    const lineas = [
      `<cliente id="${e.id}">`,
      `Nombre: ${e.nombre}${e.sector ? ` (sector ${e.sector})` : ""}`,
      c ? `Contacto: ${c.nombre}${c.cargo ? `, ${c.cargo}` : ""}` : "Contacto: sin nombre",
      `Días sin movimiento: ${diasDesde(movimientoDe(e), ahora)}`,
      ...(e.oportunidades.length ? ["Negocios:", ...e.oportunidades.map(o =>
        `- ${o.titulo.slice(0, 150)} · ${o.etapa}${o.valor ? ` · $${Number(o.valor).toLocaleString("es-CO")}` : ""}${o.motivoPerdida ? ` · motivo de pérdida: ${o.motivoPerdida.slice(0, 150)}` : ""}`)] : ["Negocios: ninguno registrado"]),
      ...(e.actividades.length ? ["Últimas actividades:", ...e.actividades.map(a => `- ${a.tipo} · ${a.titulo.slice(0, 120)}`)] : []),
      ...(e.minutas.length ? ["Lo último que se habló:", ...e.minutas.map(m => `- ${m.resumen.slice(0, 400)}`)] : []),
      `</cliente>`,
    ];
    return { empresaId: e.id, texto: lineas.join("\n") };
  });
}
