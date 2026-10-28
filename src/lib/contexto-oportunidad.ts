/**
 * Lo que el CRM sabe de UNA oportunidad, en texto para la IA: datos del
 * negocio, mapa de decisores, minutas, actividades, cotizaciones, correos,
 * historial con el cliente, metodología del equipo y guía de objeciones.
 * Lo usan el "Plan para ganar" y "Preparar reunión", para que las dos lean
 * exactamente lo mismo. Siempre filtra por el tenant.
 */
import { prisma } from "@/lib/prisma";
import { formatoDia, formatoFecha } from "@/lib/fecha-bogota";
import { mapaATexto } from "@/lib/decisores";
import { METODOLOGIAS, metodologiaDe } from "@/lib/metodologias-venta";
import { analisisATexto } from "@/lib/analisis-cliente";
import type { EtapaOportunidad } from "@prisma/client";

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));
const hace = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Propuesta/Cotización",
  NEGOCIACION: "Negociación", GANADA: "Ganada", PERDIDA: "Perdida",
};

/** null si la oportunidad no existe en el tenant (o está en la papelera). */
export async function contextoOportunidad(
  tenantId: string,
  oportunidadId: string,
): Promise<{ etapa: EtapaOportunidad; lineas: string[] } | null> {
  const op = await prisma.oportunidad.findFirst({
    where: { id: oportunidadId, tenantId, eliminadoEn: null },
    select: {
      titulo: true, valor: true, etapa: true, probabilidad: true, notas: true, creadoEn: true, fechaCierre: true,
      origenLead: true, segmento: true, empresaId: true,
      empresa: { select: { nombre: true, sector: true } },
      contacto: { select: { nombre: true, cargo: true } },
      participantes: {
        where: { tenantId, contacto: { eliminadoEn: null } },
        orderBy: { creadoEn: "asc" },
        select: { rol: true, postura: true, contacto: { select: { nombre: true, cargo: true } } },
      },
      minutas: {
        where: { tenantId },
        orderBy: { fecha: "desc" },
        take: 5,
        select: { fecha: true, titulo: true, resumen: true, acuerdos: true, proximosPasos: true, riesgos: true },
      },
      actividades: {
        where: { tenantId },
        orderBy: { fecha: "desc" },
        take: 15,
        select: { tipo: true, titulo: true, fecha: true, completada: true, notas: true },
      },
      cotizaciones: {
        where: { tenantId, eliminadoEn: null },
        orderBy: { creadoEn: "desc" },
        take: 5,
        select: { estado: true, creadoEn: true, motivoRechazo: true, items: { select: { descripcion: true, cantidad: true, precioUnit: true } } },
      },
      correos: {
        where: { tenantId },
        orderBy: { fecha: "desc" },
        take: 6,
        select: { direccion: true, asunto: true, fecha: true },
      },
    },
  });
  if (!op) return null;

  const [tenant, guia, historial, analisis] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { metodologiaVentas: true } }),
    prisma.objecion.findMany({
      where: { tenantId, activa: true }, orderBy: { orden: "asc" }, take: 25,
      select: { objecion: true, respuesta: true },
    }),
    op.empresaId
      ? prisma.oportunidad.findMany({
          where: { tenantId, eliminadoEn: null, empresaId: op.empresaId, etapa: { in: ["GANADA", "PERDIDA"] } },
          orderBy: { fechaCierre: "desc" }, take: 10,
          select: { titulo: true, etapa: true, valor: true, motivoPerdida: true },
        })
      : Promise.resolve([]),
    op.empresaId
      ? prisma.analisisCliente.findFirst({ where: { tenantId, empresaId: op.empresaId } })
      : Promise.resolve(null),
  ]);
  const metodologia = METODOLOGIAS[metodologiaDe(tenant?.metodologiaVentas)];

  const d: string[] = [];
  d.push(`OPORTUNIDAD: ${op.titulo.slice(0, 200)}`);
  d.push(`Cliente: ${op.empresa?.nombre ?? "sin cliente"}${op.empresa?.sector ? ` (sector ${op.empresa.sector})` : ""}`);
  d.push(`Etapa: ${ETAPA_LABEL[op.etapa] ?? op.etapa} · probabilidad ${op.probabilidad ?? "sin dato"} %`);
  d.push(`Valor: ${op.valor ? fmt(op.valor) : "sin valor"}`);
  d.push(`Fecha de cierre esperada: ${op.fechaCierre ? formatoDia(op.fechaCierre) : "sin fecha"}`);
  d.push(`Creada hace ${hace(op.creadoEn)} días${op.origenLead ? ` · origen: ${op.origenLead}` : ""}${op.segmento ? ` · segmento: ${op.segmento}` : ""}`);
  if (op.contacto) d.push(`Contacto principal: ${op.contacto.nombre}${op.contacto.cargo ? ` (${op.contacto.cargo})` : ""}`);
  if (op.notas) d.push(`Notas del vendedor: ${op.notas.slice(0, 1500)}`);

  d.push(`\nMAPA DE DECISORES:\n${mapaATexto(op.participantes)}`);

  if (op.minutas.length) {
    d.push(`\nMINUTAS DE REUNIONES (más reciente primero):`);
    for (const m of op.minutas) {
      d.push(`- ${formatoDia(m.fecha)} · ${m.titulo.slice(0, 120)}: ${m.resumen.slice(0, 800)}`);
      if (m.acuerdos.length) d.push(`  Acuerdos: ${m.acuerdos.slice(0, 6).join("; ").slice(0, 600)}`);
      if (m.proximosPasos.length) d.push(`  Próximos pasos: ${m.proximosPasos.slice(0, 6).join("; ").slice(0, 600)}`);
      if (m.riesgos.length) d.push(`  Riesgos/dudas del cliente: ${m.riesgos.slice(0, 6).join("; ").slice(0, 600)}`);
    }
  } else {
    d.push(`\nNo hay minutas de reuniones registradas.`);
  }

  if (op.actividades.length) {
    d.push(`\nACTIVIDADES (más reciente primero):`);
    for (const a of op.actividades) {
      const estado = a.completada ? "hecha" : a.fecha.getTime() < Date.now() ? "VENCIDA" : "pendiente";
      d.push(`- ${formatoFecha(a.fecha)} · ${a.tipo} · ${a.titulo.slice(0, 150)} (${estado})${a.notas ? ` — ${a.notas.slice(0, 200)}` : ""}`);
    }
  } else {
    d.push(`\nNo hay actividades registradas.`);
  }

  if (op.cotizaciones.length) {
    d.push(`\nCOTIZACIONES:`);
    for (const c of op.cotizaciones) {
      const total = c.items.reduce((s, it) => s + Number(it.cantidad) * Number(it.precioUnit), 0);
      d.push(`- ${formatoFecha(c.creadoEn)} · ${c.estado}${total ? ` · ${fmt(total)} antes de impuestos` : ""}${c.motivoRechazo ? ` · rechazo: ${c.motivoRechazo.slice(0, 200)}` : ""}`);
      for (const it of c.items.slice(0, 6)) d.push(`    · ${it.descripcion.slice(0, 120)}`);
    }
  }

  if (op.correos.length) {
    d.push(`\nCORREOS (más reciente primero):`);
    for (const c of op.correos) d.push(`- ${formatoFecha(c.fecha)} · ${c.direccion === "RECIBIDO" ? "recibido" : "enviado"} · ${c.asunto.slice(0, 150)}`);
  }

  if (historial.length) {
    d.push(`\nHISTORIAL CON ESTE CLIENTE:`);
    for (const h of historial) d.push(`- ${h.titulo.slice(0, 150)} · ${h.etapa === "GANADA" ? "ganada" : "perdida"}${h.valor ? ` · ${fmt(h.valor)}` : ""}${h.motivoPerdida ? ` · motivo: ${h.motivoPerdida.slice(0, 150)}` : ""}`);
  }

  if (analisis) d.push(...analisisATexto(analisis));

  d.push(`\nMETODOLOGÍA DE VENTAS DEL EQUIPO: ${metodologia.label} — ${metodologia.enfoque}`);
  if (guia.length) {
    d.push(`\nGUÍA DE OBJECIONES DEL EQUIPO:`);
    for (const g of guia) d.push(`- "${g.objecion.slice(0, 150)}" → ${g.respuesta.slice(0, 250)}`);
  }
  return { etapa: op.etapa, lineas: d };
}
