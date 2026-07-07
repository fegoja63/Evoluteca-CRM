// Distribuye creadoEn de oportunidades activas en los 4 rangos de antigüedad
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("Tenant demo no encontrado"); return; }

  const activas = await prisma.oportunidad.findMany({
    where: { tenantId: tenant.id, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] } },
    orderBy: { creadoEn: "asc" },
    select: { id: true },
  });

  console.log(`Distribuyendo ${activas.length} oportunidades activas en 4 rangos...`);

  // Distribuir: ~25% en cada rango
  // < 30 días: índices 0-10
  // 30-60 días: índices 11-21
  // 61-90 días: índices 22-32
  // +90 días:  índices 33+
  const asignaciones: { id: string; dias: number }[] = activas.map((o, i) => {
    let dias: number;
    if (i < 11)      dias = 5  + (i * 2);          // 5d, 7d, 9d... hasta ~25d
    else if (i < 22) dias = 32 + ((i - 11) * 3);   // 32d, 35d, 38d... hasta ~62d
    else if (i < 33) dias = 63 + ((i - 22) * 3);   // 63d, 66d, 69d... hasta ~93d
    else             dias = 95 + ((i - 33) * 5);   // 95d, 100d, 105d...
    return { id: o.id, dias };
  });

  for (const { id, dias } of asignaciones) {
    await prisma.oportunidad.update({
      where: { id },
      data: { creadoEn: diasAtras(dias) },
    });
  }

  console.log("✓ Distribución completada:");
  console.log(`  < 30 días:  ${asignaciones.filter(a => a.dias < 30).length} oportunidades`);
  console.log(`  30-60 días: ${asignaciones.filter(a => a.dias >= 30 && a.dias <= 60).length} oportunidades`);
  console.log(`  61-90 días: ${asignaciones.filter(a => a.dias >= 61 && a.dias <= 90).length} oportunidades`);
  console.log(`  +90 días:   ${asignaciones.filter(a => a.dias > 90).length} oportunidades`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
