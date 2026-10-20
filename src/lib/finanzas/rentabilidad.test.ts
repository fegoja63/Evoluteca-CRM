import { describe, it, expect } from "vitest";
import { analizarClientes, resumenClientes } from "./rentabilidad";

const M = 1_000_000;
const FILAS = [
  { cliente: "Grupo Éxito", ventas: 310 * M, costo: 236 * M, diasPago: 52 },
  { cliente: "EPM", ventas: 280 * M, costo: 151 * M, diasPago: 41 },
  { cliente: "Comfama", ventas: 190 * M, costo: 160 * M, diasPago: 78 },
  { cliente: "EAFIT", ventas: 125 * M, costo: 61 * M, diasPago: null },
  { cliente: "Sin ventas", ventas: 0, costo: 0, diasPago: null },
];

describe("analizarClientes", () => {
  const c = analizarClientes(FILAS);

  it("ordena por ventas, calcula el margen y descarta clientes sin ventas", () => {
    expect(c.map(x => x.cliente)).toEqual(["Grupo Éxito", "EPM", "Comfama", "EAFIT"]);
    expect(c[1].margen).toBeCloseTo(129 / 280);
    expect(c[1].semaforo).toBe("bien");
  });

  it("marca a quien compra mucho y deja poco, y a quien paga tarde", () => {
    const exito = c.find(x => x.cliente === "Grupo Éxito")!;
    expect(exito.compraMuchoDejaPoco).toBe(true);
    expect(exito.semaforo).toBe("riesgo");
    const comfama = c.find(x => x.cliente === "Comfama")!;
    expect(comfama.pagaTarde).toBe(true);
    expect(c.find(x => x.cliente === "EPM")!.compraMuchoDejaPoco).toBe(false);
  });

  it("resume ventas, margen ponderado y días de pago ponderados", () => {
    const r = resumenClientes(c);
    expect(r.ventas).toBe(905 * M);
    expect(r.margen).toBeCloseTo((905 - 608) / 905);
    expect(r.diasPagoPromedio).toBeCloseTo((310 * 52 + 280 * 41 + 190 * 78) / 780);
  });
});
