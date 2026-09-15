/**
 * Normaliza la fecha de cierre de las oportunidades CERRADAS (GANADA/PERDIDA)
 * históricas: usa el día REAL en que se cerraron (el último CambioEtapa a esa
 * etapa) en vez de la fecha estimada de cierre. El día que se gana o se pierde
 * es el que debe contabilizarse. Alinea el histórico con el arreglo de la API
 * que ya lo hace para los negocios nuevos.
 *
 * Fuente de la fecha real, en orden:
 *   1) último CambioEtapa con etapaNueva = la etapa del negocio (GANADA/PERDIDA).
 *   2) si no hay ese registro y la fechaCierre actual es FUTURA (imposible: no se
 *      gana ni se pierde "mañana"), se cae a creadoEn (mejor aproximación pasada).
 *   3) si no hay registro y la fecha no es futura, se deja como está (p. ej.
 *      importaciones históricas con su fecha real ya puesta).
 *
 * SEGURIDAD
 *  - Simulación por defecto: solo escribe con --aplicar.
 *  - Guardarraíl: con --prod exige DATABASE_URL de producción (ep-holy-leaf).
 *  - Reversible: guarda la fecha anterior en extras.__fechaCierreEstimadaPrev
 *    (solo si no existe ya), para poder deshacer.
 *  - Alcance: todos los tenants por defecto; --tenant <slug> para uno solo.
 *
 * USO (producción, simulación):
 *   export DATABASE_URL="$(grep '^DIRECT_URL=' .env.produccion.ref | sed -E 's/^DIRECT_URL=//; s/^\"//; s/\"$//')"
 *   npx tsx scripts/normalizar-perdidas.ts --prod
 *   npx tsx scripts/normalizar-perdidas.ts --prod --tenant demo-evoluteca --aplicar
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ahora = new Date();
const APLICAR = process.argv.includes("--aplicar");
const TENANT = (() => { const i = process.argv.indexOf("--tenant"); return i >= 0 ? process.argv[i + 1] : null; })();

function verificarEntorno() {
  const url = process.env.DATABASE_URL ?? "";
  const prod = process.argv.includes("--prod");
  if (prod && !url.includes("ep-holy-leaf")) { console.error("❌ --prod pero DATABASE_URL NO es producción (ep-holy-leaf). Abortado."); process.exit(1); }
  if (!prod && !url.includes("ep-muddy-tree")) { console.error("❌ DATABASE_URL no es desarrollo. Usa --prod para producción. Abortado."); process.exit(1); }
  console.log(`🔗 ${url.includes("ep-holy-leaf") ? "PRODUCCIÓN" : "desarrollo"} · modo: ${APLICAR ? "APLICAR (escribe)" : "SIMULACIÓN (no escribe)"}${TENANT ? ` · tenant: ${TENANT}` : " · TODOS los tenants"}`);
}

const fmt = (d: Date | null) => d ? d.toISOString().slice(0, 10) : "(sin fecha)";

async function main() {
  verificarEntorno();

  const whereTenant = TENANT ? { tenant: { slug: TENANT } } : {};
  const cerradas = await prisma.oportunidad.findMany({
    where: { etapa: { in: ["GANADA", "PERDIDA"] }, eliminadoEn: null, ...whereTenant },
    select: {
      id: true, titulo: true, etapa: true, fechaCierre: true, creadoEn: true, extras: true, tenantId: true,
      tenant: { select: { slug: true } },
      cambiosEtapa: { where: { etapaNueva: { in: ["GANADA", "PERDIDA"] } }, orderBy: { creadoEn: "desc" }, take: 5, select: { creadoEn: true, etapaNueva: true } },
    },
  });

  let cambiarian = 0, futuras = 0, sinFuente = 0;
  const porTenant: Record<string, number> = {};

  for (const o of cerradas) {
    // Transición real a la etapa ACTUAL del negocio (la más reciente).
    const cierreTransition = o.cambiosEtapa.find(c => c.etapaNueva === o.etapa)?.creadoEn ?? null;
    const esFutura = !!o.fechaCierre && o.fechaCierre > ahora;
    if (esFutura) futuras++;

    let nueva: Date | null = null;
    if (cierreTransition) nueva = cierreTransition;
    else if (esFutura) nueva = o.creadoEn; // no hay registro y la fecha es imposible: usa creación
    else { sinFuente++; continue; } // no hay forma de saber la fecha real y la actual no es absurda

    // ¿Cambia de verdad? (diferencia > 1 día)
    const actual = o.fechaCierre?.getTime() ?? 0;
    if (Math.abs(actual - nueva.getTime()) <= 86_400_000) continue;

    cambiarian++;
    porTenant[o.tenant.slug] = (porTenant[o.tenant.slug] || 0) + 1;
    if (cambiarian <= 15) {
      console.log(`  ${o.tenant.slug} · ${o.etapa} · "${o.titulo.slice(0, 30)}": ${fmt(o.fechaCierre)} -> ${fmt(nueva)}${esFutura ? "  (era futura)" : ""}`);
    }

    if (APLICAR) {
      const ext = (o.extras && typeof o.extras === "object" ? { ...(o.extras as Record<string, unknown>) } : {}) as Record<string, unknown>;
      if (ext.__fechaCierreEstimadaPrev === undefined) ext.__fechaCierreEstimadaPrev = o.fechaCierre ? o.fechaCierre.toISOString() : null;
      await prisma.oportunidad.update({ where: { id: o.id }, data: { fechaCierre: nueva, extras: ext } });
    }
  }

  console.log(`\n📊 Cerradas revisadas: ${cerradas.length} · a normalizar: ${cambiarian} · con fecha futura: ${futuras} · sin fuente de fecha real (se dejan): ${sinFuente}`);
  if (Object.keys(porTenant).length) {
    console.log("Por tenant (a cambiar):");
    for (const [k, v] of Object.entries(porTenant).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}`);
  }
  console.log(APLICAR ? "\n✅ Cambios APLICADOS." : "\nℹ️  Simulación: no se escribió nada. Agrega --aplicar para ejecutar.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
