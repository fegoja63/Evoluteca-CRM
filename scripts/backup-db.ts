import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import os from "os";
import path from "path";

// Respaldo completo de la base de datos: exporta cada tabla a JSON.
// No requiere pg_dump — usa Prisma, que ya conoce el esquema completo,
// para leer y volcar cada modelo.
//
// Pensado para correr automáticamente cada día (Programador de tareas de
// Windows). Guarda una copia fuera del proyecto, en una carpeta de OneDrive
// que se sincroniza a la nube, así el respaldo sobrevive aunque le pase algo
// a la cuenta de Neon o a este equipo. Conserva los últimos RETENTION_DIAS.
//
// Ejecutar:  node --env-file=.env scripts/backup-db.ts
// Carpeta destino: variable BACKUP_DIR, o por defecto
//   <OneDrive>/Respaldos-Evoluteca-CRM

const RETENTION_DIAS = Number(process.env.BACKUP_RETENTION_DIAS ?? 30);

function carpetaDestino(): string {
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
  // OneDrive suele exponerse en la variable de entorno OneDrive; si no, se
  // asume <home>/OneDrive.
  const base = process.env.OneDrive || path.join(os.homedir(), "OneDrive");
  return path.join(base, "Respaldos-Evoluteca-CRM");
}

function purgarViejos(baseDir: string) {
  const limite = Date.now() - RETENTION_DIAS * 24 * 60 * 60 * 1000;
  for (const nombre of fs.readdirSync(baseDir)) {
    if (!nombre.startsWith("backup-")) continue;
    const ruta = path.join(baseDir, nombre);
    try {
      if (fs.statSync(ruta).mtimeMs < limite) {
        fs.rmSync(ruta, { recursive: true, force: true });
        console.log(`  (purga) eliminado respaldo viejo: ${nombre}`);
      }
    } catch {
      /* si un respaldo no se puede leer/borrar, se ignora y sigue */
    }
  }
}

/**
 * Convierte a JSON los tipos que la lectura cruda devuelve como objetos.
 *
 * Con findMany esto lo hacía Prisma; leyendo en crudo hay que hacerlo aquí.
 */
function serializar(_clave: string, valor: unknown) {
  if (typeof valor === "bigint") return valor.toString();
  // Los DECIMAL vuelven como objeto Decimal: se guardan como texto para no
  // perder precisión al pasar por un número de JavaScript.
  if (valor && typeof valor === "object" && typeof (valor as { toFixed?: unknown }).toFixed === "function") {
    return (valor as { toFixed: () => string }).toFixed();
  }
  if (Buffer.isBuffer(valor)) return valor.toString("base64");
  return valor;
}

async function main() {
  const prisma = new PrismaClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = carpetaDestino();
  const dir = path.join(base, `backup-${timestamp}`);
  fs.mkdirSync(dir, { recursive: true });

  const modelos = Prisma.dmmf.datamodel.models;
  const resumen: Record<string, number> = {};
  const avisos: string[] = [];

  // Las tablas que EXISTEN de verdad, preguntándoselo a la base.
  const tablasReales = new Set(
    (
      await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `
    ).map((t) => t.table_name)
  );

  for (const modelo of modelos) {
    const tabla = modelo.dbName ?? modelo.name;

    // Si la tabla todavía no existe (código por delante de producción), se
    // anota y se sigue. Antes esto tumbaba el respaldo entero.
    if (!tablasReales.has(tabla)) {
      avisos.push(`La tabla "${tabla}" (modelo ${modelo.name}) no existe todavía en esta base; se omitió.`);
      continue;
    }

    // Lectura CRUDA, no findMany. Es la diferencia que arregla el fallo: un
    // SELECT * trae las columnas que la tabla tiene ahora mismo, mientras que
    // findMany pide las que declara el código — y si el código va por delante
    // (una migración sin desplegar), Prisma falla y no hay respaldo. Justo el
    // momento en que más falta hace.
    const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${tabla}"`);

    resumen[modelo.name] = filas.length;
    fs.writeFileSync(path.join(dir, `${modelo.name}.json`), JSON.stringify(filas, serializar, 2));
    tablasReales.delete(tabla);
  }

  // Lo que quedó en la base y el esquema no conoce (una tabla creada a mano,
  // por ejemplo) se respalda igual: un respaldo incompleto en silencio es peor
  // que no tenerlo.
  tablasReales.delete("_prisma_migrations");
  for (const tabla of tablasReales) {
    const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${tabla}"`);
    resumen[tabla] = filas.length;
    fs.writeFileSync(path.join(dir, `${tabla}.json`), JSON.stringify(filas, serializar, 2));
    avisos.push(`La tabla "${tabla}" existe en la base pero no en schema.prisma; se respaldó igual.`);
  }

  if (avisos.length) {
    console.log("\nAvisos:");
    for (const aviso of avisos) console.log(`  ! ${aviso}`);
  }

  fs.writeFileSync(
    path.join(dir, "_resumen.json"),
    JSON.stringify({ fecha: new Date().toISOString(), tablas: resumen, avisos }, null, 2)
  );

  purgarViejos(base);

  console.log(`\nRespaldo guardado en: ${dir}`);
  console.log(`Retención: ${RETENTION_DIAS} días\n`);
  console.log("Filas por tabla:");
  for (const [tabla, n] of Object.entries(resumen)) {
    console.log(`  ${tabla}: ${n}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
