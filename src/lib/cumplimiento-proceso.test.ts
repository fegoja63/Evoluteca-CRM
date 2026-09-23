import { describe, it, expect } from "vitest";
import { calcularCumplimiento, type ActividadCumplimiento } from "./cumplimiento-proceso";

const HOY = new Date("2026-09-15T05:00:00.000Z"); // medianoche Bogotá
const HACE7 = new Date("2026-09-08T05:00:00.000Z");
const dia = (d: number) => new Date(HOY.getTime() + d * 86_400_000);
const nombres = new Map([["ana", "Ana Pérez"], ["luis", "Luis Gómez"]]);

function act(over: Partial<ActividadCumplimiento>): ActividadCumplimiento {
  return { fecha: dia(-1), completada: true, responsableId: "ana", creadoBy: "ana", ...over };
}

describe("calcularCumplimiento", () => {
  it("cuenta agendadas/hechas de los últimos 7 días y el porcentaje", () => {
    const [ana] = calcularCumplimiento(
      [act({}), act({}), act({}), act({ completada: false })],
      [], nombres, HOY, HACE7,
    );
    expect(ana).toMatchObject({ nombre: "Ana Pérez", agendadas7d: 4, hechas7d: 3, pct7d: 75, vencidas: 1 });
  });

  it("una pendiente vieja cuenta como vencida pero no entra en los 7 días", () => {
    const [ana] = calcularCumplimiento([act({ fecha: dia(-30), completada: false })], [], nombres, HOY, HACE7);
    expect(ana).toMatchObject({ vencidas: 1, agendadas7d: 0, pct7d: null });
  });

  it("ignora lo de hoy en adelante (aún no se puede evaluar)", () => {
    const r = calcularCumplimiento([act({ fecha: dia(0), completada: false }), act({ fecha: dia(3), completada: false })], [], nombres, HOY, HACE7);
    expect(r).toEqual([]);
  });

  it("atribuye al responsable, o a quien la creó si no hay responsable", () => {
    const r = calcularCumplimiento([act({ responsableId: null, creadoBy: "luis", completada: false })], [], nombres, HOY, HACE7);
    expect(r[0]).toMatchObject({ id: "luis", vencidas: 1 });
  });

  it("cuenta negocios sin próximo paso por dueño y ordena por urgencia", () => {
    const r = calcularCumplimiento(
      [act({})],
      [{ creadoBy: "luis", pendientesDesdeHoy: 0 }, { creadoBy: "luis", pendientesDesdeHoy: 0 }, { creadoBy: "ana", pendientesDesdeHoy: 2 }],
      nombres, HOY, HACE7,
    );
    expect(r.map(f => [f.id, f.sinProximoPaso])).toEqual([["luis", 2], ["ana", 0]]);
  });

  it("sin dueño cae en 'Sin asignar'", () => {
    const [f] = calcularCumplimiento([], [{ creadoBy: null, pendientesDesdeHoy: 0 }], nombres, HOY, HACE7);
    expect(f).toMatchObject({ id: "sin", nombre: "Sin asignar", sinProximoPaso: 1 });
  });

  it("agrupa en una sola fila los ids de usuarios que ya no existen", () => {
    const r = calcularCumplimiento(
      [act({ responsableId: "borrado1", completada: false }), act({ responsableId: "borrado2", completada: false })],
      [{ creadoBy: "borrado3", pendientesDesdeHoy: 0 }], nombres, HOY, HACE7,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "sin", nombre: "Sin asignar", vencidas: 2, sinProximoPaso: 1 });
  });
});
