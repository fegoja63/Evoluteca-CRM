/**
 * .Pueden las migraciones reconstruir la base que el codigo espera?
 *
 * Compara prisma/migrations contra prisma/schema.prisma. Si no coinciden, hay
 * "deriva": la base real funciona porque alguien aplico cambios a mano, pero
 * levantarla desde cero (restaurar un respaldo, montar un ambiente nuevo)
 * daria un esquema distinto. Eso ya paso una vez en este proyecto con
 * tenants.emailsActivos, y se descubrio de casualidad.
 *
 *   npm run db:verificar-deriva
 *
 * Salida 0 = sin deriva. Salida 2 = hay deriva (crea la migracion que falte).
 *
 * OJO: usa la base de pruebas como borrador y la deja VACIA. No pasa nada
 * porque las pruebas siembran lo suyo, pero no la corras esperando conservar
 * datos ahi. Nunca toca desarrollo ni produccion.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const ruta = path.resolve(process.cwd(), ".env.test");
if (!fs.existsSync(ruta)) {
  console.error("Falta .env.test — es de donde sale la base borrador.");
  process.exit(1);
}

const env = {};
for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
  const limpia = linea.trim();
  if (!limpia || limpia.startsWith("#")) continue;
  const corte = limpia.indexOf("=");
  if (corte === -1) continue;
  env[limpia.slice(0, corte).trim()] = limpia
    .slice(corte + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

if (!env.DIRECT_URL) {
  console.error("Falta DIRECT_URL en .env.test.");
  process.exit(1);
}

// Se invoca el CLI de Prisma con node en vez de "npx": desde Node 24, Windows
// rechaza lanzar archivos .cmd directamente (EINVAL), y asi ademas se ahorra
// el arranque de npx.
const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");

const resultado = execFileSync(
  process.execPath,
  [
    prismaCli,
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--shadow-database-url",
    env.DIRECT_URL,
    "--script",
  ],
  { encoding: "utf8", env: { ...process.env, ...env } }
);

// Cuando no hay diferencias, `migrate diff --script` no dice "No difference
// detected" (ese es el mensaje del modo sin --script) sino que devuelve un
// guion vacio con el comentario "This is an empty migration". Hay que
// reconocer las dos formas o el check da falso positivo siempre.
const hayDeriva =
  !/no difference detected/i.test(resultado) && !/this is an empty migration/i.test(resultado);

if (!hayDeriva) {
  console.log("Sin deriva: las migraciones reconstruyen el esquema exacto.");
  process.exit(0);
}

console.error("DERIVA DETECTADA. Falta una migracion que aplique esto:\n");
console.error(resultado);
console.error(
  "Crea prisma/migrations/<fecha>_<nombre>/migration.sql con ese SQL.\n" +
    "Escribelo idempotente (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS): va a\n" +
    "correr sobre produccion, donde los cambios probablemente ya existen."
);
process.exit(2);
