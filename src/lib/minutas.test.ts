import { describe, it, expect } from "vitest";
import { limpiarMinutaIA, fechaCompromisoValida, minutaATexto, guardarMinutaSchema, type MinutaIA } from "./minutas";

const AHORA = new Date("2026-09-24T15:00:00.000Z");

const base: MinutaIA = {
  titulo: "  Revisión de propuesta  ",
  resumen: " El cliente revisó la propuesta. ",
  asistentes: [{ nombre: "Ana Pérez", rol: "Gerente", lado: "CLIENTE" }, { nombre: "  ", rol: null, lado: "DESCONOCIDO" }],
  acuerdos: ["Ajustar el alcance", "  "],
  compromisos: [
    { descripcion: "Enviar propuesta ajustada", responsable: " Luis ", lado: "NOSOTROS", fecha: "2026-09-26" },
    { descripcion: "Confirmar presupuesto", responsable: null, lado: "CLIENTE", fecha: "2099-01-01" },
    { descripcion: "  ", responsable: null, lado: "NOSOTROS", fecha: null },
  ],
  proximosPasos: ["Reunión de cierre"],
  riesgos: ["Precio alto frente a la competencia"],
};

describe("limpiarMinutaIA", () => {
  it("recorta textos, quita vacíos y descarta fechas absurdas", () => {
    const m = limpiarMinutaIA(base, AHORA);
    expect(m.titulo).toBe("Revisión de propuesta");
    expect(m.asistentes).toHaveLength(1);
    expect(m.acuerdos).toEqual(["Ajustar el alcance"]);
    expect(m.compromisos).toHaveLength(2);
    expect(m.compromisos[0]).toMatchObject({ responsable: "Luis", fecha: "2026-09-26" });
    expect(m.compromisos[1].fecha).toBeNull(); // 2099 está fuera de ±2 años
  });
});

describe("fechaCompromisoValida", () => {
  it("acepta YYYY-MM-DD razonables y rechaza el resto", () => {
    expect(fechaCompromisoValida("2026-10-01", AHORA)).toBe("2026-10-01");
    expect(fechaCompromisoValida("01/10/2026", AHORA)).toBeNull();
    expect(fechaCompromisoValida("2026-13-45", AHORA)).toBeNull();
    expect(fechaCompromisoValida(null, AHORA)).toBeNull();
  });
});

describe("minutaATexto", () => {
  it("arma el texto para enviar, sin los riesgos internos", () => {
    const m = limpiarMinutaIA(base, AHORA);
    const t = minutaATexto({ ...m, fecha: "2026-09-24" }, "Quesos La Florida");
    expect(t).toContain("Minuta de reunión: Revisión de propuesta");
    expect(t).toContain("Quesos La Florida");
    expect(t).toContain("- Enviar propuesta ajustada — Luis");
    expect(t).toContain("- Confirmar presupuesto — Cliente");
    expect(t).not.toContain("Precio alto");
  });
});

describe("guardarMinutaSchema", () => {
  const valida = {
    oportunidadId: "op-1", fecha: "2026-09-24", titulo: "Reunión", resumen: "Resumen",
    asistentes: [], acuerdos: [], compromisos: [], proximosPasos: [], riesgos: [],
  };
  it("acepta una minuta válida", () => {
    expect(guardarMinutaSchema.safeParse(valida).success).toBe(true);
  });
  it("rechaza fecha inválida o título vacío", () => {
    expect(guardarMinutaSchema.safeParse({ ...valida, fecha: "24/09/2026" }).success).toBe(false);
    expect(guardarMinutaSchema.safeParse({ ...valida, titulo: "  " }).success).toBe(false);
  });
});
