/**
 * Lectura con IA de los estados financieros que entrega el contador (PDF,
 * foto o Excel con su propio formato). La IA propone las cifras; el usuario
 * las revisa en pantalla y decide qué guardar. Nada se guarda en la lectura.
 *
 * Sirve para estados MENSUALES (columnas por mes) y para el CIERRE ANUAL que
 * entregan los contadores (un año contra el anterior, con partidas no
 * operacionales e impuesto de renta real): un año completo se guarda como
 * cierre anual, sin repartirlo en meses.
 *
 * Aquí viven el esquema que la IA debe llenar (structured outputs) y la
 * limpieza de su respuesta, que es pura para poder probarla sin llamar a la IA.
 */
import { z } from "zod";
import type { Balance, Periodo } from "./estados";

const monto = (desc: string) => z.number().describe(`${desc}. En PESOS colombianos (convierta si el documento está en miles o millones). 0 si no aparece.`);

const montosResultado = {
  ventas: monto("Ingresos operacionales / ventas netas (descontando devoluciones). NO incluya los ingresos no operacionales"),
  costoVentas: monto("Costo de ventas o de producción"),
  gastosAdmin: monto("Gastos operacionales de administración, SIN la depreciación si esta aparece como línea propia (va aparte)"),
  gastosVentas: monto("Gastos operacionales de ventas (mercadeo, comisiones, publicidad)"),
  depreciacion: monto("Depreciaciones y amortizaciones, si aparecen por separado (en ese caso réstelas de los gastos donde estén incluidas)"),
  intereses: monto("Gastos financieros: intereses, comisiones y gastos bancarios"),
  otrosIngresos: monto("Ingresos NO operacionales: financieros, rendimientos, recuperaciones, indemnizaciones, aprovechamientos, diversos"),
  otrosGastos: monto("Gastos NO operacionales distintos de los financieros: extraordinarios, condonaciones, multas, pérdidas en venta, diversos"),
  impuestoRenta: z.number().nullable().describe("Impuesto de renta y complementarios del periodo, tal como lo reporta el documento, en PESOS. null si no aparece."),
};

const balanceIA = z.object({
  corte: z.string().describe("Fecha de corte del balance, YYYY-MM-DD"),
  caja: monto("Efectivo y equivalentes: caja y bancos"),
  cuentasPorCobrar: monto("Deudores comerciales: cuentas por cobrar a CLIENTES, netas de provisión"),
  inventario: monto("Inventarios"),
  otrosActivosCorrientes: monto("Demás activos corrientes: anticipos, préstamos a empleados o socios, deudores varios, impuestos a favor"),
  inversiones: monto("Inversiones: CDT, fiducias, derechos fiduciarios, acciones, carteras colectivas (corrientes o no)"),
  activosFijos: monto("Propiedad, planta y equipo neto (después de depreciación) y demás activos no corrientes que no sean inversiones"),
  proveedores: monto("Proveedores y cuentas por pagar comerciales"),
  obligacionesCP: monto("Obligaciones financieras de corto plazo (bancos, tarjetas de crédito)"),
  impuestosLaborales: monto("Impuestos por pagar, obligaciones laborales, deudas con socios y demás pasivos corrientes"),
  deudaLP: monto("Obligaciones financieras y demás pasivos de largo plazo"),
  patrimonio: monto("Total patrimonio (puede ser negativo)"),
});

const acumuladoIA = z.object({
  desde: z.string().describe("Primer mes del periodo, YYYY-MM"),
  hasta: z.string().describe("Último mes del periodo, YYYY-MM"),
  ...montosResultado,
});

export const lecturaIASchema = z.object({
  unidadDocumento: z.enum(["pesos", "miles", "millones", "desconocida"])
    .describe("Unidad en que vienen las cifras en el documento (para informarle al usuario)"),
  meses: z.array(z.object({
    mes: z.string().describe("Mes en formato YYYY-MM"),
    ...montosResultado,
  })).describe("Estado de resultados de cada MES que aparezca por separado. Vacío si el documento no trae meses individuales."),
  acumulado: acumuladoIA.nullable().describe("Si el estado de resultados cubre VARIOS meses juntos (un año o un acumulado), los totales del periodo MÁS RECIENTE. null si solo hay meses individuales o no hay estado de resultados."),
  acumuladoAnterior: acumuladoIA.nullable().describe("Si el documento trae además la columna comparativa del periodo anterior (por ejemplo el año pasado), sus totales. null si no la trae."),
  balance: balanceIA.nullable().describe("Balance general (estado de situación financiera) al corte más reciente. null si no hay balance."),
  balanceAnterior: balanceIA.nullable().describe("El balance del corte anterior si el documento lo trae como columna comparativa. null si no."),
  actividad: z.string().describe("A qué se dedica la empresa SEGÚN EL DOCUMENTO (notas, objeto social, nombres de las cuentas de ingreso), en una o dos frases. Vacío si el documento no lo dice. Nunca lo deduzca del nombre de la empresa."),
  advertencias: z.array(z.string()).describe("Dudas para que el usuario revise: cifras ilegibles, cuentas que no supo clasificar, totales que no cuadran. En español, frases cortas."),
});
export type LecturaIA = z.infer<typeof lecturaIASchema>;

export type Acumulado = Omit<Periodo, "mes"> & { desde: string; hasta: string };
type BalanceConCorte = Balance & { corte: string };

export type LecturaLimpia = {
  periodos: Periodo[];
  acumulado: Acumulado | null;
  acumuladoAnterior: Acumulado | null;
  balance: BalanceConCorte | null;
  balanceAnterior: BalanceConCorte | null;
  actividad: string;
  advertencias: string[];
};

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const RE_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TOPE = 1e14;
const CAMPOS_RESULTADO = ["ventas", "costoVentas", "gastosAdmin", "gastosVentas", "depreciacion", "intereses", "otrosIngresos", "otrosGastos"] as const;
// Los no operacionales pueden faltar (respuestas con el formato anterior): cuentan como 0.
const OPCIONALES = new Set<string>(["otrosIngresos", "otrosGastos", "inversiones"]);
const CAMPOS_BALANCE = ["caja", "cuentasPorCobrar", "inventario", "otrosActivosCorrientes", "inversiones", "activosFijos",
  "proveedores", "obligacionesCP", "impuestosLaborales", "deudaLP", "patrimonio"] as const;

// Los costos y gastos se guardan en positivo: algunos estados los muestran
// entre paréntesis o con signo menos. El patrimonio sí puede ser negativo, y
// el impuesto de renta también (un ingreso por impuesto diferido).
const positivo = (v: number) => Math.abs(v);
const valido = (v: number) => Number.isFinite(v) && Math.abs(v) < TOPE;

function montosOk<T extends string>(o: Record<T, unknown>, campos: readonly T[]): boolean {
  return campos.every(c => (o[c] === undefined && OPCIONALES.has(c)) || (typeof o[c] === "number" && valido(o[c] as number)));
}

type MontosIA = { [K in (typeof CAMPOS_RESULTADO)[number]]: number } & { impuestoRenta: number | null };

function montosLimpios(m: MontosIA): Omit<Periodo, "mes"> {
  return {
    ventas: m.ventas,
    costoVentas: positivo(m.costoVentas), gastosAdmin: positivo(m.gastosAdmin), gastosVentas: positivo(m.gastosVentas),
    depreciacion: positivo(m.depreciacion), intereses: positivo(m.intereses),
    otrosIngresos: positivo(m.otrosIngresos ?? 0), otrosGastos: positivo(m.otrosGastos ?? 0),
    impuestoRenta: m.impuestoRenta != null && valido(m.impuestoRenta) ? m.impuestoRenta : null,
  };
}

function limpiarAcumulado(a: z.infer<typeof acumuladoIA> | null, nombre: string, advertencias: string[]): Acumulado | null {
  if (!a) return null;
  if (RE_MES.test(a.desde) && RE_MES.test(a.hasta) && a.desde <= a.hasta && montosOk(a, CAMPOS_RESULTADO)) {
    return { desde: a.desde, hasta: a.hasta, ...montosLimpios(a) };
  }
  advertencias.push(`El estado de resultados ${nombre} no se pudo leer bien y se descartó.`);
  return null;
}

function limpiarBalance(b: z.infer<typeof balanceIA> | null, nombre: string, advertencias: string[]): BalanceConCorte | null {
  if (!b) return null;
  if (RE_DIA.test(b.corte) && montosOk(b, CAMPOS_BALANCE)) {
    return { corte: b.corte, ...Object.fromEntries(CAMPOS_BALANCE.map(c => [c, c === "patrimonio" ? b[c] : positivo(b[c] ?? 0)])) } as BalanceConCorte;
  }
  advertencias.push(`El balance ${nombre} no se pudo leer bien y se descartó.`);
  return null;
}

/** Valida lo que devolvió la IA y lo deja listo para mostrar y guardar. */
export function limpiarLecturaIA(l: LecturaIA): LecturaLimpia {
  const advertencias = l.advertencias.map(a => a.trim()).filter(Boolean).slice(0, 15);

  const porMes = new Map<string, Periodo>();
  for (const m of l.meses) {
    if (!RE_MES.test(m.mes) || !montosOk(m, CAMPOS_RESULTADO)) {
      advertencias.push(`Se descartó un mes que no se pudo leer bien (${m.mes || "sin fecha"}).`);
      continue;
    }
    porMes.set(m.mes, { mes: m.mes, ...montosLimpios(m) });
  }
  const periodos = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-120);

  const acumulado = limpiarAcumulado(l.acumulado, "acumulado", advertencias);
  let acumuladoAnterior = limpiarAcumulado(l.acumuladoAnterior ?? null, "del periodo anterior", advertencias);
  // El comparativo tiene que ser anterior al periodo principal.
  if (acumulado && acumuladoAnterior && acumuladoAnterior.hasta >= acumulado.desde) acumuladoAnterior = null;

  const balance = limpiarBalance(l.balance, "", advertencias);
  let balanceAnterior = limpiarBalance(l.balanceAnterior ?? null, "anterior", advertencias);
  if (balance && balanceAnterior && balanceAnterior.corte >= balance.corte) balanceAnterior = null;

  return {
    periodos, acumulado, acumuladoAnterior, balance, balanceAnterior,
    actividad: (l.actividad ?? "").trim().slice(0, 400),
    advertencias,
  };
}

/** Meses entre dos "YYYY-MM", ambos incluidos. */
export function mesesEntre(desde: string, hasta: string): string[] {
  const [a1, m1] = desde.split("-").map(Number);
  const [a2, m2] = hasta.split("-").map(Number);
  const total = (a2 - a1) * 12 + (m2 - m1) + 1;
  if (!(total > 0) || total > 120) return [];
  return Array.from({ length: total }, (_, i) => {
    const n = m1 - 1 + i;
    return `${a1 + Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
  });
}

/** Si el acumulado es un año calendario completo (ene–dic), su año; si no, null. */
export function anioCompleto(a: Pick<Acumulado, "desde" | "hasta">): number | null {
  const anio = a.desde.slice(0, 4);
  return a.desde === `${anio}-01` && a.hasta === `${anio}-12` ? Number(anio) : null;
}

/**
 * Reparte un estado de resultados acumulado en partes iguales por mes. Es una
 * aproximación (promedio): la pantalla lo dice así y solo se hace si el
 * usuario lo pide. Un año completo NO se reparte: se guarda como cierre anual.
 */
export function repartirAcumulado(a: Acumulado): Periodo[] {
  const meses = mesesEntre(a.desde, a.hasta);
  const n = meses.length;
  if (n === 0) return [];
  return meses.map(mes => ({
    mes, ventas: a.ventas / n, costoVentas: a.costoVentas / n, gastosAdmin: a.gastosAdmin / n,
    gastosVentas: a.gastosVentas / n, depreciacion: a.depreciacion / n, intereses: a.intereses / n,
    otrosIngresos: (a.otrosIngresos ?? 0) / n, otrosGastos: (a.otrosGastos ?? 0) / n,
    impuestoRenta: a.impuestoRenta != null ? a.impuestoRenta / n : null,
  }));
}
