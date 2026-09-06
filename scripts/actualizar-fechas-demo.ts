// Mantiene "fresca" una cuenta demo desplazando TODAS sus fechas hacia adelante
// un número de meses, conservando la historia (huecos, pasado/futuro, año contra
// año). Pensado para cuando la demo empieza a verse desactualizada.
//
// Desplaza también las metas de venta mensuales (que van por año/mes fijo, no por
// fecha) para que el mes pico siga alineado con el "mes actual" de la demo.
//
// Uso:
//   node --env-file=.env scripts/actualizar-fechas-demo.ts <slug> <meses>
// Ejemplo (correr la demo general 1 mes hacia adelante):
//   node --env-file=.env scripts/actualizar-fechas-demo.ts demo-evoluteca 1
//
// La base a la que apunta se toma de DATABASE_URL (por defecto, desarrollo).
// Para aplicar a producción se sobreescribe esa variable al invocar el script.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const meses = Number(process.argv[3]);

  if (!slug || !Number.isInteger(meses)) {
    console.error("Uso: node --env-file=.env scripts/actualizar-fechas-demo.ts <slug> <meses>");
    process.exit(1);
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug }, select: { id: true, nombre: true } });
  if (!tenant) { console.error(`No existe el tenant con slug "${slug}"`); process.exit(1); }
  const T = tenant.id;
  const iv = `interval '${meses} month'`; // `meses` ya es entero validado: seguro interpolar

  console.log(`Tenant: ${tenant.nombre} (${slug}) — desplazando +${meses} mes(es)\n`);

  // Todo dentro de una transacción: o se aplica completo, o no se aplica nada.
  // Timeout amplio porque son varias sentencias sobre Neon (latencia + posible
  // arranque en frío); el default de 5 s se queda corto.
  await prisma.$transaction(async (tx) => {
    const q = (sql: string) => tx.$executeRawUnsafe(sql);

    // Cada columna de fecha, acotada al tenant. NULL + interval = NULL (seguro).
    await q(`UPDATE "actividades"      SET "fecha"="fecha"+${iv}, "creadoEn"="creadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "oportunidades"    SET "creadoEn"="creadoEn"+${iv}, "fechaCierre"="fechaCierre"+${iv}, "fechaEvento"="fechaEvento"+${iv}, "eliminadoEn"="eliminadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "cotizaciones"     SET "creadoEn"="creadoEn"+${iv}, "fechaEvento"="fechaEvento"+${iv}, "fechaValidez"="fechaValidez"+${iv}, "eliminadoEn"="eliminadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "empresas"         SET "creadoEn"="creadoEn"+${iv}, "eliminadoEn"="eliminadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "contactos"        SET "creadoEn"="creadoEn"+${iv}, "eliminadoEn"="eliminadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "eventos_timeline" SET "creadoEn"="creadoEn"+${iv} WHERE "tenantId"='${T}'`);
    await q(`UPDATE "adjuntos"         SET "creadoEn"="creadoEn"+${iv} WHERE "tenantId"='${T}'`);
    // cambios_etapa no tiene tenantId: se acota por la oportunidad a la que pertenece.
    await q(`UPDATE "cambios_etapa"    SET "creadoEn"="creadoEn"+${iv} WHERE "oportunidadId" IN (SELECT id FROM "oportunidades" WHERE "tenantId"='${T}')`);

    // Metas de venta: van por (anio, mes) fijos, con restricción única
    // (tenantId, anio, mes). Un UPDATE masivo de "mes+1" crea choques temporales
    // (mayo→junio cuando junio aún existe), así que se leen, se borran y se
    // recrean con el mes ya corrido y su acarreo de año. La meta anual (mes null)
    // no se toca. La ausencia de choque final está garantizada porque todo el
    // bloque se desplaza el mismo número de meses.
    const metas = await tx.metaVenta.findMany({
      where: { tenantId: T, mes: { not: null } },
      select: { anio: true, mes: true, valorObjetivo: true, creadoEn: true },
    });
    await tx.metaVenta.deleteMany({ where: { tenantId: T, mes: { not: null } } });
    for (const m of metas) {
      const total = (m.mes! - 1) + meses;
      const nuevoMes = ((total % 12) + 12) % 12 + 1;      // 1..12, robusto ante negativos
      const nuevoAnio = m.anio + Math.floor(total / 12);
      await tx.metaVenta.create({
        data: { tenantId: T, anio: nuevoAnio, mes: nuevoMes, valorObjetivo: m.valorObjetivo, creadoEn: m.creadoEn },
      });
    }
  }, { timeout: 60000, maxWait: 20000 });

  console.log("✓ Fechas y metas desplazadas.\n");

  // ── Verificación: cómo quedó de cara al "hoy" real ──
  const hoy = new Date();
  const iniMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const proximas = await prisma.actividad.count({ where: { tenantId: T, fecha: { gt: hoy }, completada: false } });
  const ultima = await prisma.actividad.findFirst({ where: { tenantId: T }, orderBy: { fecha: "desc" }, select: { fecha: true } });
  const ganadasMes = await prisma.oportunidad.count({ where: { tenantId: T, etapa: "GANADA", fechaCierre: { gte: iniMes, lte: finMes } } });
  const metaMes = await prisma.metaVenta.findFirst({ where: { tenantId: T, anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }, select: { valorObjetivo: true } });
  const pipelineFuturo = await prisma.oportunidad.count({ where: { tenantId: T, fechaCierre: { gt: hoy }, etapa: { notIn: ["GANADA", "PERDIDA"] } } });

  console.log(`Hoy: ${hoy.toISOString().slice(0,10)}`);
  console.log(`  Actividades próximas (agenda viva): ${proximas}`);
  console.log(`  Última actividad: ${ultima?.fecha?.toISOString().slice(0,10) ?? "—"}`);
  console.log(`  Ganadas este mes: ${ganadasMes}`);
  console.log(`  Meta de este mes: ${metaMes ? "$" + Number(metaMes.valorObjetivo).toLocaleString() : "— (sin meta)"}`);
  console.log(`  Oportunidades abiertas con cierre futuro: ${pipelineFuturo}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
