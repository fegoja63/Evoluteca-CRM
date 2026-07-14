export type CotizacionResumen = {
  id: string;
  numero: number;
  estado: string;
  oportunidadId: string | null;
};

// --- Modalidad SUCCESS_FEE (honorarios como % del ahorro estimado) ---

export type LineaAhorroCalc = {
  gastoBaseMensual: number | string;
  ahorroEstimadoMensual: number | string;
};

/** Ahorro mensual estimado total = Σ de las líneas. */
export function ahorroMensualTotal(lineas: LineaAhorroCalc[]): number {
  return lineas.reduce((s, l) => s + Number(l.ahorroEstimadoMensual || 0), 0);
}

/**
 * Valor estimado del contrato en modalidad success fee:
 *   Σ(ahorro mensual estimado) × (% honorarios / 100) × horizonte en meses.
 * Los valores pueden llegar como number o string (Decimal serializado).
 */
export function valorSuccessFee(
  lineas: LineaAhorroCalc[],
  porcentaje: number | string | null | undefined,
  meses: number | string | null | undefined,
): number {
  const p = Number(porcentaje ?? 0);
  const m = Number(meses ?? 0);
  return ahorroMensualTotal(lineas) * (p / 100) * m;
}

/** Valor del contrato en modalidad fee mensual = fee mensual × meses. */
export function valorFeeMensual(
  feeMensual: number | string | null | undefined,
  meses: number | string | null | undefined,
): number {
  return Number(feeMensual ?? 0) * Number(meses ?? 0);
}

// Una cotización puede tener recotizaciones (versiones nuevas) que apuntan al
// mismo negocio (oportunidad). Para no ensuciar el pipeline ni la lista con
// versiones viejas, se calcula cuál es la cotización "vigente" de cada negocio
// y las demás quedan como "reemplazadas". No requiere columna en la base: se
// deriva de los datos que ya existen.
//
// Regla de vigencia por negocio (oportunidad):
//   - Si alguna cotización está ACEPTADA, esa es la vigente (el negocio se
//     cerró sobre esa propuesta).
//   - Si no, la más reciente (mayor número) es la vigente.
// Todas las demás cotizaciones del mismo negocio quedan reemplazadas.
export function idsReemplazadas(cots: CotizacionResumen[]): Set<string> {
  const grupos = new Map<string, CotizacionResumen[]>();
  for (const c of cots) {
    if (!c.oportunidadId) continue; // sin negocio no hay "versión anterior" que reemplazar
    const arr = grupos.get(c.oportunidadId) ?? [];
    arr.push(c);
    grupos.set(c.oportunidadId, arr);
  }

  const reemplazadas = new Set<string>();
  for (const grupo of Array.from(grupos.values())) {
    if (grupo.length < 2) continue; // una sola cotización nunca está reemplazada
    const vigente =
      grupo.find(c => c.estado === "ACEPTADA") ??
      grupo.reduce((max: CotizacionResumen, c: CotizacionResumen) => (c.numero > max.numero ? c : max));
    for (const c of grupo) if (c.id !== vigente.id) reemplazadas.add(c.id);
  }
  return reemplazadas;
}
