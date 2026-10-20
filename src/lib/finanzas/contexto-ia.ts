/**
 * El resumen financiero que recibe el gerente con IA. Todas las cifras las
 * calcula el código (estados, indicadores, caja, punto de equilibrio); la IA
 * solo las lee e interpreta, y tiene instrucción de no citar ninguna otra.
 * Va en millones de pesos con un decimal: más corto y más fácil de leer.
 */
import { estadoResultados, sumarPeriodos, ultimosMeses, totalesBalance, indicadores, type Balance, type Periodo } from "./estados";
import { puntoEquilibrio, salidasMensuales, type NegocioPipeline, type Supuestos } from "./caja";
import { alertaCaja } from "./alerta-caja";

const mm = (v: number) => Math.round(v / 100_000) / 10;

type Entrada = {
  empresa: string;
  hoy: string;
  periodos: Periodo[];
  balance: (Balance & { corte: string }) | null;
  supuestos: Supuestos;
  supuestosGuardados: boolean;
  pipeline: NegocioPipeline[];
};

export function contextoFinanciero(d: Entrada) {
  const meses = ultimosMeses(d.periodos, 12).map(estadoResultados);
  const total = estadoResultados(sumarPeriodos(meses));
  const pe = puntoEquilibrio(d.periodos);
  const alerta = d.balance
    ? alertaCaja({ hoy: d.hoy, caja: d.balance.caja, cartera: d.balance.cuentasPorCobrar, supuestos: d.supuestos, pipeline: d.pipeline })
    : null;

  return {
    empresa: d.empresa,
    hoy: d.hoy,
    unidad: "millones de pesos colombianos (COP)",
    estadoDeResultadosPorMes: meses.map(m => ({
      mes: m.mes, ventas: mm(m.ventas), costoVentas: mm(m.costoVentas), utilidadBruta: mm(m.utilidadBruta),
      gastosAdmin: mm(m.gastosAdmin), gastosVentas: mm(m.gastosVentas), ebitda: mm(m.ebitda), utilidadNeta: mm(m.utilidadNeta),
    })),
    totalUltimosMeses: meses.length ? {
      meses: meses.length, ventas: mm(total.ventas), utilidadBruta: mm(total.utilidadBruta), ebitda: mm(total.ebitda),
      utilidadNeta: mm(total.utilidadNeta), nota: "La utilidad neta usa un impuesto de renta estimado del 35 %.",
    } : null,
    balance: d.balance ? (() => {
      const t = totalesBalance(d.balance);
      const b = d.balance;
      return {
        corte: b.corte, caja: mm(b.caja), cuentasPorCobrar: mm(b.cuentasPorCobrar), inventario: mm(b.inventario),
        activoCorriente: mm(t.activoCorriente), activoTotal: mm(t.activoTotal), proveedores: mm(b.proveedores),
        pasivoCorriente: mm(t.pasivoCorriente), pasivoTotal: mm(t.pasivoTotal), patrimonio: mm(b.patrimonio),
      };
    })() : null,
    indicadores: indicadores(d.periodos, d.balance).filter(i => i.valor !== null).map(i => ({
      nombre: i.nombre, valor: i.formato === "porcentaje" ? `${Math.round(i.valor! * 100)} %` : i.formato === "dias" ? `${Math.round(i.valor!)} días` : `${i.valor!.toFixed(2)} veces`,
      semaforo: i.semaforo, lectura: i.lectura,
    })),
    puntoDeEquilibrio: pe ? {
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
