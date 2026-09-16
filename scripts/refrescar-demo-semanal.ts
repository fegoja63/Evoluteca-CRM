// Corre a mano el refresco de actividad de la cuenta demo (la misma lógica que
// el cron /api/cron/demo-semanal). Útil para poblar la primera vez o para probar.
//
// Uso (desarrollo, base por defecto de .env):
//   node --env-file=.env scripts/refrescar-demo-semanal.ts
//   node --env-file=.env scripts/refrescar-demo-semanal.ts demo-evoluteca
//
// Para producción, apuntar DATABASE_URL a la rama "production" de Neon:
//   node --env-file=.env.produccion.ref scripts/refrescar-demo-semanal.ts demo-evoluteca

import { PrismaClient } from "@prisma/client";
import { refrescarDemoSemanal } from "../src/lib/demo-semanal.ts";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || "demo-evoluteca";
  const r = await refrescarDemoSemanal(prisma, slug);
  if (!r.ok) { console.error("✗", r.error); process.exit(1); }
  console.log(`✓ Demo "${r.tenant}" refrescado:`);
  console.log(`  Actividades: +${r.actividadesCreadas} (borró ${r.actividadesBorradas} de relleno anterior)`);
  console.log(`  Propuestas:  +${r.propuestasCreadas} (borró ${r.propuestasBorradas} de relleno anterior)`);
  console.log(`  Ganados mes: +${r.ganadosCreados} (borró ${r.ganadosBorrados} de relleno anterior)`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
