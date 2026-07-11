import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import { filtroOwner } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Mismo criterio de fecha que usa el Dashboard (ver src/lib/fecha-efectiva.ts) para
// que ambas pantallas calculen el mismo año/mes para el mismo negocio.
function getAnio(o: Parameters<typeof fechaEfectiva>[0]): number {
  return fechaEfectiva(o).getFullYear();
}
function getMes(o: Parameters<typeof fechaEfectiva>[0]): number {
  return fechaEfectiva(o).getMonth() + 1;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(request.url);
  const anioFiltro = searchParams.get("anio") ? Number(searchParams.get("anio")) : null;
  const mesFiltro  = searchParams.get("mes")  ? Number(searchParams.get("mes"))  : null;
  const vendedorParam = searchParams.get("vendedor");
  const segmentoFiltro = searchParams.get("segmento");
  const sedeFiltro = searchParams.get("sede");

  // Igual que el resto del CRM (Dashboard, Pipeline, Agenda): un COMERCIAL solo
  // ve sus propios registros, no los de todo el equipo.
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  // El filtro de vendedor solo aplica para roles con visión de equipo (COMERCIAL
  // ya está restringido a lo suyo vía ownerFiltro, así que ignoramos el param si lo manda).
  const vendedorFiltro = vendedorParam && session.user.rol !== "COMERCIAL" ? { creadoBy: vendedorParam } : {};

  // ── Traer todas las oportunidades con extras ──
  const [totalEmpresas, totalContactos, todasOps, actividadesPendientes, cambiosGanada] = await Promise.all([
    prisma.empresa.count({ where: { tenantId, ...ownerFiltro } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({
      where: { tenantId, ...ownerFiltro, ...vendedorFiltro },
      select: { id: true, etapa: true, valor: true, probabilidad: true, fechaCierre: true, fechaEvento: true, creadoEn: true, extras: true, creadoBy: true, motivoPerdida: true, sede: true, segmento: true, empresa: { select: { nombre: true } } },
    }),
    prisma.actividad.count({ where: { tenantId, completada: false, ...ownerFiltro } }),
    // Fecha real en que cada oportunidad pasó a GANADA (para el tiempo promedio
    // de cierre) — más confiable que fechaCierre, que es editable a mano y puede
    // quedar vacía o representar una fecha esperada distinta a la real.
    prisma.cambioEtapa.findMany({
      where: { etapaNueva: "GANADA", oportunidad: { tenantId } },
      select: { oportunidadId: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
    }),
  ]);
  const fechaGanadaMap = new Map<string, Date>();
  for (const c of cambiosGanada) {
    if (!fechaGanadaMap.has(c.oportunidadId)) fechaGanadaMap.set(c.oportunidadId, c.creadoEn);
  }

  // ── Años disponibles (desde extras.AÑO) ──
  const aniosSet = new Set<number>();
  for (const o of todasOps) {
    const a = getAnio(o);
    if (a) aniosSet.add(a);
  }
  const aniosDisponibles = Array.from(aniosSet).sort();

  // ── Segmentos y sedes disponibles (valores libres, poblados por import o edición manual) ──
  const segmentosSet = new Set<string>();
  const sedesSet = new Set<string>();
  for (const o of todasOps) {
    if (o.segmento?.trim()) segmentosSet.add(o.segmento.trim());
    if (o.sede?.trim()) sedesSet.add(o.sede.trim());
  }
  const segmentosDisponibles = Array.from(segmentosSet).sort();
  const sedesDisponibles = Array.from(sedesSet).sort();

  // ── Filtrar oportunidades por año/mes/segmento/sede seleccionados ──
  const oportunidades = todasOps.filter(o => {
    if (anioFiltro && getAnio(o) !== anioFiltro) return false;
    if (mesFiltro  && getMes(o)  !== mesFiltro)  return false;
    if (segmentoFiltro && o.segmento?.trim() !== segmentoFiltro) return false;
    if (sedeFiltro && o.sede?.trim() !== sedeFiltro) return false;
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

  // ── Tiempo promedio de cierre (días desde creación hasta que pasó a GANADA) ──
  const diasCierreArr: number[] = [];
  for (const o of oportunidades) {
    if (o.etapa !== "GANADA") continue;
    const fechaGanada = fechaGanadaMap.get(o.id) ?? o.fechaCierre;
    if (!fechaGanada) continue;
    const dias = Math.round((fechaGanada.getTime() - o.creadoEn.getTime()) / (1000 * 60 * 60 * 24));
    if (dias >= 0) diasCierreArr.push(dias);
  }
  const diasPromedioCierre = diasCierreArr.length > 0
    ? Math.round(diasCierreArr.reduce((a, b) => a + b, 0) / diasCierreArr.length)
    : null;
  const etapasActivas = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];
  const valorActivo    = etapasActivas.reduce((acc, e) => acc + (valorPorEtapa[e] ?? 0), 0);
  const cantidadActiva = etapasActivas.reduce((acc, e) => acc + (oportunidadesPorEtapa[e] ?? 0), 0);

  // Forecast ponderado: valor × probabilidad para oportunidades activas
  const valorPonderado = oportunidades
    .filter(o => etapasActivas.includes(o.etapa))
    .reduce((acc, o) => acc + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0);

  // Desglose de forecast por etapa
  type ForecastEtapa = { cantidad: number; valorBruto: number; valorPonderado: number; probPromedio: number };
  const forecastPorEtapa: Record<string, ForecastEtapa> = {};
  for (const o of oportunidades) {
    if (!etapasActivas.includes(o.etapa)) continue;
    const fe = forecastPorEtapa[o.etapa] ?? { cantidad: 0, valorBruto: 0, valorPonderado: 0, probPromedio: 0 };
    fe.cantidad++;
    fe.valorBruto   += Number(o.valor ?? 0);
    fe.valorPonderado += Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100);
    fe.probPromedio  += o.probabilidad ?? 50;
    forecastPorEtapa[o.etapa] = fe;
  }
  // Calcular promedio real de probabilidad por etapa
  for (const e of etapasActivas) {
    if (forecastPorEtapa[e]) {
      forecastPorEtapa[e].probPromedio = Math.round(forecastPorEtapa[e].probPromedio / forecastPorEtapa[e].cantidad);
    }
  }

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

  // ── Por mes: del año filtrado, o últimos 12 meses si no hay filtro ──
  const porMes: Record<number, { ganadas: number; perdidas: number; valorGanado: number; total: number }> = {};
  for (let m = 1; m <= 12; m++) porMes[m] = { ganadas: 0, perdidas: 0, valorGanado: 0, total: 0 };

  const anioParaMes = anioFiltro ?? (aniosDisponibles.length > 0 ? Math.max(...aniosDisponibles) : new Date().getFullYear());
  for (const o of todasOps) {
    if (getAnio(o) !== anioParaMes) continue;
    const m = getMes(o);
    if (!m) continue;
    porMes[m].total++;
    if (o.etapa === "GANADA")  { porMes[m].ganadas++;  porMes[m].valorGanado += Number(o.valor ?? 0); }
    if (o.etapa === "PERDIDA") { porMes[m].perdidas++; }
  }

  // ── Comparación mes actual vs. mes anterior (puede cruzar de año, ej. Ene vs Dic) ──
  function valorGanadoDeMes(a: number, m: number): number {
    let total = 0;
    for (const o of todasOps) {
      if (getAnio(o) !== a || getMes(o) !== m || o.etapa !== "GANADA") continue;
      total += Number(o.valor ?? 0);
    }
    return total;
  }
  const mesesConDatos = Object.entries(porMes).filter(([, v]) => v.total > 0).map(([k]) => Number(k));
  const mesComparativo = mesFiltro ?? (mesesConDatos.length > 0 ? Math.max(...mesesConDatos) : new Date().getMonth() + 1);
  const mesAnteriorNum = mesComparativo === 1 ? 12 : mesComparativo - 1;
  const anioMesAnterior = mesComparativo === 1 ? anioParaMes - 1 : anioParaMes;
  const valorMesActual = valorGanadoDeMes(anioParaMes, mesComparativo);
  const valorMesAnterior = valorGanadoDeMes(anioMesAnterior, mesAnteriorNum);
  const comparativaMes = {
    mesActual: mesComparativo, anioActual: anioParaMes, valorActual: valorMesActual,
    mesAnterior: mesAnteriorNum, anioAnterior: anioMesAnterior, valorAnterior: valorMesAnterior,
    deltaPct: valorMesAnterior > 0 ? Math.round(((valorMesActual - valorMesAnterior) / valorMesAnterior) * 100) : null,
  };

  // ── Top 5 clientes por valor ganado ──
  const clienteMap = new Map<string, { nombre: string; valorGanado: number; ganadas: number; total: number }>();
  for (const o of oportunidades) {
    const nombre = o.empresa?.nombre ?? "Sin cliente";
    const entry = clienteMap.get(nombre) ?? { nombre, valorGanado: 0, ganadas: 0, total: 0 };
    entry.total++;
    if (o.etapa === "GANADA") { entry.valorGanado += Number(o.valor ?? 0); entry.ganadas++; }
    clienteMap.set(nombre, entry);
  }
  const topClientes = Array.from(clienteMap.values())
    .sort((a, b) => b.valorGanado - a.valorGanado)
    .slice(0, 5);

  // ── Motivos de pérdida (del período filtrado) ──
  const motivoMap = new Map<string, number>();
  for (const o of oportunidades) {
    if (o.etapa !== "PERDIDA") continue;
    const motivo = o.motivoPerdida?.trim() || "Sin especificar";
    motivoMap.set(motivo, (motivoMap.get(motivo) ?? 0) + 1);
  }
  const motivosPerdida = Array.from(motivoMap.entries())
    .map(([motivo, cantidad]) => ({ motivo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

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
    diasPromedioCierre,
    oportunidadesPorEtapa,
    valorPorEtapa,
    actividadesPendientes,
    aniosDisponibles,
    segmentosDisponibles,
    sedesDisponibles,
    porAnio,
    porMes,
    anioParaMes,
    comparativaMes,
    topClientes,
    motivosPerdida,
    valorPonderado,
    forecastPorEtapa,
    filtro: { anio: anioFiltro, mes: mesFiltro, vendedor: vendedorParam, segmento: segmentoFiltro, sede: sedeFiltro },
  });
}
