/**
 * Restaura un respaldo hecho por scripts/backup-db.ts.
 *
 * Existe por una razon incomoda: un respaldo que nunca se ha restaurado no es
 * un respaldo, es una suposicion. Hasta que este script no corrio de verdad,
 * nadie sabia si esos JSON de OneDrive servian para algo.
 *
 * USO
 *   node --env-file=<archivo.env> scripts/restaurar-db.ts <carpeta-del-respaldo>
 *
 * El destino sale de DATABASE_URL del archivo .env que se le pase. BORRA TODO
 * lo que haya en ese destino antes de restaurar, asi que exige dos cosas:
 *
 *   1. La variable CONFIRMO_BORRAR_DESTINO=si
 *   2. Que el destino NO sea la base de produccion (se rechaza por nombre de
 *      servidor). Restaurar sobre produccion es una operacion tan delicada que
 *      no debe poder hacerse por accidente desde un script; si algun dia hace
 *      falta de verdad, se hace a mano y mirando.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

/** Servidor de la rama de produccion: nunca es un destino valido aqui. */
const SERVIDOR_PRODUCCION = "ep-holy-leaf";

const carpeta = process.argv[2];

if (!carpeta) {
  console.error("Falta la carpeta del respaldo.\n");
  console.error("  node --env-file=.env.test scripts/restaurar-db.ts <carpeta>");
  process.exit(1);
}

if (!fs.existsSync(path.join(carpeta, "_resumen.json"))) {
  console.error(`No parece un respaldo valido: falta _resumen.json en ${carpeta}`);
  process.exit(1);
}

const destino = process.env.DATABASE_URL ?? "";
const servidor = destino.split("@")[1]?.split(".")[0] ?? "(desconocido)";

if (destino.includes(SERVIDOR_PRODUCCION)) {
  console.error("NEGADO: el destino es la base de produccion.");
  console.error("Este script borra el destino antes de restaurar. Sobre produccion, no.");
  process.exit(1);
}

if (process.env.CONFIRMO_BORRAR_DESTINO !== "si") {
  console.error(`Este script BORRA TODO lo que haya en el destino (${servidor}).`);
  console.error("Si es lo que quieres, vuelve a lanzarlo con CONFIRMO_BORRAR_DESTINO=si");
  process.exit(1);
}

/** Convierte los valores del JSON al tipo que espera Prisma. */
function convertirFila(modelo: Prisma.DMMF.Model, fila: Record<string, unknown>) {
  const convertida: Record<string, unknown> = {};

  for (const campo of modelo.fields) {
    if (campo.kind === "object") continue; // las relaciones se resuelven por su id
    if (!(campo.name in fila)) continue;

    const valor = fila[campo.name];
    // El JSON guarda las fechas como texto ISO; Prisma exige objetos Date.
    convertida[campo.name] =
      campo.type === "DateTime" && typeof valor === "string" ? new Date(valor) : valor;
  }

  return convertida;
}

async function main() {
  const prisma = new PrismaClient();
  const modelos = Prisma.dmmf.datamodel.models;

  console.log(`Origen : ${carpeta}`);
  console.log(`Destino: ${servidor}\n`);

  // Se vacia todo de un golpe con CASCADE: asi no hay que averiguar en que
  // orden borrar para no chocar con las llaves foraneas.
  const tablas = modelos.map((m) => `"${m.dbName ?? m.name}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablas} CASCADE`);
  console.log("Destino vaciado.\n");

  // Se insertan en pasadas sucesivas en vez de calcular el orden de
  // dependencias: en cada vuelta se intenta lo que queda y se conserva lo que
  // fallo por llave foranea. Mientras algo avance, se sigue. Es mas simple que
  // un orden topologico y no se rompe si manana cambian las relaciones.
  const pendientes = new Map<string, Record<string, unknown>[]>();

  for (const modelo of modelos) {
    const archivo = path.join(carpeta, `${modelo.name}.json`);
    if (!fs.existsSync(archivo)) continue;

    const filas = JSON.parse(fs.readFileSync(archivo, "utf8")) as Record<string, unknown>[];
    if (filas.length) pendientes.set(modelo.name, filas.map((f) => convertirFila(modelo, f)));
  }

  const restauradas: Record<string, number> = {};
  let vuelta = 0;

  while (pendientes.size > 0) {
    vuelta++;
    let avanzo = false;

    for (const [nombreModelo, filas] of [...pendientes]) {
      const acceso = nombreModelo.charAt(0).toLowerCase() + nombreModelo.slice(1);
      // @ts-expect-error acceso dinamico por nombre de modelo
      const delegado = prisma[acceso];

      try {
        await delegado.createMany({ data: filas, skipDuplicates: true });
        restauradas[nombreModelo] = filas.length;
        pendientes.delete(nombreModelo);
        avanzo = true;
      } catch (e) {
        // Se reintenta en la siguiente vuelta: probablemente falta su "padre".
        if (vuelta > modelos.length) throw e;
      }
    }

    if (!avanzo) {
      console.error("\nNo se pudo avanzar mas. Quedaron sin restaurar:");
      for (const nombre of pendientes.keys()) console.error(`  ${nombre}`);
      process.exit(1);
    }
  }

  console.log(`Restaurado en ${vuelta} vuelta(s).\n`);
  console.log("Filas por tabla:");
  for (const [tabla, n] of Object.entries(restauradas).sort()) {
    console.log(`  ${tabla}: ${n}`);
  }

  // Se contrasta contra el resumen del propio respaldo: si algo no cuadra, es
  // mejor saberlo ahora que el dia que haga falta.
  const resumen = JSON.parse(
    fs.readFileSync(path.join(carpeta, "_resumen.json"), "utf8")
  ) as { tablas: Record<string, number> };

  const diferencias: string[] = [];
  for (const [tabla, esperadas] of Object.entries(resumen.tablas)) {
    const obtenidas = restauradas[tabla] ?? 0;
    if (obtenidas !== esperadas) diferencias.push(`  ${tabla}: esperadas ${esperadas}, restauradas ${obtenidas}`);
  }

  if (diferencias.length) {
    console.error("\nEL RESPALDO NO CUADRA CON LO RESTAURADO:");
    console.error(diferencias.join("\n"));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\nTodas las tablas cuadran con el resumen del respaldo.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
