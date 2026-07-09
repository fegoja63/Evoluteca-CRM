/**
 * Corrige el título de las oportunidades ya existentes en el tenant
 * "Demo Teatro" para que no incluyan el nombre de la empresa (ej.
 * "Congreso anual — Banco Regional del Norte" → "Congreso anual").
 *
 * A diferencia de scripts/seed-demo-teatro.ts, este script NO borra ni
 * recrea nada — solo actualiza el campo `titulo` de las oportunidades
 * existentes. No toca usuarios ni contraseñas: hay personas probando
 * la plataforma con esa cuenta ahora mismo y no se puede reiniciar.
 *
 * Ejecutar con:
 *   npx tsx scripts/fix-titulos-oportunidad-demo-teatro.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-teatro" } });
  if (!tenant) {
    console.log("No existe el tenant 'demo-teatro'. Nada que corregir.");
    return;
  }

  const oportunidades = await prisma.oportunidad.findMany({
    where: { tenantId: tenant.id, titulo: { contains: " — " } },
    select: { id: true, titulo: true },
  });

  console.log(`Oportunidades con nombre de empresa en el título: ${oportunidades.length}`);

  for (const op of oportunidades) {
    const nuevoTitulo = op.titulo.split(" — ")[0];
    await prisma.oportunidad.update({ where: { id: op.id }, data: { titulo: nuevoTitulo } });
    console.log(`  "${op.titulo}" → "${nuevoTitulo}"`);
  }

  console.log(`\n✅ ${oportunidades.length} oportunidades corregidas. Usuarios y demás datos intactos.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
