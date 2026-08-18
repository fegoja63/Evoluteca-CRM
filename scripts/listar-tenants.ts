// SOLO LECTURA — lista los tenants con su nº de clientes activos creados en 2026.
// node --env-file=.env.produccion.ref scripts/listar-tenants.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, nombre: true, slug: true } });
  const inicio = new Date(Date.UTC(2026, 0, 1));
  const fin = new Date(Date.UTC(2027, 0, 1));
  console.log("\n=== Tenants (solo lectura) ===\n");
  for (const t of tenants) {
    const total = await prisma.empresa.count({ where: { tenantId: t.id, eliminadoEn: null } });
    const en2026 = await prisma.empresa.count({ where: { tenantId: t.id, eliminadoEn: null, creadoEn: { gte: inicio, lt: fin } } });
    console.log(`- ${t.nombre}  (slug: ${t.slug})`);
    console.log(`    clientes activos: ${total}  ·  creados en 2026: ${en2026}`);
  }
  console.log("");
}

main().catch(console.error).finally(() => prisma.$disconnect());
