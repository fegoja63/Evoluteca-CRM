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

async function main() {
  const prisma = new PrismaClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = carpetaDestino();
  const dir = path.join(base, `backup-${timestamp}`);
  fs.mkdirSync(dir, { recursive: true });

  const modelNames = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const resumen: Record<string, number> = {};

  for (const modelName of modelNames) {
    const accessor = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    // @ts-expect-error acceso dinámico por nombre de modelo
    const delegate = prisma[accessor];
    if (!delegate?.findMany) continue;

    const rows = await delegate.findMany();
    resumen[modelName] = rows.length;
    fs.writeFileSync(
      path.join(dir, `${modelName}.json`),
      JSON.stringify(rows, null, 2)
    );
  }

  fs.writeFileSync(
    path.join(dir, "_resumen.json"),
    JSON.stringify({ fecha: new Date().toISOString(), tablas: resumen }, null, 2)
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
