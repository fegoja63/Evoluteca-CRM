/**
 * Rentabilidad por cliente: quién le compra más no siempre es quién le deja
 * más. Funciones puras sobre las cifras de los últimos 12 meses.
 */

export type ClienteRentabilidad = { cliente: string; ventas: number; costo: number; diasPago: number | null };

export type ClienteAnalizado = ClienteRentabilidad & {
  margen: number;
  /** Participación en las ventas totales (0–1). */
  participacion: number;
  semaforo: "bien" | "atencion" | "riesgo";
  /** Compra mucho (≥ 10 % de las ventas) pero deja poco margen (< 25 %). */
  compraMuchoDejaPoco: boolean;
  pagaTarde: boolean;
};

/** Umbrales: margen bruto sano ≥ 35 %, bajo < 25 %; paga tarde a más de 60 días. */
export const MARGEN_BAJO = 0.25;
export const MARGEN_SANO = 0.35;
export const DIAS_TARDE = 60;

export function analizarClientes(filas: ClienteRentabilidad[]): ClienteAnalizado[] {
  const total = filas.reduce((a, f) => a + f.ventas, 0);
  return filas
    .filter(f => f.ventas > 0)
    .map(f => {
      const margen = (f.ventas - f.costo) / f.ventas;
      const participacion = total ? f.ventas / total : 0;
      return {
        ...f, margen, participacion,
        semaforo: margen >= MARGEN_SANO ? "bien" : margen >= MARGEN_BAJO ? "atencion" : "riesgo",
        compraMuchoDejaPoco: participacion >= 0.1 && margen < MARGEN_BAJO,
        pagaTarde: (f.diasPago ?? 0) > DIAS_TARDE,
      } as ClienteAnalizado;
    })
    .sort((a, b) => b.ventas - a.ventas);
}

/** Totales: ventas, margen ponderado y días de pago ponderados por ventas. */
export function resumenClientes(c: ClienteAnalizado[]) {
  const ventas = c.reduce((a, x) => a + x.ventas, 0);
  const costo = c.reduce((a, x) => a + x.costo, 0);
  const conDias = c.filter(x => x.diasPago !== null);
  const ventasConDias = conDias.reduce((a, x) => a + x.ventas, 0);
  return {
    ventas,
    margen: ventas ? (ventas - costo) / ventas : 0,
    diasPagoPromedio: ventasConDias ? conDias.reduce((a, x) => a + x.ventas * (x.diasPago ?? 0), 0) / ventasConDias : null,
  };
}
