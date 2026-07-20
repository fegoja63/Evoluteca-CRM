/**
 * Siembra de datos para las pruebas de aislamiento.
 *
 * Crea DOS clientes completos (tenant A y tenant B) con los tres roles cada
 * uno y datos equivalentes. Toda prueba de aislamiento consiste, en el fondo,
 * en pedirle a un usuario de B algo que pertenece a A y exigir que no lo vea.
 *
 * Los ids son fijos y legibles a proposito ("op-a-1", "emp-b-1"): cuando una
 * prueba falla, el mensaje dice que dato exacto se filtro sin tener que ir a
 * buscar un uuid a la base.
 */
import { prisma, sinAislamiento, baseFueModificada, marcarBaseLimpia } from "./prisma-vigilado";

/**
 * Construye los ids de un cliente. Todos llevan la letra del tenant dentro
 * ("op-a-1", "cot-b-1") para que, si uno se filtra en una respuesta, el
 * mensaje de error diga a simple vista de quien era.
 */
function ids(letra: "a" | "b") {
  return {
    tenantId: `tenant-${letra}`,
    admin: `u-${letra}-admin`,
    gerente: `u-${letra}-gerente`,
    comercial: `u-${letra}-comercial`,
    empresa: `emp-${letra}-1`,
    contacto: `con-${letra}-1`,
    /** Creada por el COMERCIAL. */
    oportunidadDelComercial: `op-${letra}-1`,
    /** Creada por el ADMINISTRADOR — el comercial no deberia verla. */
    oportunidadAjena: `op-${letra}-2`,
    actividad: `act-${letra}-1`,
    adjunto: `adj-${letra}-1`,
    cotizacion: `cot-${letra}-1`,
    itemCotizacion: `itc-${letra}-1`,
    etapaPipeline: `etp-${letra}-1`,
    plantilla: `pla-${letra}-1`,
    itemPlantilla: `itp-${letra}-1`,
    producto: `prod-${letra}-1`,
    salon: `sal-${letra}-1`,
    expediente: `exp-${letra}-1`,
    terminoExpediente: `ter-${letra}-1`,
    eventoExpediente: `evx-${letra}-1`,
    registroHoras: `hor-${letra}-1`,
    funcion: `fun-${letra}-1`,
    espectador: `esp-${letra}-1`,
    asistencia: `asi-${letra}-1`,
    npsRespuesta: `nps-${letra}-1`,
    metaVenta: `mv-${letra}-1`,
    metaVendedor: `mvd-${letra}-1`,
    eventoTimeline: `tim-${letra}-1`,
  } as const;
}

export const A = ids("a");
export const B = ids("b");

type Molde = typeof A | typeof B;

/**
 * Devuelve las operaciones de un tenant SIN ejecutarlas, para que `sembrar()`
 * las mande todas juntas. Ejecutarlas una por una costaba un viaje de ida y
 * vuelta a Neon por cada una — con la siembra repitiendose antes de cada
 * prueba, eso era casi todo el tiempo de la suite.
 */
function operacionesDe(m: Molde, nombre: string) {
  return [
  prisma.tenant.create({
    data: { id: m.tenantId, nombre, slug: m.tenantId, activo: true },
  }),

  prisma.usuario.createMany({
    data: [
      { id: m.admin, tenantId: m.tenantId, nombre: `Admin ${nombre}`, email: `admin@${m.tenantId}.test`, passwordHash: "no-se-usa", rol: "ADMINISTRADOR" },
      { id: m.gerente, tenantId: m.tenantId, nombre: `Gerente ${nombre}`, email: `gerente@${m.tenantId}.test`, passwordHash: "no-se-usa", rol: "GERENTE" },
      { id: m.comercial, tenantId: m.tenantId, nombre: `Comercial ${nombre}`, email: `comercial@${m.tenantId}.test`, passwordHash: "no-se-usa", rol: "COMERCIAL" },
    ],
  }),

  prisma.empresa.create({
    data: { id: m.empresa, tenantId: m.tenantId, nombre: `Empresa de ${nombre}`, creadoBy: m.admin },
  }),

  prisma.contacto.create({
    data: { id: m.contacto, tenantId: m.tenantId, nombre: `Contacto de ${nombre}`, empresaId: m.empresa },
  }),

  prisma.oportunidad.createMany({
    data: [
      {
        id: m.oportunidadDelComercial,
        tenantId: m.tenantId,
        titulo: `Oportunidad del comercial de ${nombre}`,
        etapa: "PROSPECTO",
        empresaId: m.empresa,
        contactoId: m.contacto,
        creadoBy: m.comercial,
      },
      {
        id: m.oportunidadAjena,
        tenantId: m.tenantId,
        titulo: `Oportunidad del admin de ${nombre}`,
        etapa: "NEGOCIACION",
        empresaId: m.empresa,
        creadoBy: m.admin,
      },
    ],
  }),

  ...operacionesDeModulos(m, nombre),
  ];
}

/**
 * Un registro de cada modelo restante, para poder pedirle a un cliente el
 * detalle de algo del otro.
 *
 * No busca ser realista sino completo: lo que importa es que exista una fila
 * de cada tipo con un id conocido del cliente A, para apuntarle con ella a
 * las rutas /[id] desde una sesion del cliente B.
 */
function operacionesDeModulos(m: Molde, nombre: string) {
  const fecha = new Date("2026-03-15T15:00:00.000Z");

  return [
    prisma.salon.create({
      data: { id: m.salon, tenantId: m.tenantId, nombre: `Salon de ${nombre}`, capacidad: 100 },
    }),

    prisma.producto.create({
      data: { id: m.producto, tenantId: m.tenantId, nombre: `Producto de ${nombre}`, precioBase: 1000 },
    }),

    prisma.etapaPipeline.create({
      data: { id: m.etapaPipeline, tenantId: m.tenantId, key: "PROSPECTO", nombre: `Etapa de ${nombre}`, orden: 1 },
    }),

    prisma.actividad.create({
      data: {
        id: m.actividad,
        tenantId: m.tenantId,
        titulo: `Actividad de ${nombre}`,
        fecha,
        tipo: "LLAMADA",
        empresaId: m.empresa,
        oportunidadId: m.oportunidadDelComercial,
        responsableId: m.comercial,
        creadoBy: m.comercial,
      },
    }),

    prisma.cotizacion.create({
      data: {
        id: m.cotizacion,
        tenantId: m.tenantId,
        empresaId: m.empresa,
        contactoId: m.contacto,
        oportunidadId: m.oportunidadDelComercial,
      },
    }),

    prisma.itemCotizacion.create({
      data: { id: m.itemCotizacion, cotizacionId: m.cotizacion, descripcion: `Item de ${nombre}`, precioUnit: 500 },
    }),

    prisma.plantillaCotizacion.create({
      data: { id: m.plantilla, tenantId: m.tenantId, nombre: `Plantilla de ${nombre}` },
    }),

    prisma.itemPlantillaCotizacion.create({
      data: { id: m.itemPlantilla, plantillaId: m.plantilla, descripcion: `Item plantilla ${nombre}`, precioUnit: 250 },
    }),

    prisma.adjunto.create({
      data: {
        id: m.adjunto,
        tenantId: m.tenantId,
        nombre: `adjunto-${nombre}.txt`,
        tipo: "text/plain",
        tamano: 12,
        datos: "ZGF0b3M=",
        empresaId: m.empresa,
      },
    }),

    prisma.expediente.create({
      data: {
        id: m.expediente,
        tenantId: m.tenantId,
        numeroRadicado: `RAD-${m.tenantId}-001`,
        contraparte: `Contraparte de ${nombre}`,
        empresaId: m.empresa,
      },
    }),

    prisma.terminoExpediente.create({
      data: {
        id: m.terminoExpediente,
        tenantId: m.tenantId,
        expedienteId: m.expediente,
        descripcion: `Termino de ${nombre}`,
        fechaLimite: fecha,
      },
    }),

    prisma.eventoExpediente.create({
      data: {
        id: m.eventoExpediente,
        tenantId: m.tenantId,
        expedienteId: m.expediente,
        tipo: "NOTA",
        titulo: `Bitacora de ${nombre}`,
      },
    }),

    prisma.registroHoras.create({
      data: {
        id: m.registroHoras,
        tenantId: m.tenantId,
        expedienteId: m.expediente,
        usuarioId: m.comercial,
        fecha,
        horas: 2,
      },
    }),

    prisma.funcion.create({
      data: { id: m.funcion, tenantId: m.tenantId, titulo: `Funcion de ${nombre}`, fecha },
    }),

    prisma.espectador.create({
      data: { id: m.espectador, tenantId: m.tenantId, nombre: `Espectador de ${nombre}` },
    }),

    prisma.asistencia.create({
      data: {
        id: m.asistencia,
        tenantId: m.tenantId,
        funcionId: m.funcion,
        espectadorId: m.espectador,
      },
    }),

    prisma.npsRespuesta.create({
      data: { id: m.npsRespuesta, funcionId: m.funcion, puntuacion: 9 },
    }),

    prisma.metaVenta.create({
      data: { id: m.metaVenta, tenantId: m.tenantId, anio: 2026, valorObjetivo: 100000 },
    }),

    prisma.metaVendedor.create({
      data: { id: m.metaVendedor, tenantId: m.tenantId, userId: m.comercial, anio: 2026, mes: 3, meta: 10000 },
    }),

    prisma.eventoTimeline.create({
      data: {
        id: m.eventoTimeline,
        tenantId: m.tenantId,
        empresaId: m.empresa,
        tipo: "NOTA",
        titulo: `Timeline de ${nombre}`,
      },
    }),
  ];
}

/**
 * Deja la base en un estado conocido. Se llama antes de cada prueba: borrar y
 * volver a sembrar es mas barato y mucho mas confiable que intentar deshacer
 * lo que cada prueba haya tocado.
 *
 * Todo va en una sola transaccion, que Prisma manda en un unico viaje a la
 * base. Ademas de ser rapido, garantiza que ninguna prueba pueda encontrarse
 * con una siembra a medio hacer.
 */
export async function sembrar() {
  await sinAislamiento("siembra de datos de prueba: crea los tenants, no puede filtrar por uno", async () => {
    await prisma.$transaction([
      // Borrar el tenant arrastra en cascada usuarios, empresas, contactos y
      // oportunidades (onDelete: Cascade en el esquema).
      prisma.tenant.deleteMany({ where: { id: { in: [A.tenantId, B.tenantId] } } }),
      ...operacionesDe(A, "Cliente A"),
      ...operacionesDe(B, "Cliente B"),
    ]);
  });

  marcarBaseLimpia();
}

/**
 * Lo que va en el `beforeEach` de cada archivo de pruebas.
 *
 * Resiembra solo si la prueba anterior escribio algo. Como el vigilante marca
 * cada escritura por su cuenta, esto es seguro: una prueba que solo lee nunca
 * puede dejarle datos sucios a la siguiente.
 */
export async function sembrarSiHizoFalta() {
  if (baseFueModificada()) await sembrar();
}
