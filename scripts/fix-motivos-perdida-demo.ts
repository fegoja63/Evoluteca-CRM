// Asigna un motivo de pérdida a las oportunidades PERDIDA del demo que estén
// sin motivo, para que el reporte "Motivos de pérdida" y los badges de la ficha
// muestren un desglose real en vez de un único "Sin especificar".
//
// Ejecutar con: npx tsx scripts/fix-motivos-perdida-demo.ts
//
// Los valores usados coinciden con la lista MOTIVOS_PERDIDA de la UI
// (src/app/dashboard/pipeline/[id]/page.tsx), evitando los motivos de tipo
// evento ("El evento fue cancelado", "Fuera de fechas disponibles") que no
// aplican a una empresa de servicios.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mapeo por palabra clave del título → motivo exacto de la lista de la UI.
const MAPEO: { clave: string; motivo: string }[] = [
  { clave: "ventas B2B",              motivo: "Precio muy alto" },
  { clave: "malla curricular",        motivo: "Eligió a la competencia" },
  { clave: "Diagnóstico organizacional Banco Regional", motivo: "Sin respuesta del cliente" },
  { clave: "Protocolo exportación",   motivo: "Presupuesto insuficiente" },
];

// Para cualquier otra PERDIDA sin motivo, rotar entre estos (todos de la lista real).
const RESPALDO = [
  "Precio muy alto",
  "Eligió a la competencia",
  "Sin respuesta del cliente",
  "Presupuesto insuficiente",
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("❌ Tenant demo no encontrado. Ejecuta seed-demo.ts primero."); return; }

  const perdidas = await prisma.oportunidad.findMany({
    where: {
      tenantId: tenant.id,
      etapa: "PERDIDA",
      OR: [{ motivoPerdida: null }, { motivoPerdida: "" }],
    },
    select: { id: true, titulo: true },
    orderBy: { titulo: "asc" },
  });

  if (perdidas.length === 0) {
    console.log("Nada que hacer: todas las oportunidades PERDIDA ya tienen motivo.");
    return;
  }

  console.log(`Asignando motivo a ${perdidas.length} oportunidad(es) perdida(s) sin motivo...\n`);

  let respaldoIdx = 0;
  for (const o of perdidas) {
    const match = MAPEO.find(m => o.titulo.toLowerCase().includes(m.clave.toLowerCase()));
    const motivo = match?.motivo ?? RESPALDO[respaldoIdx++ % RESPALDO.length];
    await prisma.oportunidad.update({ where: { id: o.id }, data: { motivoPerdida: motivo } });
    console.log(`  ✓ ${o.titulo}  →  ${motivo}`);
  }

  // Resumen del desglose resultante (todas las PERDIDA del tenant)
  const todas = await prisma.oportunidad.findMany({
    where: { tenantId: tenant.id, etapa: "PERDIDA" },
    select: { motivoPerdida: true },
  });
  const conteo = new Map<string, number>();
  for (const o of todas) {
    const k = o.motivoPerdida?.trim() || "Sin especificar";
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  console.log("\nDesglose de motivos de pérdida en el demo:");
  for (const [motivo, n] of conteo) console.log(`  ${motivo}: ${n}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
