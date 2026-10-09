/**
 * Repara "dueños fantasma": registros cuyo creadoBy apunta a un usuario que ya
 * no existe en su tenant (lo dejaba el `revertir` de seed-demo-completo, que
 * borraba vendedores sin traspasar lo suyo).
 *
 * Los deja sin dueño (creadoBy = null), exactamente como "Eliminar usuario" en
 * la app: así vuelven a aparecer en el panel "asignar sin dueño" de Equipo.
 * Tablas: las de src/lib/traspaso-registros.ts (TABLAS_CON_DUENO).
 *
 * Uso (por defecto SOLO muestra lo que cambiaría):
 *   npx tsx --env-file=.env scripts/reparar-duenos-huerfanos.ts
 *   npx tsx --env-file=.env scripts/reparar-duenos-huerfanos.ts --aplicar
 *   ... --prod   para producción a propósito (DATABASE_URL debe ser ep-holy-leaf)
 */
import { PrismaClient } from "@prisma/client";
import { TABLAS_CON_DUENO, operacionesTraspaso } from "../src/lib/traspaso-registros";

const prisma = new PrismaClient();
const APLICAR = process.argv.includes("--aplicar");

function verificarEntorno() {
  const url = process.env.DATABASE_URL ?? "";
  const prod = process.argv.includes("--prod");
  if (prod && !url.includes("ep-holy-leaf")) { console.error("❌ --prod pero DATABASE_URL NO es producción (ep-holy-leaf). Abortado."); process.exit(1); }
  if (!prod && !url.includes("ep-muddy-tree")) { console.error("❌ DATABASE_URL no es desarrollo (ep-muddy-tree). Usa --prod para producción a propósito. Abortado."); process.exit(1); }
  console.log(`🔗 Entorno: ${prod ? "PRODUCCIÓN (ep-holy-leaf)" : "desarrollo (ep-muddy-tree)"} · ${APLICAR ? "APLICANDO cambios" : "solo lectura (usa --aplicar para escribir)"}`);
}

type Grupo = { tenantId: string; creadoBy: string | null; _count: number };

async function gruposPorDueno(tabla: (typeof TABLAS_CON_DUENO)[number]): Promise<Grupo[]> {
  const args = { by: ["tenantId", "creadoBy"] as ["tenantId", "creadoBy"], where: { creadoBy: { not: null } }, _count: true as const };
  switch (tabla) {
    case "empresa": return prisma.empresa.groupBy(args) as unknown as Promise<Grupo[]>;
    case "oportunidad": return prisma.oportunidad.groupBy(args) as unknown as Promise<Grupo[]>;
    case "actividad": return prisma.actividad.groupBy(args) as unknown as Promise<Grupo[]>;
    case "expediente": return prisma.expediente.groupBy(args) as unknown as Promise<Grupo[]>;
    case "terminoExpediente": return prisma.terminoExpediente.groupBy(args) as unknown as Promise<Grupo[]>;
  }
}

async function main() {
  verificarEntorno();
  const usuarios = await prisma.usuario.findMany({ select: { id: true, tenantId: true } });
  const existe = new Set(usuarios.map(u => `${u.tenantId}:${u.id}`));
  const tenants = new Map((await prisma.tenant.findMany({ select: { id: true, nombre: true, slug: true } })).map(t => [t.id, t]));

  // tenantId → ids huérfanos (en cualquiera de las tablas)
  const huerfanos = new Map<string, Set<string>>();
  for (const tabla of TABLAS_CON_DUENO) {
    for (const g of await gruposPorDueno(tabla)) {
      if (!g.creadoBy || existe.has(`${g.tenantId}:${g.creadoBy}`)) continue;
      const t = tenants.get(g.tenantId);
      console.log(`   ${tabla.padEnd(18)} ${String(g._count).padStart(5)}  dueño ${g.creadoBy.slice(0, 8)}…  tenant ${t?.slug ?? g.tenantId}`);
      if (!huerfanos.has(g.tenantId)) huerfanos.set(g.tenantId, new Set());
      huerfanos.get(g.tenantId)!.add(g.creadoBy);
    }
  }

  if (huerfanos.size === 0) { console.log("✅ No hay dueños fantasma."); return; }
  if (!APLICAR) { console.log("ℹ️  Nada escrito. Repite con --aplicar para dejarlos sin dueño."); return; }

  for (const [tenantId, ids] of huerfanos) {
    const r = await prisma.$transaction([...operacionesTraspaso(prisma, tenantId, [...ids], null)]);
    const total = r.reduce((a, x) => a + x.count, 0);
    console.log(`✅ ${tenants.get(tenantId)?.slug ?? tenantId}: ${total} registros quedaron sin dueño (${ids.size} usuario(s) inexistente(s)).`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
