// Mantiene "viva" la cuenta demo generando una semana de actividad comercial
// realista (llamadas, correos, reuniones, visitas, tareas y algunas propuestas)
// fechada alrededor de HOY. Pensado para correr una vez por semana (cron) contra
// la cuenta demo de producción, de modo que el panel "El Lunes" y la agenda
// nunca se vean en ceros para quien entra a probar el CRM.
//
// Idempotente: TODO lo que genera queda marcado con el prefijo TAG en `notas`.
// En cada corrida borra primero lo marcado (actividades y cotizaciones) y vuelve
// a crear una banda fresca, así el volumen no crece con el tiempo y la ventana
// de "últimos 7 días" siempre queda poblada sin importar qué día se mire.
//
// Solo toca datos de relleno del demo; jamás actividades/cotizaciones reales
// (las que no llevan el TAG) ni ningún otro tenant.

import type { PrismaClient, TipoActividad, EtapaPostventa } from "@prisma/client";

export const TAG_DEMO = "[demo-auto]";
const SLUG_DEMO = "demo-evoluteca";

// Banda de fechas: desde hace 6 días hasta dentro de 6 días. Las pasadas cuentan
// como "toques" hechos (completadas); las futuras alimentan la agenda viva.
const DIAS_ATRAS = 6;
const DIAS_ADELANTE = 6;

// "Próximo paso" de cada oportunidad abierta (regla "sin siguiente paso, no hay
// oportunidad" del estado comercial). Se agenda a 7–13 días para que siga
// vigente toda la semana, hasta la siguiente corrida del lunes; las tareas de la
// banda de arriba vencen a mitad de semana y dejarían el demo "sin próximo paso".
// Unas pocas oportunidades quedan SIN paso a propósito, para que el demo muestre
// la alerta en acción sin verse abandonado.
const PROXIMO_PASO_DIAS_MIN = 7;
const PROXIMO_PASO_DIAS_MAX = 13;
const SIN_PASO_A_PROPOSITO = 2;
const TITULOS_PROXIMO_PASO: { tipo: TipoActividad; titulo: string }[] = [
  { tipo: "LLAMADA", titulo: "Llamada de seguimiento a la propuesta" },
  { tipo: "REUNION", titulo: "Reunión con el decisor" },
  { tipo: "REUNION", titulo: "Demo del producto al equipo" },
  { tipo: "EMAIL", titulo: "Enviar propuesta ajustada" },
  { tipo: "LLAMADA", titulo: "Confirmar decisión y fecha de arranque" },
  { tipo: "TAREA", titulo: "Preparar cotización final" },
];

type Plantilla = { tipo: TipoActividad; titulos: string[]; peso: number };

// Mezcla de toques típica de un equipo B2B activo. `peso` = probabilidad relativa.
const PLANTILLAS: Plantilla[] = [
  { tipo: "LLAMADA", peso: 34, titulos: [
    "Llamada de seguimiento", "Llamada para agendar reunión", "Llamada de prospección",
    "Llamada: resolver dudas de la propuesta", "Llamada de cierre",
  ] },
  { tipo: "EMAIL", peso: 24, titulos: [
    "Correo de seguimiento", "Envío de propuesta por correo", "Correo con información solicitada",
    "Correo de reactivación", "Correo: confirmar próxima reunión",
  ] },
  { tipo: "REUNION", peso: 16, titulos: [
    "Reunión de descubrimiento", "Reunión de presentación de propuesta",
    "Reunión de negociación", "Demo del producto", "Reunión de seguimiento",
  ] },
  { tipo: "VISITA_COMERCIAL", peso: 10, titulos: [
    "Visita comercial al cliente", "Visita de relacionamiento", "Visita para levantar necesidades",
  ] },
  { tipo: "TAREA", peso: 16, titulos: [
    "Preparar cotización", "Actualizar información del cliente", "Enviar documentación",
    "Preparar propuesta comercial", "Dar seguimiento a pendientes",
  ] },
];

// Ítems verosímiles para las propuestas de relleno.
const ITEMS_PROPUESTA: { descripcion: string; precioUnit: number }[] = [
  { descripcion: "Implementación y puesta en marcha", precioUnit: 4_500_000 },
  { descripcion: "Licenciamiento anual — plan Equipo", precioUnit: 7_200_000 },
  { descripcion: "Capacitación y acompañamiento", precioUnit: 1_800_000 },
  { descripcion: "Soporte y mantenimiento (12 meses)", precioUnit: 2_400_000 },
  { descripcion: "Consultoría de configuración", precioUnit: 3_000_000 },
];

// Negocios ganados del mes, para que el dashboard no muestre "$0 ganado este mes"
// y se vea una empresa que cierra ventas. Se fechan dentro del mes en curso.
const GANADOS_MIN = 4;
const GANADOS_MAX = 7;
const VALOR_GANADO_MIN = 3_000_000;
const VALOR_GANADO_MAX = 22_000_000;
const TITULOS_GANADOS = [
  "Venta cerrada — plan Equipo", "Renovación anual de licencias", "Ampliación de puestos",
  "Nuevo contrato de servicios", "Cierre: implementación CRM", "Upgrade a plan superior",
];

// Papelera: unos pocos registros eliminados hace pocos días, para que la
// pestaña Papelera del demo no se vea vacía y se pueda probar "Restaurar" y
// "Eliminar definitivamente". Todo va marcado con TAG en `notas`, así que se
// borra y recrea en cada corrida: si quien prueba el demo restaura o elimina
// uno, la corrida siguiente lo repone.
const PAPELERA_DIAS_MAX = 12;
const EMPRESAS_PAPELERA = [
  { nombre: "Distribuidora Andina del Sur", sector: "Comercio", email: "compras@andinadelsur.com.co" },
  { nombre: "Taller Creativo Macondo", sector: "Servicios", email: "hola@tallermacondo.co" },
];
const CONTACTOS_PAPELERA = [
  { nombre: "Julián Restrepo", cargo: "Jefe de compras", email: "julian.restrepo@correo.co" },
  { nombre: "Marcela Ortiz", cargo: "Asistente administrativa", email: "marcela.ortiz@correo.co" },
];
const OPORTUNIDADES_PAPELERA = [
  { titulo: "Cotización duplicada — plan Equipo", valor: 6_500_000, etapa: "PROPUESTA" as const },
  { titulo: "Prueba piloto (creada por error)", valor: 2_000_000, etapa: "PROSPECTO" as const },
];

// Postventa: el demo muestra el módulo activo y los ganados del mes repartidos
// en su tablero. Cada ganado toma, en orden, una etapa y una fecha de
// renovación (días desde hoy); las de 12 y 25 días caen dentro del aviso de 30
// días, así el tablero y el dashboard muestran "por renovar".
const POSTVENTA_DEMO: { etapa: EtapaPostventa; renuevaEnDias: number | null }[] = [
  { etapa: "SEGUIMIENTO", renuevaEnDias: 12 },
  { etapa: "ENTREGA",     renuevaEnDias: 330 },
  { etapa: "RENOVACION",  renuevaEnDias: 25 },
  { etapa: "SEGUIMIENTO", renuevaEnDias: 180 },
  { etapa: "ENTREGA",     renuevaEnDias: null },
  { etapa: "CERRADO",     renuevaEnDias: null },
  { etapa: "SEGUIMIENTO", renuevaEnDias: 240 },
];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tipoPonderado(): Plantilla {
  const total = PLANTILLAS.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * total;
  for (const p of PLANTILLAS) { r -= p.peso; if (r <= 0) return p; }
  return PLANTILLAS[0];
}

// Fecha en horario laboral (8:00–17:59) del día indicado por offset (en días
// respecto a hoy), anclada a la hora local del servidor.
function fechaLaboral(offsetDias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  d.setHours(rndInt(8, 17), rndInt(0, 59), 0, 0);
  return d;
}

// Fecha aleatoria dentro del mes en curso, entre el día 1 y HOY (nunca futura),
// para fechar los negocios ganados del mes.
function fechaEsteMes(): Date {
  const hoy = new Date();
  const dia = rndInt(1, hoy.getDate());
  return new Date(hoy.getFullYear(), hoy.getMonth(), dia, rndInt(8, 17), rndInt(0, 59), 0, 0);
}

export type ResultadoDemoSemanal = {
  ok: boolean;
  error?: string;
  tenant?: string;
  actividadesCreadas?: number;
  proximosPasosCreados?: number;
  propuestasCreadas?: number;
  ganadosCreados?: number;
  papeleraCreados?: number;
  actividadesBorradas?: number;
  propuestasBorradas?: number;
  ganadosBorrados?: number;
};

/**
 * Regenera la actividad de relleno de la cuenta demo.
 * @param prisma  cliente Prisma (el del app en el cron, o uno propio en scripts)
 * @param slug    slug del tenant demo (por defecto `demo-evoluteca`)
 */
export async function refrescarDemoSemanal(
  prisma: PrismaClient,
  slug: string = SLUG_DEMO,
): Promise<ResultadoDemoSemanal> {
  const tenant = await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true, modulos: true } });
  if (!tenant) return { ok: false, error: `No existe el tenant demo con slug "${slug}"` };
  const T = tenant.id;
  const ahora = new Date();

  // Vendedores a quienes atribuir la actividad (comerciales y gerentes).
  let vendedores = await prisma.usuario.findMany({
    where: { tenantId: T, rol: { in: ["COMERCIAL", "GERENTE"] } },
    select: { id: true },
  });
  if (vendedores.length === 0) {
    vendedores = await prisma.usuario.findMany({ where: { tenantId: T }, select: { id: true } });
  }

  // Empresas con sus contactos y oportunidades abiertas, para colgar cada toque
  // de algo real del demo.
  const empresas = await prisma.empresa.findMany({
    where: { tenantId: T, eliminadoEn: null },
    select: {
      id: true,
      contactos: { where: { eliminadoEn: null }, select: { id: true }, take: 5 },
      oportunidades: {
        where: { eliminadoEn: null, etapa: { in: ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"] } },
        select: { id: true },
      },
    },
  });
  if (empresas.length === 0) return { ok: false, error: "El demo no tiene empresas; nada que poblar." };

  // 1) Borrar el relleno anterior (marcado con TAG). Así el volumen no crece.
  //    Primero actividades y cotizaciones (pueden referenciar oportunidades),
  //    luego las oportunidades ganadas de relleno.
  const borradoActs = await prisma.actividad.deleteMany({
    where: { tenantId: T, notas: { startsWith: TAG_DEMO } },
  });
  const borradoCots = await prisma.cotizacion.deleteMany({
    where: { tenantId: T, notas: { startsWith: TAG_DEMO } },
  });
  const borradoOps = await prisma.oportunidad.deleteMany({
    where: { tenantId: T, notas: { startsWith: TAG_DEMO } },
  });
  // Relleno de la Papelera (clientes y contactos marcados; las oportunidades y
  // cotizaciones marcadas ya se borraron arriba).
  await prisma.contacto.deleteMany({ where: { tenantId: T, notas: { startsWith: TAG_DEMO } } });
  await prisma.empresa.deleteMany({ where: { tenantId: T, notas: { startsWith: TAG_DEMO } } });

  // 2) Generar la banda de actividad (pasado reciente + próximos días).
  const nuevas: {
    tipo: TipoActividad; titulo: string; fecha: Date; completada: boolean;
    estado: "COMPLETADA" | "PENDIENTE"; notas: string; tenantId: string;
    responsableId: string; creadoBy: string; empresaId: string;
    contactoId: string | null; oportunidadId: string | null;
  }[] = [];

  for (let off = -DIAS_ATRAS; off <= DIAS_ADELANTE; off++) {
    const porDia = rndInt(2, 5);
    for (let i = 0; i < porDia; i++) {
      const fecha = fechaLaboral(off);
      const emp = rnd(empresas);
      const plantilla = tipoPonderado();
      const vendedor = rnd(vendedores).id;
      const pasada = fecha <= ahora;
      nuevas.push({
        tipo: plantilla.tipo,
        titulo: rnd(plantilla.titulos),
        fecha,
        completada: pasada,
        estado: pasada ? "COMPLETADA" : "PENDIENTE",
        notas: `${TAG_DEMO} actividad de demostración`,
        tenantId: T,
        responsableId: vendedor,
        creadoBy: vendedor,
        empresaId: emp.id,
        contactoId: emp.contactos.length ? rnd(emp.contactos).id : null,
        oportunidadId: emp.oportunidades.length ? rnd(emp.oportunidades).id : null,
      });
    }
  }
  // 2b) Próximo paso agendado para casi todas las oportunidades abiertas.
  //     Mismo TAG → se borra y recrea en cada corrida (no acumula).
  const abiertas = barajar(empresas.flatMap(e => e.oportunidades.map(o => ({ oportunidadId: o.id, emp: e }))));
  const conPaso = abiertas.slice(Math.min(SIN_PASO_A_PROPOSITO, Math.max(0, abiertas.length - 1)));
  for (const { oportunidadId, emp } of conPaso) {
    const paso = rnd(TITULOS_PROXIMO_PASO);
    const vendedor = rnd(vendedores).id;
    nuevas.push({
      tipo: paso.tipo,
      titulo: paso.titulo,
      fecha: fechaLaboral(rndInt(PROXIMO_PASO_DIAS_MIN, PROXIMO_PASO_DIAS_MAX)),
      completada: false,
      estado: "PENDIENTE",
      notas: `${TAG_DEMO} próximo paso de demostración`,
      tenantId: T,
      responsableId: vendedor,
      creadoBy: vendedor,
      empresaId: emp.id,
      contactoId: emp.contactos.length ? rnd(emp.contactos).id : null,
      oportunidadId,
    });
  }

  await prisma.actividad.createMany({ data: nuevas });

  // 3) Un par de propuestas (cotizaciones ENVIADAS) de la semana.
  const empresasConOpo = empresas.filter(e => e.oportunidades.length > 0);
  const cuantasProp = Math.min(rndInt(2, 4), empresasConOpo.length || 0);
  let propuestasCreadas = 0;
  for (let i = 0; i < cuantasProp; i++) {
    const emp = rnd(empresasConOpo);
    const creadoEn = fechaLaboral(-rndInt(0, DIAS_ATRAS));
    const items = Array.from({ length: rndInt(1, 2) }, () => rnd(ITEMS_PROPUESTA));
    await prisma.cotizacion.create({
      data: {
        tenantId: T,
        estado: "ENVIADA",
        modalidad: "FEE_FIJO",
        notas: `${TAG_DEMO} propuesta de demostración`,
        creadoEn,
        fechaValidez: new Date(creadoEn.getTime() + 30 * 864e5),
        empresaId: emp.id,
        contactoId: emp.contactos.length ? rnd(emp.contactos).id : null,
        oportunidadId: rnd(emp.oportunidades).id,
        items: {
          create: items.map(it => ({ descripcion: it.descripcion, cantidad: rndInt(1, 3), precioUnit: it.precioUnit })),
        },
      },
    });
    propuestasCreadas++;
  }

  // 4) Negocios GANADOS del mes, para que "Ganado este mes" no salga en $0.
  //    Se fechan con fechaCierre dentro del mes en curso (fechaEfectiva los
  //    agrupa por esa fecha) y se cuelgan de una empresa existente.
  const cuantosGanados = rndInt(GANADOS_MIN, GANADOS_MAX);
  const ganados = Array.from({ length: cuantosGanados }, (_, i) => {
    const emp = rnd(empresas);
    const pv = POSTVENTA_DEMO[i % POSTVENTA_DEMO.length];
    const vendedor = rnd(vendedores).id;
    return {
      titulo: rnd(TITULOS_GANADOS),
      valor: rndInt(VALOR_GANADO_MIN / 100_000, VALOR_GANADO_MAX / 100_000) * 100_000,
      etapa: "GANADA" as const,
      probabilidad: 100,
      fechaCierre: fechaEsteMes(),
      notas: `${TAG_DEMO} negocio ganado de demostración`,
      postventaEtapa: pv.etapa,
      fechaRenovacion: pv.renuevaEnDias === null ? null : fechaLaboral(pv.renuevaEnDias),
      tenantId: T,
      empresaId: emp.id,
      contactoId: emp.contactos.length ? rnd(emp.contactos).id : null,
      creadoBy: vendedor,
    };
  });
  await prisma.oportunidad.createMany({ data: ganados });

  // El demo muestra el módulo Postventa activo (sin tocar los demás módulos).
  const modulosActuales = (tenant.modulos && typeof tenant.modulos === "object" ? tenant.modulos : {}) as Record<string, unknown>;
  if (modulosActuales.postventa !== true) {
    await prisma.tenant.update({ where: { id: T }, data: { modulos: { ...modulosActuales, postventa: true } } });
  }

  // 5) Papelera: clientes, contactos, oportunidades y una cotización
  //    eliminados hace 1–12 días (soft delete, igual que al borrar desde la app).
  const eliminadoHace = () => fechaLaboral(-rndInt(1, PAPELERA_DIAS_MAX));
  const notaPapelera = `${TAG_DEMO} registro eliminado de demostración`;
  const vendedorPapelera = () => rnd(vendedores).id;
  for (const e of EMPRESAS_PAPELERA) {
    await prisma.empresa.create({
      data: { ...e, notas: notaPapelera, tenantId: T, creadoBy: vendedorPapelera(),
        creadoEn: fechaLaboral(-rndInt(30, 90)), eliminadoEn: eliminadoHace() },
    });
  }
  for (const c of CONTACTOS_PAPELERA) {
    await prisma.contacto.create({
      data: { ...c, notas: notaPapelera, tenantId: T, empresaId: rnd(empresas).id,
        creadoEn: fechaLaboral(-rndInt(30, 90)), eliminadoEn: eliminadoHace() },
    });
  }
  for (const o of OPORTUNIDADES_PAPELERA) {
    const emp = rnd(empresas);
    await prisma.oportunidad.create({
      data: { ...o, probabilidad: 30, notas: notaPapelera, tenantId: T, empresaId: emp.id,
        contactoId: emp.contactos.length ? rnd(emp.contactos).id : null,
        creadoBy: vendedorPapelera(), creadoEn: fechaLaboral(-rndInt(20, 60)), eliminadoEn: eliminadoHace() },
    });
  }
  const empCot = rnd(empresas);
  await prisma.cotizacion.create({
    data: {
      tenantId: T, estado: "BORRADOR", modalidad: "FEE_FIJO", notas: notaPapelera,
      creadoEn: fechaLaboral(-rndInt(15, 40)), eliminadoEn: eliminadoHace(),
      empresaId: empCot.id, contactoId: empCot.contactos.length ? rnd(empCot.contactos).id : null,
      items: { create: [{ descripcion: rnd(ITEMS_PROPUESTA).descripcion, cantidad: 1, precioUnit: rnd(ITEMS_PROPUESTA).precioUnit }] },
    },
  });
  const papeleraCreados = EMPRESAS_PAPELERA.length + CONTACTOS_PAPELERA.length + OPORTUNIDADES_PAPELERA.length + 1;

  return {
    ok: true,
    tenant: tenant.nombre,
    actividadesCreadas: nuevas.length,
    proximosPasosCreados: conPaso.length,
    propuestasCreadas,
    ganadosCreados: ganados.length,
    papeleraCreados,
    actividadesBorradas: borradoActs.count,
    propuestasBorradas: borradoCots.count,
    ganadosBorrados: borradoOps.count,
  };
}
