// Normaliza motivos de pérdida incoherentes en el demo de servicios:
//  - "Precio"                    → "Precio muy alto"  (fusiona duplicado)
//  - "El evento fue cancelado"   → "Eligió a la competencia"  (motivo de evento, no aplica a servicios)
//  - "Fuera de fechas disponibles" → "Sin respuesta del cliente"  (motivo de evento, no aplica)
//
// Ejecutar con: npx tsx scripts/limpia-motivos-perdida-demo.ts
// Idempotente: si ya no quedan valores viejos, no hace nada.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const REEMPLAZOS: { de: string; a: string }[] = [
  { de: "Precio",                    a: "Precio muy alto" },
  { de: "El evento fue cancelado",   a: "Eligió a la competencia" },
  { de: "Fuera de fechas disponibles", a: "Sin respuesta del cliente" },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("❌ Tenant demo no encontrado."); return; }

  let totalCambios = 0;
  for (const { de, a } of REEMPLAZOS) {
    const res = await prisma.oportunidad.updateMany({
      where: { tenantId: tenant.id, motivoPerdida: de },
      data: { motivoPerdida: a },
    });
    if (res.count > 0) console.log(`  ✓ "${de}"  →  "${a}"  (${res.count})`);
    totalCambios += res.count;
  }

  if (totalCambios === 0) console.log("Nada que limpiar: no quedaban motivos viejos.");
  else console.log(`\nTotal normalizado: ${totalCambios} oportunidad(es).`);

  // Desglose final
  const todas = await prisma.oportunidad.findMany({
    where: { tenantId: tenant.id, etapa: "PERDIDA" },
    select: { motivoPerdida: true },
  });
  const conteo = new Map<string, number>();
  for (const o of todas) {
    const k = o.motivoPerdida?.trim() || "Sin especificar";
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  console.log("\nDesglose final de motivos de pérdida en el demo:");
  for (const [motivo, n] of [...conteo].sort((x, y) => y[1] - x[1])) console.log(`  ${motivo}: ${n}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
