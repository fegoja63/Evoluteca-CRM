// ============================================================================
//  ANÁLISIS (SOLO LECTURA) — "clientes nuevos" inflados por la importación.
//
//  Los clientes cargados por Excel quedaron con creadoEn = fecha de import
//  (hoy), así que cuentan como "nuevos" del año en curso aunque tengan
//  negocios/cotizaciones de años anteriores.
//
//  Este script NO modifica nada. Solo lee (findMany) y reporta, por cada
//  cliente cuyo creadoEn cae en el AÑO_SOSPECHA, la fecha real más antigua
//  encontrada en sus negocios (fechaEvento / fechaCierre) y cotizaciones
//  (fechaEvento), y a qué año se corregiría.
//
//  Correr contra PRODUCCIÓN (solo lectura):
//    node --env-file=.env.produccion.ref scripts/analizar-cliente-desde.ts [AÑO]
//  Contra desarrollo:
//    node --env-file=.env scripts/analizar-cliente-desde.ts [AÑO]
// ============================================================================
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ANIO_SOSPECHA = Number(process.argv[2] ?? new Date().getFullYear());
const INICIO_ANIO = new Date(Date.UTC(ANIO_SOSPECHA, 0, 1));
const FIN_ANIO = new Date(Date.UTC(ANIO_SOSPECHA + 1, 0, 1));

function fechaValida(d: Date | null | undefined): Date | null {
  if (!d) return null;
  const t = new Date(d);
  if (isNaN(t.getTime())) return null;
  // Descarta fechas absurdas (antes de 1990 o en el futuro).
  if (t.getUTCFullYear() < 1990 || t.getTime() > Date.now()) return null;
  return t;
}

// Busca un año de 4 dígitos (1990..año en curso) dentro de los valores de extras.
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
  console.log(`\n=== Análisis de "clientes nuevos" para el año ${ANIO_SOSPECHA} (SOLO LECTURA) ===\n`);

  const empresas = await prisma.empresa.findMany({
    where: { eliminadoEn: null },
    select: {
      id: true, nombre: true, creadoEn: true, tenantId: true,
      oportunidades: { where: { eliminadoEn: null }, select: { fechaEvento: true, fechaCierre: true, extras: true } },
      cotizaciones: { where: { eliminadoEn: null }, select: { fechaEvento: true } },
    },
  });

  const tenants = new Set(empresas.map(e => e.tenantId));
  console.log(`Empresas activas totales: ${empresas.length}  ·  Tenants: ${tenants.size}`);

  const enAnio = empresas.filter(e => e.creadoEn >= INICIO_ANIO && e.creadoEn < FIN_ANIO);
  console.log(`Clientes con creadoEn en ${ANIO_SOSPECHA}: ${enAnio.length}\n`);

  // ¿Están "clavados" en pocos días? (señal de import masivo)
  const dias = new Map<string, number>();
  for (const e of enAnio) {
    const k = e.creadoEn.toISOString().slice(0, 10);
    dias.set(k, (dias.get(k) ?? 0) + 1);
  }
  const diasTop = Array.from(dias.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("Días de creación más frecuentes (posibles importaciones):");
  for (const [d, n] of diasTop) console.log(`   ${d}: ${n} clientes`);
  console.log("");

  let conEvidenciaFecha = 0;
  let soloExtras = 0;
  let sinEvidencia = 0;
  const porAnioCorregido = new Map<number, number>();
  const ejemplos: string[] = [];

  for (const e of enAnio) {
    const candidatas: Date[] = [];
    for (const o of e.oportunidades) {
      const fe = fechaValida(o.fechaEvento); if (fe) candidatas.push(fe);
      const fc = fechaValida(o.fechaCierre); if (fc) candidatas.push(fc);
    }
    for (const c of e.cotizaciones) {
      const fe = fechaValida(c.fechaEvento); if (fe) candidatas.push(fe);
    }

    let masAntigua: Date | null = candidatas.length ? candidatas.reduce((a, b) => (b < a ? b : a)) : null;

    // Evidencia por fecha estructurada anterior al año en curso.
    if (masAntigua && masAntigua < INICIO_ANIO) {
      conEvidenciaFecha++;
      const y = masAntigua.getUTCFullYear();
      porAnioCorregido.set(y, (porAnioCorregido.get(y) ?? 0) + 1);
      if (ejemplos.length < 12) ejemplos.push(`   "${e.nombre}"  →  ${masAntigua.toISOString().slice(0, 10)} (año ${y})`);
      continue;
    }

    // Si no hay fecha estructurada, mira años dentro de extras.
    let anioExtras: number | null = null;
    for (const o of e.oportunidades) {
      const y = anioEnExtras(o.extras);
      if (y && (anioExtras === null || y < anioExtras)) anioExtras = y;
    }
    if (anioExtras && anioExtras < ANIO_SOSPECHA) {
      soloExtras++;
      porAnioCorregido.set(anioExtras, (porAnioCorregido.get(anioExtras) ?? 0) + 1);
      continue;
    }

    sinEvidencia++;
  }

  console.log("── Resultado de la corrección propuesta ──");
  console.log(`Clientes que se corregirían por FECHA real (evento/cierre/cotización): ${conEvidenciaFecha}`);
  console.log(`Clientes que se corregirían solo por AÑO dentro de 'extras':          ${soloExtras}`);
  console.log(`Clientes SIN evidencia de actividad vieja (siguen como nuevos ${ANIO_SOSPECHA}): ${sinEvidencia}`);

  const total = conEvidenciaFecha + soloExtras;
  console.log(`\n→ En total se moverían fuera de "${ANIO_SOSPECHA}" unos ${total} clientes.\n`);

  if (porAnioCorregido.size) {
    console.log("Distribución por año corregido:");
    for (const [y, n] of Array.from(porAnioCorregido.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`   ${y}: ${n} clientes`);
    }
    console.log("");
  }

  if (ejemplos.length) {
    console.log("Ejemplos (por fecha estructurada):");
    ejemplos.forEach(x => console.log(x));
    console.log("");
  }

  console.log("(No se modificó nada. Este script es solo de lectura.)\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
