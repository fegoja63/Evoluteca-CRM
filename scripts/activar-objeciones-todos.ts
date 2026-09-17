import { PrismaClient } from "@prisma/client";

// Activa el módulo "Manejo de objeciones" en TODOS los tenants (aparece la
// pestaña Objeciones). Idempotente: conserva los demás módulos y se salta los
// que ya lo tienen activo. No carga objeciones — cada tenant las agrega/precarga
// cuando quiera desde la propia pestaña.
//
// Uso:  node --env-file=<env> scripts/activar-objeciones-todos.ts
const p = new PrismaClient();

async function main() {
  const tenants = await p.tenant.findMany({ select: { id: true, nombre: true, modulos: true } });
  let activados = 0, yaEstaban = 0;
  for (const t of tenants) {
    const mod = (t.modulos as Record<string, unknown>) ?? {};
    if (mod.objeciones === true) { yaEstaban++; continue; }
    await p.tenant.update({ where: { id: t.id }, data: { modulos: { ...mod, objeciones: true } } });
    console.log(`  ✓ ${t.nombre}`);
    activados++;
  }
  console.log(`\nListo. Activados: ${activados} · ya estaban: ${yaEstaban} · total tenants: ${tenants.length}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
