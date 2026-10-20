import { z } from "zod";

// Montos en pesos. El tope evita cifras absurdas por un error de unidad
// (p. ej. pegar pesos donde se esperaban millones dos veces).
const monto = z.number({ error: "Monto inválido" }).finite("Monto inválido")
  .refine(v => Math.abs(v) < 1e14, "El monto es demasiado grande: revise la unidad (pesos, miles o millones).");

const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido (use AAAA-MM)");

export const periodoSchema = z.object({
  mes,
  ventas: monto,
  costoVentas: monto.default(0),
  gastosAdmin: monto.default(0),
  gastosVentas: monto.default(0),
  depreciacion: monto.default(0),
  intereses: monto.default(0),
});

// Hasta 10 años de meses en una sola carga.
export const guardarPeriodosSchema = z.object({
  periodos: z.array(periodoSchema).min(1, "No hay meses para guardar").max(120, "Máximo 120 meses por carga"),
});

export const balanceSchema = z.object({
  corte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de corte inválida"),
  caja: monto.default(0),
  cuentasPorCobrar: monto.default(0),
  inventario: monto.default(0),
  otrosActivosCorrientes: monto.default(0),
  activosFijos: monto.default(0),
  proveedores: monto.default(0),
  obligacionesCP: monto.default(0),
  impuestosLaborales: monto.default(0),
  deudaLP: monto.default(0),
  patrimonio: monto,
});

export const UNIDADES = ["pesos", "miles", "millones"] as const;
