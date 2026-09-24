/**
 * Candado de la base de pruebas: una sola corrida a la vez.
 *
 * Todas las copias del repo (la carpeta principal y cada worktree de cada
 * sesion) usan la MISMA rama "test" de Neon. `fileParallelism: false` ordena
 * los archivos dentro de UNA corrida, pero dos corridas simultaneas se borran
 * y resiembran los datos entre si, y un `migrate reset` a mitad de otra
 * corrida le desaparece las tablas. Los fallos que salen de ahi ("Unique
 * constraint failed on id", "la tabla tenants no existe") parecen bugs y no
 * lo son.
 *
 * El candado vive en la propia base (un advisory lock de Postgres), asi que
 * funciona entre carpetas, sesiones y hasta maquinas. Quien llega segundo
 * espera su turno. Si el proceso muere, la conexion se cae y Postgres suelta
 * el candado solo: no quedan candados huerfanos.
 *
 * No importa otros archivos del proyecto a proposito: tambien lo carga Node
 * directamente (scripts/reconstruir-db-test.mts), sin vitest ni alias "@/".
 */
import { PrismaClient } from "@prisma/client";

// Numero arbitrario, fijo. Menor que 2^32 para que en pg_locks quede entero
// en `objid` y se pueda buscar quien lo tiene.
const LLAVE = 74_192_009;

const ESPERA_MAX_MIN = Number(process.env.TEST_CANDADO_ESPERA_MIN ?? 45);
const REINTENTO_MS = 15_000;

type Fila = { ok: boolean };
type Dueno = { application_name: string; desde: Date };

/**
 * Espera hasta tener la base de pruebas para si solo. Devuelve la funcion que
 * la suelta.
 *
 * `quien` se ve en pg_stat_activity: es lo que lee quien este esperando.
 */
export async function tomarCandado(quien: string): Promise<() => Promise<void>> {
  // La conexion directa, no la del pooler: un advisory lock es de la sesion
  // de Postgres y el pooler (modo transaccion) la cambia en cada consulta.
  const base = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!base) throw new Error("[candado] Falta DIRECT_URL / DATABASE_URL de la base de pruebas.");

  const url = new URL(base);
  // Una sola conexion: el candado tiene que quedar en la misma sesion.
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("application_name", quien.slice(0, 60));

  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });

  const intentar = async () => {
    const [fila] = await prisma.$queryRawUnsafe<Fila[]>(`SELECT pg_try_advisory_lock(${LLAVE}) AS ok`);
    return fila.ok;
  };

  const dueno = async () => {
    const [fila] = await prisma.$queryRawUnsafe<Dueno[]>(
      `SELECT a.application_name, a.backend_start AS desde
         FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
        WHERE l.locktype = 'advisory' AND l.classid = 0 AND l.objid = ${LLAVE}
        LIMIT 1`
    );
    return fila ? `${fila.application_name || "otra corrida"} (desde ${fila.desde.toLocaleTimeString("es-CO")})` : "otra corrida";
  };

  const inicio = Date.now();
  let ultimoAviso = 0;

  while (!(await intentar())) {
    const minutos = (Date.now() - inicio) / 60_000;

    if (minutos > ESPERA_MAX_MIN) {
      const quienLoTiene = await dueno();
      await prisma.$disconnect();
      throw new Error(
        `[candado] La base de pruebas sigue ocupada por ${quienLoTiene} tras ${ESPERA_MAX_MIN} min de espera. ` +
          "Si esa corrida ya no existe, su conexion se cerrara sola; vuelve a intentar en un momento."
      );
    }

    if (Date.now() - ultimoAviso > 120_000) {
      console.log(
        `[candado] La base de pruebas la esta usando ${await dueno()}. ` +
          `Esperando turno (${Math.floor(minutos)} min)...`
      );
      ultimoAviso = Date.now();
    }

    await new Promise((r) => setTimeout(r, REINTENTO_MS));
  }

  if (ultimoAviso) console.log("[candado] Base de pruebas libre: empieza la corrida.");

  // Latido: mantiene viva la conexion (si Prisma la reciclara por inactiva,
  // Postgres soltaria el candado) y, si aun asi se perdio, lo vuelve a tomar.
  const latido = setInterval(() => {
    intentar()
      .then((ok) => {
        if (!ok) console.warn("[candado] Se perdio el candado y otra corrida lo tomo: los resultados pueden no ser fiables.");
      })
      .catch(() => {});
  }, 60_000);
  latido.unref();

  return async () => {
    clearInterval(latido);
    await prisma.$queryRawUnsafe("SELECT pg_advisory_unlock_all()").catch(() => {});
    await prisma.$disconnect();
  };
}
