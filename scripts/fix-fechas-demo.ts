// Actualiza fechaCierre del demo para distribuirlas en meses distintos
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fecha(anio: number, mes: number, dia: number) {
  return new Date(anio, mes - 1, dia);
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("Tenant demo no encontrado"); return; }

  const ops = await prisma.oportunidad.findMany({
    where: { tenantId: tenant.id },
    orderBy: { creadoEn: "asc" },
    select: { id: true, titulo: true },
  });

  console.log(`Actualizando ${ops.length} oportunidades...`);

  // Fechas distribuidas manualmente — 6 meses (mayo-octubre 2026)
  const fechas = [
    fecha(2026,5,8),   fecha(2026,5,15),  fecha(2026,5,22),  fecha(2026,5,28),
    fecha(2026,6,5),   fecha(2026,6,12),  fecha(2026,6,18),  fecha(2026,6,25),
    fecha(2026,7,3),   fecha(2026,7,10),  fecha(2026,7,17),  fecha(2026,7,24),
    fecha(2026,7,30),
    fecha(2026,8,6),   fecha(2026,8,13),  fecha(2026,8,20),  fecha(2026,8,27),
    fecha(2026,9,3),   fecha(2026,9,10),  fecha(2026,9,17),  fecha(2026,9,24),
    fecha(2026,10,1),  fecha(2026,10,8),  fecha(2026,10,15), fecha(2026,10,22),
    fecha(2026,10,29),
    fecha(2026,5,10),  fecha(2026,5,20),  fecha(2026,6,8),   fecha(2026,6,22),
    fecha(2026,7,7),   fecha(2026,7,14),  fecha(2026,7,21),  fecha(2026,7,28),
    fecha(2026,8,4),   fecha(2026,8,11),  fecha(2026,8,18),  fecha(2026,8,25),
    fecha(2026,9,1),   fecha(2026,9,8),   fecha(2026,9,15),  fecha(2026,9,22),
    fecha(2026,10,6),  fecha(2026,10,13), fecha(2026,10,20), fecha(2026,10,27),
    fecha(2026,5,12),  fecha(2026,6,3),   fecha(2026,7,9),   fecha(2026,8,7),
    fecha(2026,9,5),   fecha(2026,10,3),  fecha(2026,5,25),  fecha(2026,6,16),
    fecha(2026,7,22),  fecha(2026,8,19),  fecha(2026,9,16),  fecha(2026,10,14),
    fecha(2026,5,30),  fecha(2026,6,28),
  ];

  for (let i = 0; i < ops.length; i++) {
    const fc = fechas[i % fechas.length];
    await prisma.oportunidad.update({
      where: { id: ops[i].id },
      data: { fechaCierre: fc },
    });
  }

  console.log("✓ Fechas de cierre actualizadas. Distribución:");
  const meses = ["May","Jun","Jul","Ago","Sep","Oct"];
  for (let m = 5; m <= 10; m++) {
    const count = fechas.slice(0, ops.length).filter(f => f.getMonth() + 1 === m).length;
    // re-count from assigned
    const asignadas = ops.map((_, i) => fechas[i % fechas.length]).filter(f => f.getMonth() + 1 === m).length;
    console.log(`  ${meses[m-5]} 2026: ${asignadas} oportunidades`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
