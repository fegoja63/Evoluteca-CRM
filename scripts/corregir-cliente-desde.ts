// ============================================================================
//  CORRECCIÓN de creadoEn de clientes inflados por la importación.
//
//  Regla: para cada cliente de los tenants indicados, se busca la fecha real
//  más antigua entre sus negocios (fechaEvento / fechaCierre) y cotizaciones
//  (fechaEvento). Si esa fecha es de un AÑO ANTERIOR a 2026, se pone como su
//  creadoEn. Si no hay fecha estructurada, se usa como respaldo el año más
//  antiguo hallado dentro de 'extras' (→ 1-ene de ese año).
//
//  - Solo mueve la fecha HACIA ATRÁS (a un año anterior a 2026).
//  - Los clientes sin evidencia de actividad vieja NO se tocan.
//  - Idempotente: correrlo dos veces no vuelve a mover nada.
//
//  Por defecto es ENSAYO (dry-run): no escribe. Para aplicar de verdad, pasar
//  --aplicar.
//
//  Uso:
//    node --env-file=.env.produccion.ref scripts/corregir-cliente-desde.ts --slugs=teatro-belarte-6m9dc,prueba-zyynj
//    node --env-file=.env.produccion.ref scripts/corregir-cliente-desde.ts --slugs=teatro-belarte-6m9dc,prueba-zyynj --aplicar
// ============================================================================
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const APLICAR = process.argv.includes("--aplicar");
const CORTE = new Date(Date.UTC(2026, 0, 1)); // solo se corrige a años ANTERIORES a 2026
const slugsArg = process.argv.find(a => a.startsWith("--slugs="));
const SLUGS = slugsArg ? slugsArg.replace("--slugs=", "").split(",").map(s => s.trim()).filter(Boolean) : [];

function fechaValida(d: Date | null | undefined): Date | null {
  if (!d) return null;
  const t = new Date(d);
  if (isNaN(t.getTime())) return null;
  if (t.getUTCFullYear() < 1990 || t.getTime() > Date.now()) return null;
  return t;
}

function anioEnExtras(extras: unknown): number | null {
  if (!extras || typeof extras !== "object") return null;
  const hoy = new Date().getUTCFullYear();
  let min: number | null = null;
  for (const v of Object.values(extras as Record<string, unknown>)) {
    const m = String(v ?? "").match(/\b(19[9]\d|20\d\d)\b/g);
    if (!m) continue;
    for (const s of m) {
      const y = Number(s);
      if (y >= 1990 && y <= hoy && (min === null || y < min)) min = y;
    }
  }
  return min;
}

async function main() {
  if (SLUGS.length === 0) { console.error("Falta --slugs=slug1,slug2"); return; }
  console.log(`\n=== Corrección de "cliente desde"  ${APLICAR ? "· APLICANDO CAMBIOS" : "· ENSAYO (no escribe)"} ===`);
  console.log(`Tenants: ${SLUGS.join(", ")}\n`);

  let totalCambios = 0;

  for (const slug of SLUGS) {
    const tenant = await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true } });
    if (!tenant) { console.log(`⚠ Tenant no encontrado: ${slug}\n`); continue; }

    const empresas = await prisma.empresa.findMany({
      where: { tenantId: tenant.id, eliminadoEn: null },
      select: {
        id: true, nombre: true, creadoEn: true,
        oportunidades: { where: { eliminadoEn: null }, select: { fechaEvento: true, fechaCierre: true, extras: true } },
        cotizaciones: { where: { eliminadoEn: null }, select: { fechaEvento: true } },
      },
    });

    const cambios: { id: string; nombre: string; de: Date; a: Date }[] = [];

    for (const e of empresas) {
      const fechas: Date[] = [];
      for (const o of e.oportunidades) {
        const fe = fechaValida(o.fechaEvento); if (fe) fechas.push(fe);
        const fc = fechaValida(o.fechaCierre); if (fc) fechas.push(fc);
      }
      for (const c of e.cotizaciones) {
        const fe = fechaValida(c.fechaEvento); if (fe) fechas.push(fe);
      }

      let nueva: Date | null = fechas.length ? fechas.reduce((a, b) => (b < a ? b : a)) : null;

      // Respaldo: año dentro de extras si no hay fecha estructurada anterior a 2026.
      if (!(nueva && nueva < CORTE)) {
        let anioExtras: number | null = null;
        for (const o of e.oportunidades) {
          const y = anioEnExtras(o.extras);
          if (y && (anioExtras === null || y < anioExtras)) anioExtras = y;
        }
        if (anioExtras && anioExtras < 2026) nueva = new Date(Date.UTC(anioExtras, 0, 1));
      }

      // Solo corrige si la evidencia es de un año anterior a 2026 y mueve hacia atrás.
      if (nueva && nueva < CORTE && nueva < e.creadoEn) {
        cambios.push({ id: e.id, nombre: e.nombre, de: e.creadoEn, a: nueva });
      }
    }

    console.log(`── ${tenant.nombre} (${slug}) ──`);
    console.log(`   Clientes activos: ${empresas.length}  ·  a corregir: ${cambios.length}`);
    const porAnio = new Map<number, number>();
    for (const c of cambios) porAnio.set(c.a.getUTCFullYear(), (porAnio.get(c.a.getUTCFullYear()) ?? 0) + 1);
    for (const [y, n] of Array.from(porAnio.entries()).sort((a, b) => a[0] - b[0])) console.log(`     → ${y}: ${n}`);
    cambios.slice(0, 6).forEach(c => console.log(`     ej: "${c.nombre}"  ${c.de.toISOString().slice(0, 10)} → ${c.a.toISOString().slice(0, 10)}`));

    if (APLICAR) {
      for (const c of cambios) {
        await prisma.empresa.update({ where: { id: c.id }, data: { creadoEn: c.a } });
      }
      console.log(`   ✓ Aplicados ${cambios.length} cambios.`);
    }
    console.log("");
    totalCambios += cambios.length;
  }

  console.log(`${APLICAR ? "✓ TOTAL aplicados" : "TOTAL que se aplicarían"}: ${totalCambios} clientes.`);
  if (!APLICAR) console.log("(Ensayo — no se modificó nada. Repite con --aplicar para escribir.)");
  console.log("");
}

main().catch(console.error).finally(() => prisma.$disconnect());
