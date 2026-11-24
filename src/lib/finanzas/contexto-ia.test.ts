import { describe, it, expect } from "vitest";
import { contextoFinanciero } from "./contexto-ia";
import type { Supuestos } from "./caja";

const M = 1_000_000;
const SUPUESTOS: Supuestos = {
  nominaMensual: 25 * M, gastosFijosMensuales: 15 * M, cuotaDeudaMensual: 2 * M, proveedoresSemanales: 14 * M,
  impuestosMensuales: 0, ventasContadoSemanales: 0, diasCobro: 22,
};
const mes = (m: string, ventas: number) => ({ mes: m, ventas, costoVentas: ventas / 2, gastosAdmin: 30 * M, gastosVentas: 10 * M, depreciacion: 4 * M, intereses: 2 * M });
const BALANCE = {
  corte: "2026-09-30", caja: 40 * M, cuentasPorCobrar: 96 * M, inventario: 6 * M, otrosActivosCorrientes: 10 * M, activosFijos: 340 * M,
  proveedores: 48 * M, obligacionesCP: 30 * M, impuestosLaborales: 36 * M, deudaLP: 160 * M, patrimonio: 218 * M,
};

describe("contextoFinanciero", () => {
  const c = contextoFinanciero({
    empresa: "Teatro de ejemplo", hoy: "2026-10-20",
    periodos: [mes("2026-08", 124 * M), mes("2026-09", 136.04 * M)],
    balance: BALANCE, supuestos: SUPUESTOS, supuestosGuardados: false,
    pipeline: [
      { titulo: "Bancolombia", valor: 48 * M, probabilidad: 70, fechaCierre: "2026-11-05" },
      { titulo: "Vencido", valor: 10 * M, probabilidad: null, fechaCierre: "2026-09-01" },
    ],
  });

  it("lleva las cifras en millones con un decimal", () => {
    expect(c.unidad).toContain("millones");
    expect(c.estadoDeResultadosPorMes![1]).toMatchObject({ mes: "2026-09", ventas: 136, costoVentas: 68 });
    expect(c.balance).toMatchObject({ caja: 40, activoTotal: 492, patrimonio: 218 });
  });

  it("incluye indicadores calculados, caja proyectada y punto de equilibrio", () => {
    expect(c.indicadores.find(i => i.nombre === "Liquidez corriente")?.valor).toBe("1.33 veces");
    expect(c.cajaProyectada13Semanas?.saldoAlCierreDeCadaSemana).toHaveLength(13);
    expect(c.puntoDeEquilibrio?.ventasMensualesNecesarias).toBeGreaterThan(0);
  });

  it("dice si los supuestos son sugeridos y resume el pipeline", () => {
    expect(c.supuestosDeCaja.origen).toContain("sugeridos");
    expect(c.pipelineCRM).toMatchObject({ negocios: 2, valorTotal: 58, valorPonderado: 38.6, cierresVencidos: 1 });
    expect(c.pipelineCRM?.principales[0].negocio).toBe("Bancolombia");
  });

  it("sin balance no inventa caja ni balance", () => {
    const sin = contextoFinanciero({ empresa: "X", hoy: "2026-10-20", periodos: [mes("2026-09", 100 * M)], balance: null, supuestos: SUPUESTOS, supuestosGuardados: true, pipeline: [] });
    expect(sin.balance).toBeNull();
    expect(sin.cajaProyectada13Semanas).toBeNull();
    expect(sin.pipelineCRM).toBeNull();
  });
});

describe("contextoFinanciero con un cierre anual", () => {
  const cierre = { ...mes("2025", 2299 * M), otrosGastos: 1100 * M, impuestoRenta: 180 * M };
  const c = contextoFinanciero({
    empresa: "Huertas de prueba", hoy: "2026-11-24", modo: "anual", cierres: [mes("2024", 2117 * M), cierre],
    actividad: "Arrendamiento de bienes inmuebles", periodos: [], balance: BALANCE, supuestos: SUPUESTOS, supuestosGuardados: true, pipeline: [],
  });

  it("manda los años completos con la utilidad real y no meses", () => {
    expect(c.modoDelAnalisis).toContain("anual");
    expect(c.estadoDeResultadosPorMes).toBeNull();
    expect(c.cierresAnuales?.map(x => x.anio)).toEqual(["2024", "2025"]);
    expect(c.cierresAnuales?.[1]).toMatchObject({ otrosGastosNoOperacionales: 1100, impuestoRenta: 180, impuestoRentaOrigen: "reportado por el contador" });
    expect(c.cierresAnuales?.[1].utilidadNeta).toBeLessThan(0);
  });

  it("dice a qué se dedica la empresa, cuánto hace del último dato y aclara el modo", () => {
    expect(c.actividadDeLaEmpresa).toBe("Arrendamiento de bienes inmuebles");
    expect(c.mesesDesdeElUltimoDato).toBe(11);
    expect(c.aclaracionDelModo).toContain("cierre anual");
  });
});
