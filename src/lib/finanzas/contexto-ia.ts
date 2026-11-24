/**
 * El resumen financiero que recibe el gerente con IA. Todas las cifras las
 * calcula el código (estados, indicadores, caja, punto de equilibrio); la IA
 * solo las lee e interpreta, y tiene instrucción de no citar ninguna otra.
 * Va en millones de pesos con un decimal: más corto y más fácil de leer.
 */
import { estadoResultados, sumarPeriodos, ultimosMeses, totalesBalance, indicadores, type Balance, type Periodo } from "./estados";
import { puntoEquilibrio, salidasMensuales, diasEntre, type FacturaPorCobrar, type NegocioPipeline, type Supuestos } from "./caja";
import { alertaCaja } from "./alerta-caja";
import { analizarClientes, type ClienteRentabilidad } from "./rentabilidad";
import { ACLARACION_MODO, mesesDesde, type ModoAnalisis } from "./modo";

const mm = (v: number) => Math.round(v / 100_000) / 10;

type Entrada = {
  empresa: string;
  hoy: string;
  /** Meses de cálculo (en el modo anual, el último año repartido en promedios). */
  periodos: Periodo[];
  /** Modo del análisis y cierres anuales (ver lib/finanzas/modo). */
  modo?: ModoAnalisis;
  cierres?: Periodo[];
  /** A qué se dedica la empresa según sus estados financieros. */
  actividad?: string | null;
  balance: (Balance & { corte: string }) | null;
  balanceAnterior?: (Balance & { corte: string }) | null;
  supuestos: Supuestos;
  supuestosGuardados: boolean;
  pipeline: NegocioPipeline[];
  carteraDetalle?: FacturaPorCobrar[];
  rentabilidadClientes?: ClienteRentabilidad[];
};

/** Un estado de resultados con todas sus líneas, en millones. */
function lineas(r: ReturnType<typeof estadoResultados>) {
  return {
    ventas: mm(r.ventas), costoVentas: mm(r.costoVentas), utilidadBruta: mm(r.utilidadBruta),
    gastosAdmin: mm(r.gastosAdmin), gastosVentas: mm(r.gastosVentas), ebitda: mm(r.ebitda), depreciacion: mm(r.depreciacion),
    intereses: mm(r.intereses), otrosIngresosNoOperacionales: mm(r.otrosIngresos ?? 0), otrosGastosNoOperacionales: mm(r.otrosGastos ?? 0),
    utilidadAntesDeImpuestos: mm(r.antesDeImpuestos), impuestoRenta: mm(r.impuesto),
    impuestoRentaOrigen: r.impuestoReal ? "reportado por el contador" : "estimado al 35 %", utilidadNeta: mm(r.utilidadNeta),
  };
}

function datosDelBalance(bal: Balance & { corte: string }) {
  const t = totalesBalance(bal);
  return {
    corte: bal.corte, caja: mm(bal.caja), cuentasPorCobrar: mm(bal.cuentasPorCobrar), inventario: mm(bal.inventario),
    otrosActivosCorrientes: mm(bal.otrosActivosCorrientes), inversiones: mm(bal.inversiones ?? 0), activosFijos: mm(bal.activosFijos),
    activoCorriente: mm(t.activoCorriente), activoTotal: mm(t.activoTotal), proveedores: mm(bal.proveedores),
    pasivoCorriente: mm(t.pasivoCorriente), pasivoTotal: mm(t.pasivoTotal), patrimonio: mm(bal.patrimonio),
  };
}

export function contextoFinanciero(d: Entrada) {
  const anual = d.modo === "anual";
  const cierres = (d.cierres ?? []).map(estadoResultados);
  const meses = anual ? [] : ultimosMeses(d.periodos, 12).map(estadoResultados);
  const total = estadoResultados(sumarPeriodos(meses));
  const ultimoDato = anual ? cierres[cierres.length - 1]?.mes : meses[meses.length - 1]?.mes;
  const pe = puntoEquilibrio(d.periodos);
  const alerta = d.balance
    ? alertaCaja({ hoy: d.hoy, caja: d.balance.caja, cartera: d.balance.cuentasPorCobrar, carteraDetalle: d.carteraDetalle, supuestos: d.supuestos, pipeline: d.pipeline })
    : null;

  return {
    empresa: d.empresa,
    hoy: d.hoy,
    unidad: "millones de pesos colombianos (COP)",
    modoDelAnalisis: anual ? "anual (cierre de año)" : "mensual",
    aclaracionDelModo: ACLARACION_MODO[anual ? "anual" : "mensual"],
    actividadDeLaEmpresa: d.actividad || "no informada en los estados: no la deduzca del nombre de la empresa",
    mesesDesdeElUltimoDato: ultimoDato ? mesesDesde(ultimoDato, d.hoy) : null,
    cierresAnuales: anual ? cierres.map(c => ({ anio: c.mes, ...lineas(c) })) : null,
    estadoDeResultadosPorMes: anual ? null : meses.map(m => ({ mes: m.mes, ...lineas(m) })),
    totalUltimosMeses: meses.length ? {
      meses: meses.length, ...lineas(total),
    } : null,
    balance: d.balance ? datosDelBalance(d.balance) : null,
    balanceAnterior: d.balanceAnterior ? datosDelBalance(d.balanceAnterior) : null,
    indicadores: (anual ? indicadores(d.cierres!.slice(-1), d.balance, { anual: true }) : indicadores(d.periodos, d.balance)).filter(i => i.valor !== null).map(i => ({
      nombre: i.nombre, valor: i.formato === "porcentaje" ? `${Math.round(i.valor! * 100)} %` : i.formato === "dias" ? `${Math.round(i.valor!)} días` : `${i.valor!.toFixed(2)} veces`,
      semaforo: i.semaforo, lectura: i.lectura,
    })),
    puntoDeEquilibrio: pe ? {
      nota: anual ? "Calculado con promedios mensuales del cierre anual (año ÷ 12)." : undefined,
      ventasMensualesNecesarias: mm(pe.ventasNecesarias), gastosFijosMensuales: mm(pe.gastosFijos),
      margenContribucion: `${Math.round(pe.margenContribucion * 100)} %`, ventasUltimoMes: mm(pe.ventasUltimoMes), mesUltimo: pe.mesUltimo,
    } : null,
    cajaProyectada13Semanas: alerta ? {
      nivel: alerta.nivel, mensaje: `${alerta.titulo}. ${alerta.detalle}`,
      diasDeCaja: alerta.diasCaja,
      puntoMasBajo: { saldo: mm(alerta.conNegocios.minimo.saldo), dia: alerta.conNegocios.minimo.dia },
      primerDiaEnRojo: alerta.conNegocios.primerDiaEnRojo,
      primerDiaEnRojoSinNegociosNuevos: alerta.sinNegocios.primerDiaEnRojo,
      saldoAlCierreDeCadaSemana: alerta.conNegocios.semanas.map(w => ({ semanaDel: w.inicio, saldo: mm(w.saldo) })),
    } : null,
    supuestosDeCaja: {
      origen: d.supuestosGuardados ? "confirmados por la empresa" : "sugeridos automáticamente desde los estados (la nómina va dentro de gastos fijos)",
      nominaMensual: mm(d.supuestos.nominaMensual), gastosFijosMensuales: mm(d.supuestos.gastosFijosMensuales),
      cuotaCreditosMensual: mm(d.supuestos.cuotaDeudaMensual), proveedoresSemanales: mm(d.supuestos.proveedoresSemanales),
      impuestosMensuales: mm(d.supuestos.impuestosMensuales), ivaBimestral: mm(d.supuestos.ivaBimestral ?? 0), diaPagoDian: d.supuestos.diaImpuestos ?? 18,
      ventasContadoSemanales: mm(d.supuestos.ventasContadoSemanales),
      ingresosRecurrentesMensuales: mm(d.supuestos.ingresosRecurrentes ?? 0), plazoRecurrentesDias: d.supuestos.plazoRecurrentes ?? 30,
      diasCobro: d.supuestos.diasCobro, salidasFijasDeUnMes: mm(salidasMensuales(d.supuestos)),
    },
    carteraPorCliente: d.carteraDetalle?.length ? d.carteraDetalle.map(f => ({
      cliente: f.cliente, monto: mm(f.monto), vence: f.vence, diasVencida: Math.max(0, diasEntre(f.vence, d.hoy)),
    })) : null,
    rentabilidadPorCliente12Meses: d.rentabilidadClientes?.length ? analizarClientes(d.rentabilidadClientes).map(c => ({
      cliente: c.cliente, ventas: mm(c.ventas), margenBruto: `${Math.round(c.margen * 100)} %`, diasPago: c.diasPago,
      compraMuchoDejaPoco: c.compraMuchoDejaPoco,
    })) : null,
    pipelineCRM: d.pipeline.length ? {
      negocios: d.pipeline.length,
      valorTotal: mm(d.pipeline.reduce((a, n) => a + n.valor, 0)),
      valorPonderado: mm(d.pipeline.reduce((a, n) => a + n.valor * ((n.probabilidad ?? 50) / 100), 0)),
      cierresVencidos: d.pipeline.filter(n => n.fechaCierre < d.hoy).length,
      principales: [...d.pipeline].sort((a, b) => b.valor * (b.probabilidad ?? 50) - a.valor * (a.probabilidad ?? 50)).slice(0, 8)
        .map(n => ({ negocio: n.titulo, valor: mm(n.valor), probabilidad: n.probabilidad ?? 50, cierre: n.fechaCierre })),
    } : null,
  };
}
