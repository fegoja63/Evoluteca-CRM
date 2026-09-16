/**
 * Convierte un respaldo del cron (el que se sube a Vercel Blob) al formato de
 * carpeta que entiende scripts/restaurar-db.ts.
 *
 * El respaldo del cron es UN archivo cifrado y comprimido con todo dentro
 * ({ fecha, tablas, datos }). La restauración, en cambio, espera una carpeta
 * con un <Modelo>.json por tabla y un _resumen.json (el formato de
 * scripts/backup-db.ts). Este puente descifra, descomprime y explota el
 * archivo a ese formato, para reutilizar el camino de restauración YA
 * verificado en vez de duplicar su lógica.
 *
 * USO
 *   node --env-file=.env scripts/descifrar-respaldo.ts <archivo.json.gz.enc> <carpeta-salida>
 *
 * Necesita RESPALDO_CLAVE (la misma con la que se cifró) en el .env.
 * Después:
 *   node --env-file=.env.test scripts/restaurar-db.ts <carpeta-salida>
 */
import { Prisma } from "@prisma/client";
import { gunzipSync } from "node:zlib";
import fs from "fs";
import path from "path";
import { descifrar } from "../src/lib/respaldo-cifrado.ts";

const archivo = process.argv[2];
const carpetaSalida = process.argv[3];

if (!archivo || !carpetaSalida) {
  console.error("Faltan argumentos.\n");
  console.error("  node --env-file=.env scripts/descifrar-respaldo.ts <archivo.json.gz.enc> <carpeta-salida>");
  process.exit(1);
}

if (!fs.existsSync(archivo)) {
  console.error(`No existe el archivo: ${archivo}`);
  process.exit(1);
}

// table_name (como lo guarda el cron) -> nombre de modelo (como lo espera la
// restauración). Para las tablas que no son de un modelo del schema, se deja
// el nombre tal cual.
const tablaAModelo = new Map<string, string>();
for (const m of Prisma.dmmf.datamodel.models) {
  tablaAModelo.set(m.dbName ?? m.name, m.name);
}

function main() {
  const cifrado = fs.readFileSync(archivo);
  const comprimido = descifrar(cifrado);
  const json = gunzipSync(comprimido).toString("utf8");
  const respaldo = JSON.parse(json) as {
    fecha: string;
    tablas: Record<string, number>;
    datos: Record<string, unknown[]>;
  };

  fs.mkdirSync(carpetaSalida, { recursive: true });

  const resumen: Record<string, number> = {};
  for (const [tabla, filas] of Object.entries(respaldo.datos)) {
    const nombre = tablaAModelo.get(tabla) ?? tabla;
    fs.writeFileSync(path.join(carpetaSalida, `${nombre}.json`), JSON.stringify(filas, null, 2));
    resumen[nombre] = filas.length;
  }

  fs.writeFileSync(
    path.join(carpetaSalida, "_resumen.json"),
    JSON.stringify({ fecha: respaldo.fecha, tablas: resumen }, null, 2)
  );

  const filasTotales = Object.values(resumen).reduce((a, b) => a + b, 0);
  console.log(`Respaldo del ${respaldo.fecha} descifrado en: ${carpetaSalida}`);
  console.log(`${filasTotales} registros en ${Object.keys(resumen).length} tablas.\n`);
  console.log("Para restaurarlo en una base de PRUEBA (nunca producción):");
  console.log(`  node --env-file=.env.test scripts/restaurar-db.ts ${carpetaSalida}`);
}

main();
