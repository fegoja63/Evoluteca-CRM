/**
 * Rellena el HISTÓRICO de ventas del tenant demo (demo-evoluteca) para que la
 * infografía "Tendencias · últimos 12 meses" de Reportes no se vea concentrada
 * en los últimos meses. Crea oportunidades GANADAS (y algunas PERDIDAS) con
 * fechaCierre repartida por los meses que hoy están vacíos.
 *
 * Por qué: el cron semanal del demo genera actividad reciente, así que en
 * producción el demo solo tenía cierres de jul–sep 2026. Esto añade el histórico
 * anterior para que el demo luzca completo al mostrarlo a prospectos.
 *
 * SEGURO: solo escribe en el tenant demo-evoluteca (abortará si no lo encuentra).
 * Idempotente: cada negocio lleva un título único con sufijo; si ya existe, se
 * salta. Correrlo dos veces no duplica.
 *
 * Uso:
 *   Previsualizar (no escribe nada):
 *     DRY_RUN=1 node --env-file=.env.produccion.ref scripts/crear-ventas-historicas-demo.ts
 *   Ejecutar de verdad:
 *     node --env-file=.env.produccion.ref scripts/crear-ventas-historicas-demo.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.env.DRY_RUN === "1";
const SUFIJO = "· histórico demo";

// Meses a rellenar (año, mesIndex 0-11) y cuántos ganados/perdidos en cada uno.
// Se dejan vacíos jul/ago/sep 2026 porque el demo ya tiene cierres reales ahí.
const PLAN: Array<{ y: number; m: number; ganadas: number; perdidas: number }> = [
  { y: 2025, m: 9,  ganadas: 2, perdidas: 1 }, // oct 2025
  { y: 2025, m: 10, ganadas: 2, perdidas: 0 }, // nov 2025
  { y: 2025, m: 11, ganadas: 3, perdidas: 1 }, // dic 2025
  { y: 2026, m: 0,  ganadas: 2, perdidas: 0 }, // ene 2026
  { y: 2026, m: 1,  ganadas: 3, perdidas: 1 }, // feb 2026
  { y: 2026, m: 2,  ganadas: 3, perdidas: 0 }, // mar 2026
  { y: 2026, m: 3,  ganadas: 3, perdidas: 1 }, // abr 2026
  { y: 2026, m: 4,  ganadas: 4, perdidas: 0 }, // may 2026
  { y: 2026, m: 5,  ganadas: 4, perdidas: 1 }, // jun 2026
];

const TITULOS = [
  "Consultoría estratégica", "Capacitación corporativa — liderazgo",
  "Auditoría organizacional integral", "Diseño de indicadores KPI",
  "Implementación de procesos comerciales", "Rediseño de la operación",
  "Plan de transformación digital", "Acompañamiento comercial trimestral",
  "Diagnóstico y plan de acción", "Optimización de costos",
];
const ORIGENES = ["Referido", "LinkedIn", "Web", "Evento", "Llamada en frío"];
const MOTIVOS = ["Precio muy alto", "Eligió a la competencia", "Presupuesto insuficiente", "Sin respuesta del cliente"];
// Valores brutos plausibles (con IVA, según la convención del pipeline).
const VALORES = [4_800_000, 6_500_000, 8_200_000, 9_900_000, 12_400_000, 14_800_000, 17_600_000];

function fechaMedioMes(y: number, m: number, dia: number) {
  return new Date(y, m, dia, 12, 0, 0); // mediodía local: sin corrimiento de día
}
const MES_ABR = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("ABORTADO: tenant demo-evoluteca no encontrado."); return; }
  console.log(`Tenant: ${tenant.nombre} | ${DRY ? "DRY-RUN (no escribe)" : "ESCRITURA REAL"}\n`);

  const comerciales = await prisma.usuario.findMany({
    where: { tenantId: tenant.id, activo: true, rol: { in: ["COMERCIAL", "GERENTE", "ADMINISTRADOR"] } },
    select: { id: true, nombre: true }, orderBy: { nombre: "asc" },
  });
  if (comerciales.length === 0) { console.error("ABORTADO: no hay usuarios en el tenant."); return; }

  const empresas = await prisma.empresa.findMany({
    where: { tenantId: tenant.id, eliminadoEn: null },
    select: { id: true, nombre: true, contactos: { where: { eliminadoEn: null }, select: { id: true }, take: 1 } },
    orderBy: { nombre: "asc" },
  });
  if (empresas.length === 0) { console.error("ABORTADO: el tenant demo no tiene empresas."); return; }

  let ganadasCreadas = 0, perdidasCreadas = 0, saltadas = 0, valorTotal = 0;
  let i = 0; // índice global para rotar títulos/empresas/valores/comerciales

  for (const bloque of PLAN) {
    const etiquetaMes = `${MES_ABR[bloque.m]}-${bloque.y}`;
    const total = bloque.ganadas + bloque.perdidas;
    for (let k = 0; k < total; k++) {
      const gana = k < bloque.ganadas;
      const empresa = empresas[i % empresas.length];
      const comercial = comerciales[i % comerciales.length];
      const base = TITULOS[i % TITULOS.length];
      const valor = VALORES[i % VALORES.length];
      const dia = 6 + ((i * 7) % 20); // reparte los días dentro del mes (6..25)
      const titulo = `${base} — ${empresa.nombre} (${etiquetaMes}) ${SUFIJO}`;
      i++;

      const existe = await prisma.oportunidad.findFirst({
        where: { tenantId: tenant.id, titulo, eliminadoEn: null }, select: { id: true },
      });
      if (existe) { saltadas++; continue; }

      const fechaCierre = fechaMedioMes(bloque.y, bloque.m, dia);
      const creadoEn = new Date(fechaCierre.getTime() - 38 * 24 * 60 * 60 * 1000);

      if (DRY) {
        console.log(`  [${etiquetaMes}] ${gana ? "GANADA " : "PERDIDA"} ${valor.toLocaleString("es-CO")} · ${empresa.nombre} · ${comercial.nombre}`);
      } else {
        const op = await prisma.oportunidad.create({
          data: {
            titulo,
            etapa: gana ? "GANADA" : "PERDIDA",
            valor,
            costo: Math.round(valor * 0.28),
            probabilidad: gana ? 100 : 0,
            origenLead: ORIGENES[i % ORIGENES.length],
            motivoPerdida: gana ? null : MOTIVOS[i % MOTIVOS.length],
            fechaCierre,
            creadoEn,
            empresaId: empresa.id,
            contactoId: empresa.contactos[0]?.id ?? null,
            tenantId: tenant.id,
            creadoBy: comercial.id,
            notas: "Registro histórico de demostración.",
          },
        });
        await prisma.cambioEtapa.create({
          data: {
            etapaAnterior: "NEGOCIACION",
            etapaNueva: gana ? "GANADA" : "PERDIDA",
            creadoEn: fechaCierre,
            creadoBy: comercial.id,
            creadoByNombre: comercial.nombre,
            oportunidadId: op.id,
          },
        });
      }

      if (gana) { ganadasCreadas++; valorTotal += valor; } else { perdidasCreadas++; }
    }
  }

  console.log(`\n${DRY ? "(DRY) " : ""}Resumen:`);
  console.log(`  Ganadas ${DRY ? "a crear" : "creadas"}: ${ganadasCreadas} (valor $${valorTotal.toLocaleString("es-CO")})`);
  console.log(`  Perdidas ${DRY ? "a crear" : "creadas"}: ${perdidasCreadas}`);
  console.log(`  Saltadas (ya existían): ${saltadas}`);
  if (DRY) console.log("\nNada se escribió. Para ejecutar de verdad, corre sin DRY_RUN=1.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
