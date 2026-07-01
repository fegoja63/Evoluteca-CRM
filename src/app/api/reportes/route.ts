import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Lee el año desde extras.AÑO, con fallback a fechaEvento o creadoEn
function getAnio(o: { extras: unknown; fechaEvento: Date | null; creadoEn: Date }): number | null {
  const ext = o.extras as Record<string, string> | null;
  if (ext?.["AÑO"]) {
    const n = Number(String(ext["AÑO"]).trim());
    if (!isNaN(n) && n > 2000 && n < 2100) return n;
  }
  const fecha = o.fechaEvento ?? o.creadoEn;
  return new Date(fecha).getFullYear();
}

// Lee el mes desde extras — prueba varias claves posibles
function getMes(o: { extras: unknown; fechaEvento: Date | null; creadoEn: Date }): number | null {
  const ext = o.extras as Record<string, string> | null;
  const rawMes = ext?.["MES ELABORACION"] ?? ext?.["ELABORACIÓN"] ?? ext?.["ELABORACION"] ?? null;
  if (rawMes) {
    const raw = String(rawMes).trim().toUpperCase();
    const MESES: Record<string, number> = {
      ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
      JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
      ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
      JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
    };
    if (MESES[raw]) return MESES[raw];
    const n = Number(raw);
    if (!isNaN(n) && n >= 1 && n <= 12) return n;
  }
  const fecha = o.fechaEvento ?? o.creadoEn;
  return new Date(fecha).getMonth() + 1;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(request.url);
  const anioFiltro = searchParams.get("anio") ? Number(searchParams.get("anio")) : null;
  const mesFiltro  = searchParams.get("mes")  ? Number(searchParams.get("mes"))  : null;

  // ── Traer todas las oportunidades con extras ──
  const [totalEmpresas, totalContactos, todasOps, actividadesPendientes] = await Promise.all([
    prisma.empresa.count({ where: { tenantId } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({
      where: { tenantId },
      select: { etapa: true, valor: true, fechaEvento: true, creadoEn: true, extras: true },
    }),
    prisma.actividad.count({ where: { tenantId, completada: false } }),
  ]);

  // ── Años disponibles (desde extras.AÑO) ──
  const aniosSet = new Set<number>();
  for (const o of todasOps) {
    const a = getAnio(o);
    if (a) aniosSet.add(a);
  }
  const aniosDisponibles = Array.from(aniosSet).sort();

  // ── Filtrar oportunidades por año/mes seleccionado ──
  const oportunidades = todasOps.filter(o => {
    if (anioFiltro && getAnio(o) !== anioFiltro) return false;
    if (mesFiltro  && getMes(o)  !== mesFiltro)  return false;
    return true;
  });

  // ── Métricas del período filtrado ──
  const oportunidadesPorEtapa: Record<string, number> = {};
  const valorPorEtapa: Record<string, number> = {};
  for (const o of oportunidades) {
    oportunidadesPorEtapa[o.etapa] = (oportunidadesPorEtapa[o.etapa] ?? 0) + 1;
    valorPorEtapa[o.etapa] = (valorPorEtapa[o.etapa] ?? 0) + Number(o.valor ?? 0);
  }

  const ganadas  = oportunidadesPorEtapa["GANADA"]  ?? 0;
  const perdidas = oportunidadesPorEtapa["PERDIDA"] ?? 0;
  const cerradas = ganadas + perdidas;
  const tasaCierre = cerradas > 0 ? Math.round((ganadas / cerradas) * 100) : 0;
  const etapasActivas = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];
  const valorActivo    = etapasActivas.reduce((acc, e) => acc + (valorPorEtapa[e] ?? 0), 0);
  const cantidadActiva = etapasActivas.reduce((acc, e) => acc + (oportunidadesPorEtapa[e] ?? 0), 0);

  // ── Por año (comparativa) ──
  type ResAnio = { ganadas: number; perdidas: number; activas: number; valorGanado: number; valorPerdido: number; valorActivo: number; total: number };
  const porAnio: Record<number, ResAnio> = {};
  for (const a of aniosDisponibles) {
    porAnio[a] = { ganadas: 0, perdidas: 0, activas: 0, valorGanado: 0, valorPerdido: 0, valorActivo: 0, total: 0 };
  }
  for (const o of todasOps) {
    const a = getAnio(o);
    if (!a || !porAnio[a]) continue;
    const val = Number(o.valor ?? 0);
    porAnio[a].total++;
    if (o.etapa === "GANADA")               { porAnio[a].ganadas++;  porAnio[a].valorGanado  += val; }
    if (o.etapa === "PERDIDA")              { porAnio[a].perdidas++; porAnio[a].valorPerdido += val; }
    if (etapasActivas.includes(o.etapa))    { porAnio[a].activas++;  porAnio[a].valorActivo  += val; }
  }

  // ── Por mes del año seleccionado ──
  const porMes: Record<number, { ganadas: number; perdidas: number; valorGanado: number; total: number }> = {};
  if (anioFiltro) {
    for (let m = 1; m <= 12; m++) porMes[m] = { ganadas: 0, perdidas: 0, valorGanado: 0, total: 0 };
    for (const o of todasOps) {
      if (getAnio(o) !== anioFiltro) continue;
      const m = getMes(o);
      if (!m) continue;
      porMes[m].total++;
      if (o.etapa === "GANADA")  { porMes[m].ganadas++;  porMes[m].valorGanado += Number(o.valor ?? 0); }
      if (o.etapa === "PERDIDA") { porMes[m].perdidas++; }
    }
  }

  return NextResponse.json({
    totalEmpresas,
    totalContactos,
    totalOportunidades: oportunidades.length,
    valorGanado:  valorPorEtapa["GANADA"]  ?? 0,
    valorPerdido: valorPorEtapa["PERDIDA"] ?? 0,
    valorActivo,
    cantidadActiva,
    ganadas,
    perdidas,
    tasaCierre,
    oportunidadesPorEtapa,
    valorPorEtapa,
    actividadesPendientes,
    aniosDisponibles,
    porAnio,
    porMes,
    filtro: { anio: anioFiltro, mes: mesFiltro },
  });
}
