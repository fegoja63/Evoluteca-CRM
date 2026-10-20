/**
 * La alerta de caja del Gerente Financiero: proyecta los dos escenarios (con y
 * sin negocios nuevos), calcula los días de caja y arma el mensaje. La usan la
 * pantalla de Caja y el Resumen, para que digan exactamente lo mismo.
 */
import { proyectarCaja, diasDeCaja, diasEntre, salidasMensuales, type NegocioPipeline, type Proyeccion, type Supuestos } from "./caja";
import { diaCorto, millones } from "./formato";
import { rescateDeCaja, type Rescate } from "./simulador";

export type NivelAlerta = "rojo" | "ambar" | "verde";

export type AlertaCaja = {
  nivel: NivelAlerta;
  titulo: string;
  detalle: string;
  conNegocios: Proyeccion;
  sinNegocios: Proyeccion;
  diasCaja: number | null;
  /** Solo en rojo con pipeline: qué negocios cerrar primero para evitarlo. */
  rescate: Rescate | null;
};

type Entrada = {
  hoy: string;
  caja: number;
  cartera: number;
  supuestos: Supuestos;
  pipeline: NegocioPipeline[];
};

export function alertaCaja({ hoy, caja, cartera, supuestos, pipeline }: Entrada): AlertaCaja {
  const base = { hoy, saldoInicial: caja, cartera, supuestos, pipeline };
  const conNegocios = proyectarCaja(base);
  const sinNegocios = proyectarCaja({ ...base, conPipeline: false });
  const diasCaja = diasDeCaja(caja, supuestos);
  // Sin CRM, las ventas proyectadas hacen el papel de los negocios nuevos.
  const hayPipeline = pipeline.length > 0 || (supuestos.ventasProyectadas?.length ?? 0) > 0;

  const sinTxt = !hayPipeline ? ""
    : sinNegocios.primerDiaEnRojo
      ? ` Sin cerrar negocios nuevos, quedaría en rojo el ${diaCorto(sinNegocios.primerDiaEnRojo)}.`
      : " Incluso sin negocios nuevos, alcanza las 13 semanas.";

  if (conNegocios.primerDiaEnRojo) {
    const dias = diasEntre(hoy, conNegocios.primerDiaEnRojo);
    return {
      nivel: "rojo", conNegocios, sinNegocios, diasCaja, rescate: rescateDeCaja(base),
      titulo: dias <= 0 ? "La caja ya está en rojo" : `En ${dias} días la caja queda en rojo: el ${diaCorto(conNegocios.primerDiaEnRojo)}`,
      detalle: `${hayPipeline ? "Ya cuenta el pipeline ponderado. " : ""}El punto más bajo es ${millones(conNegocios.minimo.saldo)} el ${diaCorto(conNegocios.minimo.dia)}.${sinTxt}`,
    };
  }
  // Justa: el punto más bajo cubre menos de 15 días de salidas fijas.
  const quinceDias = salidasMensuales(supuestos) / 2;
  if (quinceDias > 0 && conNegocios.minimo.saldo < quinceDias) {
    return {
      nivel: "ambar", conNegocios, sinNegocios, diasCaja, rescate: null,
      titulo: `La caja alcanza, pero queda justa el ${diaCorto(conNegocios.minimo.dia)}`,
      detalle: `El punto más bajo es ${millones(conNegocios.minimo.saldo)}: menos de 15 días de gastos.${sinTxt}`,
    };
  }
  return {
    nivel: "verde", conNegocios, sinNegocios, diasCaja, rescate: null,
    titulo: "Caja positiva las próximas 13 semanas",
    detalle: `El punto más bajo es ${millones(conNegocios.minimo.saldo)} el ${diaCorto(conNegocios.minimo.dia)}.${sinTxt}`,
  };
}

export const ESTILO_ALERTA: Record<NivelAlerta, string> = {
  rojo: "border-red-200 bg-red-50 text-red-800",
  ambar: "border-amber-200 bg-amber-50 text-amber-800",
  verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
};
