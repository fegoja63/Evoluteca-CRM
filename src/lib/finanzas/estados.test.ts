import { describe, it, expect } from "vitest";
import { estadoResultados, sumarPeriodos, ultimosMeses, totalesBalance, balanceCuadra, indicadores, type Periodo, type Balance } from "./estados";

const M = 1_000_000;
const mes = (m: string, ventas: number, costo: number, admin = 30 * M, comercial = 10 * M): Periodo =>
  ({ mes: m, ventas, costoVentas: costo, gastosAdmin: admin, gastosVentas: comercial, depreciacion: 4 * M, intereses: 2 * M });

// Balance que cuadra: activo 492 = pasivo 274 + patrimonio 218 (millones).
const BALANCE: Balance = {
  caja: 40 * M, cuentasPorCobrar: 96 * M, inventario: 6 * M, otrosActivosCorrientes: 10 * M, activosFijos: 340 * M,
  proveedores: 48 * M, obligacionesCP: 30 * M, impuestosLaborales: 36 * M, deudaLP: 160 * M, patrimonio: 218 * M,
};

describe("estadoResultados", () => {
  it("baja de ventas a utilidad neta con el impuesto de renta", () => {
    const r = estadoResultados(mes("2026-09", 136 * M, 65 * M, 33 * M, 11 * M));
    expect(r.utilidadBruta).toBe(71 * M);
    expect(r.ebitda).toBe(27 * M);
    expect(r.ebit).toBe(23 * M);
    expect(r.antesDeImpuestos).toBe(21 * M);
    expect(r.impuesto).toBeCloseTo(21 * M * 0.35);
    expect(r.utilidadNeta).toBeCloseTo(21 * M * 0.65);
  });

  it("con pérdida no causa impuesto", () => {
    const r = estadoResultados(mes("2026-01", 50 * M, 40 * M));
    expect(r.antesDeImpuestos).toBeLessThan(0);
    expect(r.impuesto).toBe(0);
    expect(r.utilidadNeta).toBe(r.antesDeImpuestos);
  });
});

describe("periodos", () => {
  it("suma y toma los últimos meses en orden", () => {
    const ps = [mes("2026-03", 3, 0), mes("2026-01", 1, 0), mes("2026-02", 2, 0)];
    expect(ultimosMeses(ps, 2).map(p => p.mes)).toEqual(["2026-02", "2026-03"]);
    expect(sumarPeriodos(ps).ventas).toBe(6);
  });
});

describe("balance", () => {
  it("totaliza y verifica que cuadre", () => {
    const t = totalesBalance(BALANCE);
    expect(t.activoCorriente).toBe(152 * M);
    expect(t.activoTotal).toBe(492 * M);
    expect(t.pasivoCorriente).toBe(114 * M);
    expect(t.diferencia).toBe(0);
    expect(balanceCuadra(BALANCE)).toBe(true);
    expect(balanceCuadra({ ...BALANCE, caja: 50 * M })).toBe(false);
  });
});

describe("indicadores", () => {
  const doce = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    .map(m => mes(m, 120 * M, 58 * M));
  const porClave = (ps: Periodo[], b: Balance | null) => Object.fromEntries(indicadores(ps, b).map(i => [i.clave, i]));

  it("calcula liquidez, endeudamiento y márgenes con su semáforo", () => {
    const i = porClave(doce, BALANCE);
    expect(i.liquidez.valor).toBeCloseTo(152 / 114);
    expect(i.liquidez.semaforo).toBe("atencion");
    expect(i.endeudamiento.valor).toBeCloseTo(274 / 492);
    expect(i.endeudamiento.semaforo).toBe("atencion");
    expect(i.margenBruto.valor).toBeCloseTo(62 / 120);
    expect(i.margenBruto.semaforo).toBe("bien");
    // Cartera: 96 / (120×3) × 90 = 24 días.
    expect(i.diasCartera.valor).toBeCloseTo(24);
    expect(i.diasCartera.semaforo).toBe("bien");
    expect(i.liquidez.lectura).toContain("$1,33");
  });

  it("sin balance no inventa: pide cargarlo", () => {
    const i = porClave(doce, null);
    expect(i.liquidez.valor).toBeNull();
    expect(i.liquidez.semaforo).toBeNull();
    expect(i.liquidez.lectura).toContain("Cargue el balance");
    expect(i.margenBruto.valor).not.toBeNull();
  });

  it("con patrimonio negativo la rentabilidad del patrimonio no aplica", () => {
    const i = porClave(doce, { ...BALANCE, patrimonio: -10 * M });
    expect(i.roe.valor).toBeNull();
    expect(i.roe.lectura).toContain("no aplica");
  });

  it("sin intereses la cobertura está bien", () => {
    const i = porClave(doce.map(p => ({ ...p, intereses: 0 })), BALANCE);
    expect(i.cobertura.semaforo).toBe("bien");
    expect(i.cobertura.lectura).toContain("No pagó intereses");
  });
});
