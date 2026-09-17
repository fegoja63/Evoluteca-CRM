// Renombra un tenant (solo el nombre visible; NO cambia el slug).
//
// Seguridad: por defecto corre en modo VISTA PREVIA — muestra el cambio y NO
// escribe nada. Solo renombra si se pasa la bandera --confirmar.
//
// Uso:
//   1) Ver el cambio (no escribe):
//      node --env-file=.env.produccion.ref scripts/renombrar-tenant.ts empresa-de-prueba-0q4t7 "Evoluteca"
//   2) Renombrar de verdad:
//      node --env-file=.env.produccion.ref scripts/renombrar-tenant.ts empresa-de-prueba-0q4t7 "Evoluteca" --confirmar
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const nuevoNombre = process.argv[3];
  const confirmar = process.argv.includes("--confirmar");
  if (!slug || !nuevoNombre) {
    console.error('Uso: node --env-file=<env> scripts/renombrar-tenant.ts <slug> "<nuevo nombre>" [--confirmar]');
    process.exit(1);
  }

  const t = await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true, slug: true } });
  if (!t) { console.error(`✗ No existe ningún tenant con slug "${slug}".`); process.exit(1); }

  console.log(`\nTenant: slug ${t.slug}`);
  console.log(`  Nombre actual: "${t.nombre}"`);
  console.log(`  Nombre nuevo:  "${nuevoNombre}"`);

  if (!confirmar) {
    console.log(`\n👀 VISTA PREVIA — no se cambió nada.`);
    console.log(`   Para APLICAR, vuelve a correrlo agregando  --confirmar\n`);
    return;
  }

  await prisma.tenant.update({ where: { id: t.id }, data: { nombre: nuevoNombre } });
  console.log(`\n✓ Renombrado: "${t.nombre}" → "${nuevoNombre}" (slug ${t.slug} sin cambios).\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
