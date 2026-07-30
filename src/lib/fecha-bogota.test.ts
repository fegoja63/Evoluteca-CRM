import { describe, it, expect } from "vitest";
import { componentesHoyBogota, medianocheBogota } from "./fecha-bogota";

describe("fecha-bogota", () => {
  // 30 de julio 2026, 02:00 UTC = 29 de julio 2026, 9:00 PM en Bogotá (UTC-5).
  // Es el caso del bug reportado: de noche en Bogotá el servidor UTC ya está en
  // el día siguiente.
  const nocheEnBogota = new Date("2026-07-30T02:00:00.000Z");

  it("devuelve la fecha de Bogotá, no la del servidor UTC, de noche", () => {
    const { anio, mes, dia } = componentesHoyBogota(nocheEnBogota);
    expect(anio).toBe(2026);
    expect(mes).toBe(6); // julio, 0-indexado
    expect(dia).toBe(29); // 29, no 30
  });

  it("medianocheBogota(0) es la medianoche de Bogotá de hoy como instante UTC", () => {
    // Medianoche del 29-jul en Bogotá = 05:00 UTC del 29-jul.
    expect(medianocheBogota(0, nocheEnBogota).toISOString()).toBe("2026-07-29T05:00:00.000Z");
  });

  it("la ventana [hoy, mañana) cubre una actividad de la tarde de Bogotá", () => {
    const inicioHoy = medianocheBogota(0, nocheEnBogota);
    const finHoy = medianocheBogota(1, nocheEnBogota);
    // Actividad a las 2:00 PM del 29-jul en Bogotá = 19:00 UTC del 29-jul.
    const actividad = new Date("2026-07-29T19:00:00.000Z");
    expect(actividad >= inicioHoy && actividad < finHoy).toBe(true);
    // Con la lógica vieja (día UTC) "hoy" habría sido el 30-jul y esta actividad
    // habría quedado fuera de la ventana.
    const inicioHoyUtc = new Date(Date.UTC(2026, 6, 30));
    expect(actividad >= inicioHoyUtc).toBe(false);
  });

  it("maneja el cambio de mes: 31-jul de noche sigue siendo julio en Bogotá", () => {
    // 1 de agosto 01:00 UTC = 31 de julio 8:00 PM en Bogotá.
    const finDeJulioBogota = new Date("2026-08-01T01:00:00.000Z");
    const { mes, dia } = componentesHoyBogota(finDeJulioBogota);
    expect(mes).toBe(6); // julio, no agosto
    expect(dia).toBe(31);
  });

  it("maneja overflow de días negativos y positivos", () => {
    // 60 días antes del 29-jul-2026 = 30-may-2026 (medianoche Bogotá).
    expect(medianocheBogota(-60, nocheEnBogota).toISOString()).toBe("2026-05-30T05:00:00.000Z");
    // 7 días después = 5-ago-2026.
    expect(medianocheBogota(7, nocheEnBogota).toISOString()).toBe("2026-08-05T05:00:00.000Z");
  });
});
