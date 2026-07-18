import { fechaEfectiva } from "@/lib/fecha-efectiva";

// Cálculo determinista de las series de tendencia (últimos 12 meses y pipeline
// abierto por etapa). Es la ÚNICA fuente de verdad: la usan tanto el análisis
// con IA (que interpreta estas cifras) como las gráficas de Reportes (que las
// dibujan), para que texto y gráficas nunca se contradigan.

export type OportunidadSerie = {
  etapa: string; valor: unknown; probabilidad: number | null;
  creadoEn: Date; fechaCierre: Date | null; fechaEvento: Date | null; extras: unknown;
};
export type EtapaDef = { key: string; nombre: string };
export type MesTendencia = {
  anio: number; mes: number; label: string;
  ganado: number; ganadas: number; perdidas: number; creadas: number; tasa: number | null;
};
export type EtapaAbierta = { nombre: string; cantidad: number; valor: number; ponderado: number };
export type Tendencias = {
  meses: MesTendencia[];
  porEtapa: EtapaAbierta[];
  valorAbierto: number;
  valorPonderado: number;
  ganadoMesActual: number;
  ganadoAnio: number;
  trimestre: { ganadoUlt3: number; ganadoPrev3: number; creadasUlt3: number; creadasPrev3: number };
};

const ABREV_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function seriesTendencias(ops: OportunidadSerie[], etapasBase: EtapaDef[], ahora = new Date()): Tendencias {
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  const meses: MesTendencia[] = [];
  const idx = new Map<string, MesTendencia>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anioActual, mesActual - 1 - i, 1);
    const m: MesTendencia = {
      anio: d.getFullYear(), mes: d.getMonth() + 1,
      label: `${ABREV_MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      ganado: 0, ganadas: 0, perdidas: 0, creadas: 0, tasa: null,
    };
    meses.push(m);
    idx.set(`${m.anio}-${m.mes}`, m);
  }

  const abiertas = ops.filter(o => o.etapa !== "GANADA" && o.etapa !== "PERDIDA");
  for (const o of ops) {
    const ef = fechaEfectiva(o);
    const b = idx.get(`${ef.getFullYear()}-${ef.getMonth() + 1}`);
    if (b) {
      if (o.etapa === "GANADA") { b.ganado += Number(o.valor ?? 0); b.ganadas++; }
      if (o.etapa === "PERDIDA") b.perdidas++;
    }
    // "Pipeline nuevo" = oportunidades creadas ese mes (fecha real de creación).
    const cb = idx.get(`${o.creadoEn.getFullYear()}-${o.creadoEn.getMonth() + 1}`);
    if (cb) cb.creadas++;
  }
  for (const m of meses) m.tasa = m.ganadas + m.perdidas > 0 ? Math.round((m.ganadas / (m.ganadas + m.perdidas)) * 100) : null;

  const sum = (arr: MesTendencia[], f: (m: MesTendencia) => number) => arr.reduce((a, m) => a + f(m), 0);
  const ult3 = meses.slice(-3), prev3 = meses.slice(-6, -3);
  const trimestre = {
    ganadoUlt3: sum(ult3, m => m.ganado), ganadoPrev3: sum(prev3, m => m.ganado),
    creadasUlt3: sum(ult3, m => m.creadas), creadasPrev3: sum(prev3, m => m.creadas),
  };

  const porEtapa = etapasBase
    .filter(e => e.key !== "GANADA" && e.key !== "PERDIDA")
    .map(e => {
      const g = abiertas.filter(o => o.etapa === e.key);
      return {
        nombre: e.nombre, cantidad: g.length,
        valor: g.reduce((a, o) => a + Number(o.valor ?? 0), 0),
        ponderado: g.reduce((a, o) => a + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0),
      };
    })
    .filter(g => g.cantidad > 0);

  const valorAbierto = porEtapa.reduce((a, g) => a + g.valor, 0);
  const valorPonderado = porEtapa.reduce((a, g) => a + g.ponderado, 0);
  const ganadoMesActual = idx.get(`${anioActual}-${mesActual}`)?.ganado ?? 0;
  const ganadoAnio = meses.filter(m => m.anio === anioActual).reduce((a, m) => a + m.ganado, 0);

  return { meses, porEtapa, valorAbierto, valorPonderado, ganadoMesActual, ganadoAnio, trimestre };
}
