/**
 * Lectura con IA de los estados financieros que entrega el contador (PDF,
 * foto o Excel con su propio formato). La IA propone las cifras; el usuario
 * las revisa en pantalla y decide qué guardar. Nada se guarda en la lectura.
 *
 * Aquí viven el esquema que la IA debe llenar (structured outputs) y la
 * limpieza de su respuesta, que es pura para poder probarla sin llamar a la IA.
 */
import { z } from "zod";
import type { Balance, Periodo } from "./estados";

const monto = (desc: string) => z.number().describe(`${desc}. En PESOS colombianos (convierta si el documento está en miles o millones). 0 si no aparece.`);

const montosResultado = {
  ventas: monto("Ingresos operacionales / ventas netas"),
  costoVentas: monto("Costo de ventas o de producción"),
  gastosAdmin: monto("Gastos operacionales de administración"),
  gastosVentas: monto("Gastos operacionales de ventas (mercadeo, comisiones, publicidad)"),
  depreciacion: monto("Depreciaciones y amortizaciones, si aparecen por separado"),
  intereses: monto("Gastos financieros / intereses"),
};

export const lecturaIASchema = z.object({
  unidadDocumento: z.enum(["pesos", "miles", "millones", "desconocida"])
    .describe("Unidad en que vienen las cifras en el documento (para informarle al usuario)"),
  meses: z.array(z.object({
    mes: z.string().describe("Mes en formato YYYY-MM"),
    ...montosResultado,
  })).describe("Estado de resultados de cada MES que aparezca por separado. Vacío si el documento no trae meses individuales."),
  acumulado: z.object({
    desde: z.string().describe("Primer mes del periodo, YYYY-MM"),
    hasta: z.string().describe("Último mes del periodo, YYYY-MM"),
    ...montosResultado,
  }).nullable().describe("Si el estado de resultados cubre VARIOS meses juntos (año o acumulado), sus totales. null si solo hay meses individuales o no hay estado de resultados."),
  balance: z.object({
    corte: z.string().describe("Fecha de corte del balance, YYYY-MM-DD"),
    caja: monto("Efectivo y equivalentes: caja y bancos"),
    cuentasPorCobrar: monto("Deudores comerciales / cuentas por cobrar a clientes"),
    inventario: monto("Inventarios"),
    otrosActivosCorrientes: monto("Demás activos corrientes"),
    activosFijos: monto("Propiedad, planta y equipo neto y demás activos no corrientes"),
    proveedores: monto("Proveedores y cuentas por pagar comerciales"),
    obligacionesCP: monto("Obligaciones financieras de corto plazo"),
    impuestosLaborales: monto("Impuestos por pagar, obligaciones laborales y demás pasivos corrientes"),
    deudaLP: monto("Obligaciones financieras y demás pasivos de largo plazo"),
    patrimonio: monto("Total patrimonio (puede ser negativo)"),
  }).nullable().describe("Balance general (estado de situación financiera) al corte más reciente que aparezca. null si no hay balance."),
  advertencias: z.array(z.string()).describe("Dudas para que el usuario revise: cifras ilegibles, cuentas que no supo clasificar, totales que no cuadran. En español, frases cortas."),
});
export type LecturaIA = z.infer<typeof lecturaIASchema>;

export type Acumulado = Omit<Periodo, "mes"> & { desde: string; hasta: string };

export type LecturaLimpia = {
  periodos: Periodo[];
  acumulado: Acumulado | null;
  balance: (Balance & { corte: string }) | null;
  advertencias: string[];
};

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const RE_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TOPE = 1e14;
const CAMPOS_RESULTADO = ["ventas", "costoVentas", "gastosAdmin", "gastosVentas", "depreciacion", "intereses"] as const;
const CAMPOS_BALANCE = ["caja", "cuentasPorCobrar", "inventario", "otrosActivosCorrientes", "activosFijos",
  "proveedores", "obligacionesCP", "impuestosLaborales", "deudaLP", "patrimonio"] as const;

// Los costos y gastos se guardan en positivo: algunos estados los muestran
// entre paréntesis o con signo menos. El patrimonio sí puede ser negativo.
const positivo = (v: number) => Math.abs(v);
const valido = (v: number) => Number.isFinite(v) && Math.abs(v) < TOPE;

function montosOk<T extends string>(o: Record<T, unknown>, campos: readonly T[]): boolean {
  return campos.every(c => typeof o[c] === "number" && valido(o[c] as number));
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
    porMes.set(m.mes, {
      mes: m.mes, ventas: m.ventas,
      costoVentas: positivo(m.costoVentas), gastosAdmin: positivo(m.gastosAdmin), gastosVentas: positivo(m.gastosVentas),
      depreciacion: positivo(m.depreciacion), intereses: positivo(m.intereses),
    });
  }
  const periodos = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-120);

  let acumulado: Acumulado | null = null;
  if (l.acumulado) {
    const a = l.acumulado;
    if (RE_MES.test(a.desde) && RE_MES.test(a.hasta) && a.desde <= a.hasta && montosOk(a, CAMPOS_RESULTADO)) {
      acumulado = {
        desde: a.desde, hasta: a.hasta, ventas: a.ventas,
        costoVentas: positivo(a.costoVentas), gastosAdmin: positivo(a.gastosAdmin), gastosVentas: positivo(a.gastosVentas),
        depreciacion: positivo(a.depreciacion), intereses: positivo(a.intereses),
      };
    } else {
      advertencias.push("El estado de resultados acumulado no se pudo leer bien y se descartó.");
    }
  }

  let balance: LecturaLimpia["balance"] = null;
  if (l.balance) {
    const b = l.balance;
    if (RE_DIA.test(b.corte) && montosOk(b, CAMPOS_BALANCE)) {
      balance = { corte: b.corte, ...Object.fromEntries(CAMPOS_BALANCE.map(c => [c, c === "patrimonio" ? b[c] : positivo(b[c])])) } as Balance & { corte: string };
    } else {
      advertencias.push("El balance no se pudo leer bien y se descartó.");
    }
  }

  return { periodos, acumulado, balance, advertencias };
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

/**
 * Reparte un estado de resultados acumulado en partes iguales por mes. Es una
 * aproximación (promedio): la pantalla lo dice así y solo se hace si el
 * usuario lo pide.
 */
export function repartirAcumulado(a: Acumulado): Periodo[] {
  const meses = mesesEntre(a.desde, a.hasta);
  const n = meses.length;
  if (n === 0) return [];
  return meses.map(mes => ({
    mes, ventas: a.ventas / n, costoVentas: a.costoVentas / n, gastosAdmin: a.gastosAdmin / n,
    gastosVentas: a.gastosVentas / n, depreciacion: a.depreciacion / n, intereses: a.intereses / n,
  }));
}
