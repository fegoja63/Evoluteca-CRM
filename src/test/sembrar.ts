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

export const A = {
  tenantId: "tenant-a",
  admin: "u-a-admin",
  gerente: "u-a-gerente",
  comercial: "u-a-comercial",
  empresa: "emp-a-1",
  contacto: "con-a-1",
  /** Creada por el COMERCIAL de A. */
  oportunidadDelComercial: "op-a-1",
  /** Creada por el ADMINISTRADOR de A — el comercial no deberia verla. */
  oportunidadAjena: "op-a-2",
} as const;

export const B = {
  tenantId: "tenant-b",
  admin: "u-b-admin",
  gerente: "u-b-gerente",
  comercial: "u-b-comercial",
  empresa: "emp-b-1",
  contacto: "con-b-1",
  oportunidadDelComercial: "op-b-1",
  oportunidadAjena: "op-b-2",
} as const;

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
