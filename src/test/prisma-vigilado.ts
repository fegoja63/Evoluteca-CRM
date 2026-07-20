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

/**
 * .El where acota por tenant, de la forma que sea?
 *
 * Hay mas formas validas de las que parece, y todas aparecen en este codigo:
 *
 *   { tenantId }                                  directo
 *   { tenant: { ... } }                           por la relacion
 *   { tenantId_periodo: { tenantId, periodo } }   clave unica compuesta
 *   { empresa: { tenantId, ... } }                a traves de otra tabla
 *   { AND: [ ... { tenantId } ... ] }             anidado
 *
 * Por eso se busca en profundidad en vez de mirar solo el primer nivel: al
 * principio solo miraba arriba y marcaba como fuga tres consultas que estaban
 * perfectamente acotadas.
 *
 * El OR es el unico caso que se trata aparte: basta con que UNA de sus ramas
 * no acote para que la consulta entera se escape, asi que se exigen todas.
 */
function whereFiltraPorTenant(where: unknown, profundidad = 0): boolean {
  if (!where || typeof where !== "object" || profundidad > 6) return false;

  if (Array.isArray(where)) return where.some((x) => whereFiltraPorTenant(x, profundidad + 1));

  const w = where as Record<string, unknown>;

  if (w.tenantId !== undefined) return true;
  if (w.tenant && typeof w.tenant === "object") return true;

  if (Array.isArray(w.OR)) {
    // Todas las ramas del OR deben acotar; si una sola no lo hace, se escapa.
    if (w.OR.length > 0 && w.OR.every((r) => whereFiltraPorTenant(r, profundidad + 1))) return true;
  }

  for (const [clave, valor] of Object.entries(w)) {
    if (clave === "OR") continue; // ya se evaluo con su regla propia
    if (valor && typeof valor === "object" && whereFiltraPorTenant(valor, profundidad + 1)) {
      return true;
    }
  }

  return false;
}

/**
 * Consultas que se permiten aunque no acoten por tenant, con motivo.
 *
 * OJO CON ESTO: la exencion es por modelo y operacion, no por ruta — el
 * vigilante no sabe desde donde lo llaman. Es decir, permite el patron "mi
 * perfil" pero de paso deja pasar cualquier otro Usuario.findUnique por id
 * suelto. El aislamiento de las rutas de usuarios hay que probarlo con datos
 * (barrido de fuga y pruebas especificas), no confiando en esta capa.
 *
 * Se deja escrito para que la laguna sea visible y no una sorpresa.
 */
const PERMITIDAS: Array<{ modelo: string; operaciones: string[]; motivo: string }> = [
  {
    modelo: "Usuario",
    operaciones: ["findUnique", "findUniqueOrThrow", "update"],
    motivo:
      "Patron 'mi perfil': el id sale de la sesion, que ya es del tenant correcto. Acotar por tenant ademas seria redundante.",
  },
];

function estaPermitida(modelo: string, operacion: string): boolean {
  return PERMITIDAS.some((p) => p.modelo === modelo && p.operaciones.includes(operacion));
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


        if (!exento && model && MODELOS_CON_TENANT.has(model) && !estaPermitida(model, operation)) {
          const a = (args ?? {}) as Record<string, unknown>;

          if (OPERACIONES_CON_WHERE.has(operation) && !whereFiltraPorTenant(a.where)) {
            throw new Error(explicar(model, operation, args));
          }

          if (OPERACIONES_DE_CREACION.has(operation) && !datosTraenTenant(a.data)) {
            throw new Error(explicar(model, operation, args));
          }
        }

        const resultado = await query(args);

        // Se marca DESPUES y mirando el resultado, no antes por el nombre de la
        // operacion. La diferencia es enorme en tiempo: las peticiones cruzadas
        // (cliente B apuntando a datos de A) intentan escribir constantemente y
        // no tocan ni una fila; darlas por sucias obligaba a resembrar tras cada
        // prueba, con un viaje a Neon de por medio cada vez.
        if (OPERACIONES_QUE_ESCRIBEN.has(operation)) {
          const cuenta = (resultado as { count?: number } | null)?.count;
          // updateMany/deleteMany devuelven { count }. El resto (create, update
          // y delete de un registro) solo llega aqui si escribio de verdad:
          // Prisma lanza cuando no encuentra el registro.
          if (typeof cuenta !== "number" || cuenta > 0) baseTocada = true;
        }

        return resultado;
      },
    },
  },
});

export type PrismaVigilado = typeof prisma;
