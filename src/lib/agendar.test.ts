import { describe, it, expect } from "vitest";
import { calcularHorarios, configDe, AGENDA_POR_DEFECTO, agendaConfigSchema, type AgendaConfig } from "./agendar";
import { formatoHora } from "./fecha-bogota";

// Lunes 16 de noviembre de 2026, 7:00 a. m. en Bogotá (12:00Z).
const LUNES_7AM = new Date("2026-11-16T12:00:00Z");
const base: AgendaConfig = { dias: [1, 2, 3, 4, 5], desde: "09:00", hasta: "11:00", duracion: 30, anticipacionHoras: 0, diasAdelante: 7 };
const horas = (ds: Date[]) => ds.map(d => formatoHora(d));

describe("calcularHorarios", () => {
  it("arma los turnos del horario en hora de Bogotá", () => {
    const [lunes] = calcularHorarios(base, [], LUNES_7AM);
    expect(lunes.horarios[0].toISOString()).toBe("2026-11-16T14:00:00.000Z"); // 9:00 a. m. Bogotá
    expect(lunes.horarios).toHaveLength(4); // 9:00, 9:30, 10:00, 10:30
  });

  it("solo ofrece los días de la semana elegidos", () => {
    const dias = calcularHorarios(base, [], LUNES_7AM);
    expect(dias).toHaveLength(5); // lunes a viernes; sábado y domingo no
  });

  it("respeta el aviso mínimo", () => {
    const [lunes] = calcularHorarios({ ...base, anticipacionHoras: 3 }, [], LUNES_7AM);
    // 7:00 + 3 h = 10:00 → solo 10:00 y 10:30
    expect(horas(lunes.horarios)).toEqual(horas([new Date("2026-11-16T15:00:00Z"), new Date("2026-11-16T15:30:00Z")]));
  });

  it("no ofrece horas que chocan con algo ya agendado", () => {
    const ocupado = { inicio: new Date("2026-11-16T14:15:00Z"), fin: new Date("2026-11-16T15:15:00Z") }; // 9:15–10:15
    const [lunes] = calcularHorarios(base, [ocupado], LUNES_7AM);
    expect(lunes.horarios.map(h => h.toISOString())).toEqual(["2026-11-16T15:30:00.000Z"]); // solo 10:30
  });

  it("un día sin horas libres no aparece", () => {
    const todoElLunes = { inicio: new Date("2026-11-16T13:00:00Z"), fin: new Date("2026-11-16T17:00:00Z") };
    const dias = calcularHorarios(base, [todoElLunes], LUNES_7AM);
    expect(dias[0].fecha.toISOString()).toBe("2026-11-17T05:00:00.000Z"); // empieza en martes
  });
});

describe("configuración", () => {
  it("una configuración dañada vuelve a la de fábrica", () => {
    expect(configDe({ dias: "todos" })).toEqual(AGENDA_POR_DEFECTO);
    expect(configDe(null)).toEqual(AGENDA_POR_DEFECTO);
  });
  it("rechaza un horario donde no cabe ni una reunión", () => {
    expect(agendaConfigSchema.safeParse({ ...base, desde: "10:00", hasta: "10:15" }).success).toBe(false);
    expect(agendaConfigSchema.safeParse({ ...base, duracion: 20 }).success).toBe(false);
  });
});
