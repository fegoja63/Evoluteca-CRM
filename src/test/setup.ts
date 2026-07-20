/**
 * Carga .env.test ANTES de que cualquier prueba importe el cliente de Prisma.
 *
 * Se corre como `setupFiles` de vitest, que vitest ejecuta antes de importar
 * el archivo de prueba — ese orden es lo que garantiza que el cliente se
 * construya apuntando a la rama "test" de Neon y no a desarrollo.
 *
 * No se usa dotenv para no sumar una dependencia por un archivo de 15 lineas.
 */
import fs from "node:fs";
import path from "node:path";

const ruta = path.resolve(process.cwd(), ".env.test");

if (!fs.existsSync(ruta)) {
  throw new Error(
    "Falta el archivo .env.test en la raiz del proyecto.\n" +
      "Sin el, las pruebas correrian contra la base de desarrollo y borrarian datos.\n" +
      "Debe contener DATABASE_URL y DIRECT_URL de la rama 'test' de Neon."
  );
}

for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
  const limpia = linea.trim();
  if (!limpia || limpia.startsWith("#")) continue;

  const corte = limpia.indexOf("=");
  if (corte === -1) continue;

  const clave = limpia.slice(0, corte).trim();
  const valor = limpia
    .slice(corte + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  // Sobrescribe a proposito: si la terminal ya traia un DATABASE_URL cargado
  // (por ejemplo el de desarrollo), .env.test manda.
  process.env[clave] = valor;
}

// Ultima red de seguridad. Si por lo que sea la URL no es la de la rama de
// pruebas, es preferible que TODA la suite falle de inmediato a que una sola
// prueba borre datos reales.
if (!process.env.DATABASE_URL?.includes("ep-gentle-tooth")) {
  throw new Error(
    "DATABASE_URL no apunta a la rama 'test' de Neon. Se aborta la suite " +
      "para no tocar desarrollo ni produccion.\n" +
      "Si cambiaste de rama a proposito, actualiza esta comprobacion en src/test/setup.ts."
  );
}
