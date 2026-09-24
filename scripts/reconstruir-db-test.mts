// Reconstruye la base de PRUEBAS (prisma migrate reset) tomando antes el
// candado de src/test/candado.ts, para no borrarle las tablas a una corrida
// de vitest de otra sesion o carpeta. Si hay una en curso, espera su turno.
//
// Uso: npm run test:reconstruir-db   (node scripts/reconstruir-db-test.mts)
import { spawnSync } from "node:child_process";
import path from "node:path";
// Carga .env.test y aborta si no apunta a la rama "test" de Neon.
import "../src/test/setup.ts";
import { tomarCandado } from "../src/test/candado.ts";

const soltar = await tomarCandado(`reconstruir-db ${path.basename(process.cwd())} pid ${process.pid}`);

let codigo = 1;
try {
  // Un solo string con shell: en Windows `npx` es un .cmd y necesita shell.
  const r = spawnSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  codigo = r.status ?? 1;
} finally {
  await soltar();
}
process.exit(codigo);
