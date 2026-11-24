/**
 * Cálculos del Gerente Financiero: estado de resultados, balance e
 * indicadores. Funciones puras (sin base de datos): la misma entrada da la
 * misma salida, para que las pantallas y las pruebas digan lo mismo.
 *
 * Montos en pesos. Los semáforos son guías generales para pymes colombianas,
 * no una norma: cada sector tiene sus rangos, y la pantalla lo aclara.
 */

/** Impuesto de renta estimado (tarifa general de sociedades en Colombia). */
export const TASA_RENTA = 0.35;

export type Periodo = {
  mes: string; // "YYYY-MM" (o "YYYY" en un cierre anual)
  ventas: number;
  costoVentas: number;
  gastosAdmin: number;
  gastosVentas: number;
  depreciacion: number;
  intereses: number;
  /** Ingresos no operacionales (rendimientos, recuperaciones…), sin contar ventas. */
  otrosIngresos?: number;
  /** Gastos no operacionales distintos de los intereses (extraordinarios, comisiones…). */
  otrosGastos?: number;
  /** Impuesto de renta real del contador; null/ausente = se estima con TASA_RENTA. */
  impuestoRenta?: number | null;
};

export type Balance = {
  caja: number;
  cuentasPorCobrar: number;
  inventario: number;
  otrosActivosCorrientes: number;
  /** Inversiones (CDT, fiducias, acciones): activo no corriente, aparte. */
  inversiones?: number;
  activosFijos: number;
  proveedores: number;
  obligacionesCP: number;
  impuestosLaborales: number;
  deudaLP: number;
  patrimonio: number;
};

export type Resultado = Periodo & {
  utilidadBruta: number;
  ebitda: number;
  ebit: number;
  antesDeImpuestos: number;
  impuesto: number;
  /** true = el impuesto es el que reportó el contador; false = estimado al 35 %. */
  impuestoReal: boolean;
  utilidadNeta: number;
};

/** Estado de resultados de un periodo (o de la suma de varios). */
export function estadoResultados(p: Periodo): Resultado {
  const utilidadBruta = p.ventas - p.costoVentas;
  const ebitda = utilidadBruta - p.gastosAdmin - p.gastosVentas;
  const ebit = ebitda - p.depreciacion;
  // Las partidas no operacionales (otros ingresos y gastos) cuentan para la
  // utilidad, no para el EBITDA: es lo que el contador reporta como resultado.
  const antesDeImpuestos = ebit - p.intereses + (p.otrosIngresos ?? 0) - (p.otrosGastos ?? 0);
  // Si el contador reportó el impuesto, ese; si no, se estima (con pérdida no
  // se causa impuesto de renta: simplificación).
  const impuestoReal = p.impuestoRenta != null;
  const impuesto = impuestoReal ? p.impuestoRenta! : antesDeImpuestos > 0 ? antesDeImpuestos * TASA_RENTA : 0;
  return { ...p, utilidadBruta, ebitda, ebit, antesDeImpuestos, impuesto, impuestoReal, utilidadNeta: antesDeImpuestos - impuesto };
}

/** Suma varios periodos en uno (p. ej. los últimos 12 meses). */
export function sumarPeriodos(periodos: Periodo[], mes = "total"): Periodo {
  const t = { mes, ventas: 0, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0, otrosIngresos: 0, otrosGastos: 0 };
  for (const p of periodos) {
    t.ventas += p.ventas; t.costoVentas += p.costoVentas; t.gastosAdmin += p.gastosAdmin;
    t.gastosVentas += p.gastosVentas; t.depreciacion += p.depreciacion; t.intereses += p.intereses;
    t.otrosIngresos += p.otrosIngresos ?? 0; t.otrosGastos += p.otrosGastos ?? 0;
  }
  // El impuesto real solo se suma si todos los periodos lo traen; si no, se estima.
  const todosConImpuesto = periodos.length > 0 && periodos.every(p => p.impuestoRenta != null);
  return { ...t, impuestoRenta: todosConImpuesto ? periodos.reduce((a, p) => a + p.impuestoRenta!, 0) : null };
}

/** Ordena por mes y deja solo los últimos `n`. */
export function ultimosMeses(periodos: Periodo[], n = 12): Periodo[] {
  return [...periodos].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-n);
}

export type TotalesBalance = {
  activoCorriente: number;
  activoTotal: number;
  pasivoCorriente: number;
  pasivoTotal: number;
  /** Activo − (pasivo + patrimonio). Cero si el balance cuadra. */
  diferencia: number;
};

export function totalesBalance(b: Balance): TotalesBalance {
  const activoCorriente = b.caja + b.cuentasPorCobrar + b.inventario + b.otrosActivosCorrientes;
  const activoTotal = activoCorriente + (b.inversiones ?? 0) + b.activosFijos;
  const pasivoCorriente = b.proveedores + b.obligacionesCP + b.impuestosLaborales;
  const pasivoTotal = pasivoCorriente + b.deudaLP;
  return { activoCorriente, activoTotal, pasivoCorriente, pasivoTotal, diferencia: activoTotal - (pasivoTotal + b.patrimonio) };
}

/** Un balance cuadra si la diferencia es menor a $1.000 (redondeos del contador). */
export function balanceCuadra(b: Balance): boolean {
  return Math.abs(totalesBalance(b).diferencia) < 1_000;
}

// ── Indicadores ─────────────────────────────────────────────────────────────

export type Semaforo = "bien" | "atencion" | "riesgo";
export type FormatoIndicador = "veces" | "porcentaje" | "dias";

export type Indicador = {
  clave: string;
  nombre: string;
  grupo: "Liquidez" | "Endeudamiento" | "Rentabilidad" | "Ciclo de caja";
  formato: FormatoIndicador;
  /** null = faltan datos para calcularlo. */
  valor: number | null;
  semaforo: Semaforo | null;
  /** Qué significa este valor, en palabras simples. */
  lectura: string;
};

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

/** Semáforo para un indicador donde más es mejor. */
function masEsMejor(v: number | null, bien: number, atencion: number): Semaforo | null {
  if (v === null) return null;
  return v >= bien ? "bien" : v >= atencion ? "atencion" : "riesgo";
}
/** Semáforo para un indicador donde menos es mejor. */
function menosEsMejor(v: number | null, bien: number, atencion: number): Semaforo | null {
  if (v === null) return null;
  return v <= bien ? "bien" : v <= atencion ? "atencion" : "riesgo";
}

const decimales = (v: number) => v.toFixed(2).replace(".", ",");
const pct = (v: number) => `${Math.round(v * 100)}%`;
const dias = (v: number) => `${Math.round(v)} días`;

/**
 * Indicadores con los últimos 12 meses de resultados y el balance al corte.
 * La rotación de cartera y de proveedores usa los últimos 3 meses, que reflejan
 * mejor el ritmo actual que el año completo.
 *
 * Con `anual`, `periodos` es UN cierre anual: los resultados son los del año y
 * la rotación se calcula sobre 365 días.
 */
export function indicadores(periodos: Periodo[], balance: Balance | null, opciones: { anual?: boolean } = {}): Indicador[] {
  const anual = !!opciones.anual;
  const doce = anual ? periodos.slice(-1) : ultimosMeses(periodos, 12);
  const tres = anual ? doce : ultimosMeses(periodos, 3);
  const diasBase = anual ? 365 : 90;
  const r = estadoResultados(sumarPeriodos(doce));
  const ventas3 = tres.reduce((a, p) => a + p.ventas, 0);
  const costo3 = tres.reduce((a, p) => a + p.costoVentas, 0);
  const b = balance;
  const t = b ? totalesBalance(b) : null;

  const liquidez = t ? div(t.activoCorriente, t.pasivoCorriente) : null;
  const acida = t && b ? div(t.activoCorriente - b.inventario, t.pasivoCorriente) : null;
  const endeudamiento = t ? div(t.pasivoTotal, t.activoTotal) : null;
  const diasCartera = b && ventas3 > 0 ? (b.cuentasPorCobrar / ventas3) * diasBase : null;
  const diasProveedores = b && costo3 > 0 ? (b.proveedores / costo3) * diasBase : null;
  const periodoTxt = anual ? "en el año" : "en 12 meses";
  const margenBruto = div(r.utilidadBruta, r.ventas);
  const margenEbitda = div(r.ebitda, r.ventas);
  const margenNeto = div(r.utilidadNeta, r.ventas);
  // Con patrimonio negativo la rentabilidad del patrimonio no tiene sentido.
  const roe = b ? div(r.utilidadNeta, b.patrimonio) : null;
  const sinIntereses = doce.length > 0 && r.intereses === 0;
  const cobertura = sinIntereses ? null : div(r.ebitda, r.intereses);

  return [
    {
      clave: "liquidez", nombre: "Liquidez corriente", grupo: "Liquidez", formato: "veces",
      valor: liquidez, semaforo: masEsMejor(liquidez, 1.5, 1),
      lectura: liquidez === null ? "Cargue el balance para calcularla."
        : `Por cada $1 que debe a corto plazo, tiene $${decimales(liquidez)} en activos de corto plazo para pagarlo.`,
    },
    {
      clave: "acida", nombre: "Prueba ácida", grupo: "Liquidez", formato: "veces",
      valor: acida, semaforo: masEsMejor(acida, 1, 0.7),
      lectura: acida === null ? "Cargue el balance para calcularla."
        : `Sin contar el inventario, cubre ${Math.round(acida * 100)}% de lo que debe a corto plazo.`,
    },
    {
      clave: "endeudamiento", nombre: "Endeudamiento", grupo: "Endeudamiento", formato: "porcentaje",
      valor: endeudamiento, semaforo: menosEsMejor(endeudamiento, 0.5, 0.7),
      lectura: endeudamiento === null ? "Cargue el balance para calcularlo."
        : `De cada $100 de activos, $${Math.round(endeudamiento * 100)} están financiados por terceros (bancos, proveedores, impuestos).`,
    },
    {
      clave: "cobertura", nombre: "Cobertura de intereses", grupo: "Endeudamiento", formato: "veces",
      valor: cobertura, semaforo: sinIntereses ? "bien" : masEsMejor(cobertura, 3, 1.5),
      lectura: sinIntereses ? `No pagó intereses ${anual ? "en el año" : "en los últimos 12 meses"}.`
        : cobertura === null ? "Faltan resultados para calcularla."
        : `La operación genera ${decimales(cobertura)} veces lo que se paga en intereses.`,
    },
    {
      clave: "margenBruto", nombre: "Margen bruto", grupo: "Rentabilidad", formato: "porcentaje",
      valor: margenBruto, semaforo: masEsMejor(margenBruto, 0.3, 0.15),
      lectura: margenBruto === null ? "Cargue los resultados para calcularlo."
        : `De cada $100 que vende, le quedan $${Math.round(margenBruto * 100)} después del costo directo.`,
    },
    {
      clave: "margenEbitda", nombre: "Margen EBITDA", grupo: "Rentabilidad", formato: "porcentaje",
      valor: margenEbitda, semaforo: masEsMejor(margenEbitda, 0.15, 0.05),
      lectura: margenEbitda === null ? "Cargue los resultados para calcularlo."
        : `La operación deja ${pct(margenEbitda)} de las ventas antes de depreciación, intereses e impuestos.`,
    },
    {
      clave: "margenNeto", nombre: "Margen neto", grupo: "Rentabilidad", formato: "porcentaje",
      valor: margenNeto, semaforo: masEsMejor(margenNeto, 0.08, 0),
      lectura: margenNeto === null ? "Cargue los resultados para calcularlo."
        : margenNeto < 0 ? `Perdió ${pct(-margenNeto)} de las ventas ${anual ? "en el año" : "en los últimos 12 meses"}.`
        : `Le quedan ${pct(margenNeto)} de las ventas como utilidad, después de todo.`,
    },
    {
      clave: "roe", nombre: "Rentabilidad del patrimonio", grupo: "Rentabilidad", formato: "porcentaje",
      valor: roe, semaforo: masEsMejor(roe, 0.15, 0.05),
      lectura: !b ? "Cargue el balance para calcularla."
        : roe === null ? "El patrimonio es cero o negativo: este indicador no aplica."
        : roe < 0 ? `Por cada $100 que tienen invertidos los socios, la empresa perdió $${Math.round(-roe * 100)} ${periodoTxt}.`
        : `Por cada $100 que tienen invertidos los socios, la empresa ganó $${Math.round(roe * 100)} ${periodoTxt}.`,
    },
    {
      clave: "diasCartera", nombre: "Días de cartera", grupo: "Ciclo de caja", formato: "dias",
      valor: diasCartera, semaforo: menosEsMejor(diasCartera, 45, 75),
      lectura: diasCartera === null ? (anual ? "Necesita el balance y las ventas del año." : "Necesita el balance y las ventas de los últimos 3 meses.")
        : `Sus clientes le pagan en promedio a ${dias(diasCartera)}.`,
    },
    {
      clave: "diasProveedores", nombre: "Días de proveedores", grupo: "Ciclo de caja", formato: "dias",
      valor: diasProveedores,
      // Sano si le pagan antes de lo que usted paga: el proveedor le financia el ciclo.
      semaforo: diasProveedores === null || diasCartera === null ? null
        : diasProveedores >= diasCartera ? "bien" : diasProveedores >= diasCartera * 0.6 ? "atencion" : "riesgo",
      lectura: diasProveedores === null ? (anual ? "Necesita el balance y el costo de ventas del año." : "Necesita el balance y el costo de los últimos 3 meses.")
        : diasCartera === null ? `Paga a sus proveedores a ${dias(diasProveedores)}.`
        : diasProveedores >= diasCartera
          ? `Paga a sus proveedores a ${dias(diasProveedores)}, después de cobrarle a sus clientes: bien para la caja.`
          : `Paga a sus proveedores a ${dias(diasProveedores)}, antes de cobrar (${dias(diasCartera)}): la caja financia la diferencia.`,
    },
  ];
}
