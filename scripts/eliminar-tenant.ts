// Elimina PERMANENTEMENTE un tenant completo (empresa, contactos, oportunidades,
// actividades, cotizaciones, usuarios… todo en cascada). Irreversible.
//
// Seguridad: por defecto corre en modo VISTA PREVIA — muestra qué se borraría y
// NO borra nada. Solo borra si se pasa la bandera --confirmar.
//
// Uso:
//   1) Ver qué se borraría (no borra):
//      node --env-file=.env.produccion.ref scripts/eliminar-tenant.ts demo-teatro
//   2) Borrar de verdad:
//      node --env-file=.env.produccion.ref scripts/eliminar-tenant.ts demo-teatro --confirmar
//
// La base a la que apunta se toma de DATABASE_URL del --env-file indicado.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const confirmar = process.argv.includes("--confirmar");
  if (!slug) {
    console.error("Uso: node --env-file=<env> scripts/eliminar-tenant.ts <slug> [--confirmar]");
    process.exit(1);
  }

  const t = await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true, slug: true } });
  if (!t) { console.error(`✗ No existe ningún tenant con slug "${slug}".`); process.exit(1); }
  const T = t.id;

  const [empresas, contactos, oportunidades, actividades, cotizaciones, usuarios] = await Promise.all([
    prisma.empresa.count({ where: { tenantId: T } }),
    prisma.contacto.count({ where: { tenantId: T } }),
    prisma.oportunidad.count({ where: { tenantId: T } }),
    prisma.actividad.count({ where: { tenantId: T } }),
    prisma.cotizacion.count({ where: { tenantId: T } }),
    prisma.usuario.count({ where: { tenantId: T } }),
  ]);

  console.log(`\nTenant: ${t.nombre}  (slug: ${t.slug})`);
  console.log(`  Empresas:       ${empresas}`);
  console.log(`  Contactos:      ${contactos}`);
  console.log(`  Oportunidades:  ${oportunidades}`);
  console.log(`  Actividades:    ${actividades}`);
  console.log(`  Cotizaciones:   ${cotizaciones}`);
  console.log(`  Usuarios:       ${usuarios}`);

  if (!confirmar) {
    console.log(`\n👀 VISTA PREVIA — no se borró nada.`);
    console.log(`   Para BORRAR permanentemente, vuelve a correrlo agregando  --confirmar\n`);
    return;
  }

  console.log(`\n⚠️  Borrando PERMANENTEMENTE el tenant "${t.nombre}"…`);
  await prisma.tenant.delete({ where: { id: T } });
  console.log(`✓ Tenant "${t.nombre}" (${slug}) eliminado por completo.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
