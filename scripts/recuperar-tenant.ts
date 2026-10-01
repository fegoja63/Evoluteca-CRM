/**
 * Recupera los datos comerciales de UN tenant desde un respaldo, SOLO
 * agregando lo que falta (nunca borra ni modifica). Ver src/lib/recuperar-tenant.ts.
 *
 * USO
 *   # 1. Simulación (no escribe nada): qué hay en el respaldo y qué falta en el destino
 *   node --env-file=<archivo.env> scripts/recuperar-tenant.ts <carpeta-o-archivo.json.gz> <slug-del-tenant>
 *
 *   # 2. Aplicar de verdad
 *   node --env-file=<archivo.env> scripts/recuperar-tenant.ts <carpeta-o-archivo.json.gz> <slug> --aplicar
 *
 * El respaldo puede ser:
 *   - una carpeta (la que deja scripts/descifrar-respaldo.ts o scripts/backup-db.ts), o
 *   - un archivo .json.gz SIN cifrar: el adjunto del correo de respaldo diario
 *     de antes del 2026-09-16 (cuando aún no se cifraba ni se subía a Blob).
 * El destino es DATABASE_URL del .env que se pase. Sobre PRODUCCIÓN, --aplicar
 * exige además CONFIRMO_RECUPERAR=<slug>, para que no se pueda hacer por accidente.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { gunzipSync } from "node:zlib";
import { recuperarTenant, fuenteCarpeta, fuenteVolcado, type FuenteRespaldo } from "../src/lib/recuperar-tenant.ts";

const SERVIDOR_PRODUCCION = "ep-holy-leaf";

const [carpeta, slug] = process.argv.slice(2).filter(a => !a.startsWith("--"));
const aplicar = process.argv.includes("--aplicar");

if (!carpeta || !slug) {
  console.error("Uso: node --env-file=<archivo.env> scripts/recuperar-tenant.ts <carpeta-respaldo> <slug> [--aplicar]");
  process.exit(1);
}

const destino = process.env.DATABASE_URL ?? "";
const servidor = destino.split("@")[1]?.split(".")[0] ?? "(desconocido)";
const esProduccion = destino.includes(SERVIDOR_PRODUCCION);

/** Abre el respaldo: carpeta, o .json.gz del correo ({ fecha, datos: { <tabla>: filas } }). */
function abrirRespaldo(origen: string): { fuente: FuenteRespaldo; fecha: string } {
  if (fs.statSync(origen).isDirectory()) {
    let fecha = "";
    try { fecha = JSON.parse(fs.readFileSync(path.join(origen, "_resumen.json"), "utf8")).fecha ?? ""; } catch { /* opcional */ }
    return { fuente: fuenteCarpeta(origen), fecha };
  }
  const volcado = JSON.parse(gunzipSync(fs.readFileSync(origen)).toString("utf8")) as {
    fecha: string;
    datos: Record<string, Record<string, unknown>[]>;
  };
  return { fuente: fuenteVolcado(volcado.datos), fecha: volcado.fecha };
}

async function main() {
  const { fuente, fecha } = abrirRespaldo(carpeta);
  const tenants = fuente(Prisma.dmmf.datamodel.models.find(m => m.name === "Tenant")!) as { id: string; slug: string; nombre: string }[];
  const enRespaldo = tenants.find(t => t.slug === slug);
  if (!enRespaldo) {
    console.error(`El tenant '${slug}' no está en el respaldo.`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const enDestino = await prisma.tenant.findUnique({ where: { id: enRespaldo.id }, select: { slug: true } });
  if (!enDestino) {
    console.error(`El tenant '${slug}' (id ${enRespaldo.id}) no existe en el destino (${servidor}).`);
    process.exit(1);
  }

  if (aplicar && esProduccion && process.env.CONFIRMO_RECUPERAR !== slug) {
    console.error(`El destino es PRODUCCIÓN. Para aplicar, agrega CONFIRMO_RECUPERAR=${slug}`);
    process.exit(1);
  }

  console.log(`Respaldo : ${carpeta}${fecha ? ` (del ${fecha})` : ""}`);
  console.log(`Destino  : ${servidor}${esProduccion ? "  ← PRODUCCIÓN" : ""}`);
  console.log(`Tenant   : ${enRespaldo.nombre} (${slug})`);
  console.log(`Modo     : ${aplicar ? "APLICAR (agrega lo que falta)" : "SIMULACIÓN (no escribe nada)"}\n`);

  const r = await recuperarTenant(prisma, fuente, enRespaldo.id, { aplicar });

  console.log("Tabla".padEnd(22) + "Respaldo".padStart(10) + "Ya están".padStart(10) + (aplicar ? "Insertadas".padStart(12) + "Fallidas".padStart(10) : "Faltan".padStart(10)));
  for (const [nombre, m] of Object.entries(r.modelos).sort()) {
    const faltan = m.enRespaldo - m.yaExisten;
    console.log(
      nombre.padEnd(22) + String(m.enRespaldo).padStart(10) + String(m.yaExisten).padStart(10) +
      (aplicar ? String(m.insertadas).padStart(12) + String(m.fallidas.length).padStart(10) : String(faltan).padStart(10)),
    );
  }
  const fallidas = Object.entries(r.modelos).flatMap(([n, m]) => m.fallidas.map(f => `  ${n} ${String(f.id)}: ${f.error}`));
  if (fallidas.length) {
    console.log(`\n${fallidas.length} registro(s) no se pudieron recuperar:`);
    console.log(fallidas.slice(0, 30).join("\n"));
  }
  if (!aplicar) console.log("\nNada se escribió. Para aplicar, repite con --aplicar.");

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
