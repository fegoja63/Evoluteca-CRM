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
  // Opcionales: si no vienen, un mes ya guardado conserva los que tenía.
  otrosIngresos: monto.optional(),
  otrosGastos: monto.optional(),
  impuestoRenta: monto.nullable().optional(),
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
  inversiones: monto.default(0),
  activosFijos: monto.default(0),
  proveedores: monto.default(0),
  obligacionesCP: monto.default(0),
  impuestosLaborales: monto.default(0),
  deudaLP: monto.default(0),
  patrimonio: monto,
});

// Cierres anuales (estado de resultados de un año completo, sin repartir en
// meses) y, opcional, a qué se dedica la empresa según sus estados.
export const cierreAnualSchema = z.object({
  anio: z.number().int().min(2000, "Año inválido").max(2100, "Año inválido"),
  ventas: monto,
  costoVentas: monto.default(0),
  gastosAdmin: monto.default(0),
  gastosVentas: monto.default(0),
  depreciacion: monto.default(0),
  intereses: monto.default(0),
  otrosIngresos: monto.default(0),
  otrosGastos: monto.default(0),
  impuestoRenta: monto.nullable().default(null),
});
export const guardarCierresSchema = z.object({
  cierres: z.array(cierreAnualSchema).min(1, "No hay cierres para guardar").max(10, "Máximo 10 años por carga"),
  actividad: z.string().trim().max(400, "Máximo 400 caracteres").optional(),
});

export const UNIDADES = ["pesos", "miles", "millones"] as const;

// Supuestos de la caja proyectada (montos en pesos, ver lib/finanzas/caja).
const montoPositivo = monto.refine(v => v >= 0, "Los montos no pueden ser negativos");
export const supuestosCajaSchema = z.object({
  nominaMensual: montoPositivo,
  gastosFijosMensuales: montoPositivo,
  cuotaDeudaMensual: montoPositivo,
  proveedoresSemanales: montoPositivo,
  impuestosMensuales: montoPositivo,
  ventasContadoSemanales: montoPositivo,
  ivaBimestral: montoPositivo.default(0),
  ingresosRecurrentes: montoPositivo.default(0),
  plazoRecurrentes: z.number().int().min(0).max(180, "Máximo 180 días de plazo").default(30),
  diaImpuestos: z.number().int().min(1, "Día de impuestos inválido").max(28, "Use un día entre 1 y 28").default(18),
  diasCobro: z.number().int("Días de cobro inválidos").min(0).max(365, "Máximo 365 días de cobro"),
  ventasProyectadas: z.array(z.object({ mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido"), monto: montoPositivo }))
    .max(12, "Máximo 12 meses de ventas proyectadas").default([]),
});

// Cartera por cobrar factura por factura (ver lib/finanzas/caja).
export const facturasSchema = z.object({
  facturas: z.array(z.object({
    cliente: z.string().trim().min(1, "Escriba el cliente").max(120, "Máximo 120 caracteres"),
    monto: montoPositivo.refine(v => v > 0, "El monto debe ser mayor que cero"),
    vence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento inválida"),
  })).min(1, "No hay facturas para guardar").max(500, "Máximo 500 facturas por carga"),
});

// Rentabilidad por cliente (ver lib/finanzas/rentabilidad): se reemplaza completa.
export const rentabilidadSchema = z.object({
  clientes: z.array(z.object({
    cliente: z.string().trim().min(1, "Escriba el cliente").max(120, "Máximo 120 caracteres"),
    ventas: montoPositivo,
    costo: montoPositivo.default(0),
    diasPago: z.number().int().min(0).max(365).nullable().default(null),
  })).max(300, "Máximo 300 clientes"),
});
