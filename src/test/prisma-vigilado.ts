/**
 * Cliente de Prisma VIGILADO — solo existe durante las pruebas.
 *
 * vitest.config.ts redirige "@/lib/prisma" a este archivo, asi que TODA ruta
 * que se ejecute en una prueba usa este cliente sin saberlo y sin que haya
 * que tocar el codigo de produccion.
 *
 * Que hace: intercepta cada consulta. Si el modelo tiene columna `tenantId`
 * y la consulta no filtra por tenant, LANZA. La idea es cazar la fuga entre
 * clientes aunque a nadie se le hubiera ocurrido escribir la prueba de ese
 * caminito en particular.
 *
 * Lo que NO cubre (a proposito, ver ABAJO): `update`/`delete`/`upsert` de un
 * solo registro.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

/** Modelos con columna `tenantId`, leidos del propio esquema (no a mano). */
const MODELOS_CON_TENANT = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === "tenantId"))
    .map((m) => m.name)
);

/**
 * Operaciones donde el filtro por tenant SI se puede verificar mirando los
 * argumentos.
 *
 * Quedan fuera `update`, `delete` y `upsert` de un solo registro: Prisma exige
 * que su `where` sea una clave unica (normalmente `id` suelto), asi que la
 * ausencia de tenantId ahi no prueba nada. El patron del codigo es leer
 * primero con findFirst + tenantId y recien despues escribir por id — y ese
 * findFirst SI queda vigilado aqui. El hueco que queda lo tapan las pruebas de
 * ruta, que comprueban que un PATCH/DELETE cruzado responde 404.
 */
const OPERACIONES_CON_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

const OPERACIONES_DE_CREACION = new Set(["create", "createMany"]);

/** Cualquier operacion que deje la base distinta a como estaba. */
const OPERACIONES_QUE_ESCRIBEN = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

let baseTocada = false;

/**
 * .Escribio alguien desde la ultima siembra?
 *
 * Sirve para resembrar solo cuando de verdad hace falta. La siembra cuesta un
 * viaje a Neon (~2.4s desde aca), y la mayoria de las pruebas de aislamiento
 * solo leen: pagarla en todas multiplicaba por cinco el tiempo de la suite.
 *
 * La marca la pone el propio vigilante, no cada prueba a mano — asi no hay
 * forma de que una prueba nueva ensucie la base sin avisar y le deje el
 * problema a la siguiente.
 */
export function baseFueModificada() {
  return baseTocada;
}

/** La llama `sembrar()` al terminar, cuando la base vuelve a estar conocida. */
export function marcarBaseLimpia() {
  baseTocada = false;
}

/** Permite saltarse la vigilancia en bloques donde no filtrar es lo correcto. */
const almacen = new AsyncLocalStorage<string>();

/**
 * Ejecuta `fn` sin vigilancia de tenant. Exige un motivo escrito: la excusa
 * queda en el codigo y se puede discutir en revision, en vez de ser un olvido
 * silencioso.
 *
 * Casos legitimos: la siembra de datos de prueba, el login (busca al usuario
 * por email cuando todavia no se sabe su tenant) y el panel interno de
 * Evoluteca (que por definicion ve todos los tenants).
 */
export function sinAislamiento<T>(motivo: string, fn: () => Promise<T>): Promise<T> {
  if (!motivo?.trim()) throw new Error("sinAislamiento() exige un motivo escrito.");
  return almacen.run(motivo, fn);
}

/** Busca `tenantId` en el where, incluyendo lo anidado en AND / OR / NOT. */
function whereFiltraPorTenant(where: unknown): boolean {
  if (!where || typeof where !== "object") return false;

  const w = where as Record<string, unknown>;
  if (w.tenantId !== undefined) return true;
  // `tenant: { id: ... }` tambien aisla correctamente.
  if (w.tenant && typeof w.tenant === "object") return true;

  for (const clave of ["AND", "OR", "NOT"] as const) {
    const rama = w[clave];
    if (Array.isArray(rama)) {
      // En OR basta con que UNA rama no filtre para que la consulta se escape,
      // asi que se exige que TODAS filtren. En AND basta con una.
      if (clave === "OR") {
        if (rama.length > 0 && rama.every(whereFiltraPorTenant)) return true;
      } else if (rama.some(whereFiltraPorTenant)) {
        return true;
      }
    } else if (rama && typeof rama === "object" && whereFiltraPorTenant(rama)) {
      return true;
    }
  }

  return false;
}

/** En un create, el tenant puede venir como campo plano o como relacion. */
function datosTraenTenant(data: unknown): boolean {
  if (!data) return false;
  if (Array.isArray(data)) return data.length === 0 || data.every(datosTraenTenant);

  const d = data as Record<string, unknown>;
  return d.tenantId !== undefined || d.tenant !== undefined;
}

function explicar(modelo: string, operacion: string, args: unknown): string {
  return [
    "",
    "  FUGA ENTRE CLIENTES DETECTADA",
    "",
    `  ${modelo}.${operacion}() se ejecuto sin filtrar por tenantId.`,
    "",
    "  Tal como esta, esta consulta puede devolver o modificar datos de un",
    "  cliente distinto al de la sesion. Corrige la ruta agregando",
    "  `tenantId: session.user.tenantId` al where (o a data, si es un create).",
    "",
    "  Si esta consulta debe ver todos los tenants a proposito, envuelvela en",
    "  sinAislamiento(\"motivo\", () => ...) desde src/test/prisma-vigilado.ts.",
    "",
    "  Argumentos recibidos:",
    "  " + JSON.stringify(args, null, 2).split("\n").join("\n  "),
    "",
  ].join("\n");
}

const base = new PrismaClient({ log: ["error"] });

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const exento = almacen.getStore();

        if (OPERACIONES_QUE_ESCRIBEN.has(operation)) baseTocada = true;

        if (!exento && model && MODELOS_CON_TENANT.has(model)) {
          const a = (args ?? {}) as Record<string, unknown>;

          if (OPERACIONES_CON_WHERE.has(operation) && !whereFiltraPorTenant(a.where)) {
            throw new Error(explicar(model, operation, args));
          }

          if (OPERACIONES_DE_CREACION.has(operation) && !datosTraenTenant(a.data)) {
            throw new Error(explicar(model, operation, args));
          }
        }

        return query(args);
      },
    },
  },
});

export type PrismaVigilado = typeof prisma;
