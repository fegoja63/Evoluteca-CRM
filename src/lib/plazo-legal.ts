const OFFSET_COLOMBIA_MS = 5 * 60 * 60 * 1000; // Colombia es UTC-5, sin horario de verano

/**
 * Un plazo procesal (TerminoExpediente.fechaLimite) se guarda como medianoche UTC
 * del día calendario del vencimiento (mismo patrón que extras.MES en fecha-efectiva.ts:
 * el valor de un <input type="date"> se interpreta como fecha calendario, no como un
 * instante). Comparar esa fecha directamente contra `new Date()` (instante actual)
 * marca el plazo "vencido" hasta 5 horas antes de que termine el día en Colombia,
 * porque UTC llega a la medianoche del día siguiente 5 horas antes que Colombia.
 * Por eso aquí se reduce todo a comparar fechas calendario (YYYY-MM-DD) en hora
 * Colombia, no instantes — un plazo solo está vencido cuando el día calendario
 * de Colombia ya pasó el día del plazo.
 */
function fechaISO(instanteUtcMs: number): string {
  const d = new Date(instanteUtcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fechaColombiaHoyISO(): string {
  return fechaISO(Date.now() - OFFSET_COLOMBIA_MS);
}

function fechaLimiteISO(fechaLimite: Date | string): string {
  return fechaISO(new Date(fechaLimite).getTime());
}

export function plazoVencido(fechaLimite: Date | string): boolean {
  return fechaColombiaHoyISO() > fechaLimiteISO(fechaLimite);
}

export function plazoProximo(fechaLimite: Date | string, dias = 7): boolean {
  if (plazoVencido(fechaLimite)) return false;
  const limiteISO = fechaLimiteISO(fechaLimite);
  const enNDiasISO = fechaISO(Date.now() - OFFSET_COLOMBIA_MS + dias * 86_400_000);
  return limiteISO <= enNDiasISO;
}

/** Días calendario (Colombia) hasta el plazo: negativo si ya venció, 0 si es hoy. */
export function diasHastaPlazo(fechaLimite: Date | string): number {
  const hoyMs = Date.parse(`${fechaColombiaHoyISO()}T00:00:00.000Z`);
  const limiteMs = Date.parse(`${fechaLimiteISO(fechaLimite)}T00:00:00.000Z`);
  return Math.round((limiteMs - hoyMs) / 86_400_000);
}
