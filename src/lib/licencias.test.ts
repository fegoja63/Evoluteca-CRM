import { describe, it, expect } from "vitest";
import { resumirLicencias } from "./licencias";
import { fechaDesdeBogota } from "./fecha-bogota";

const periodo = (desde: string, hasta: string, revocadaEn: Date | null = null) => ({
  desde: fechaDesdeBogota(desde),
  hasta: fechaDesdeBogota(hasta),
  revocadaEn,
});
// Un instante en hora de Bogotá.
const en = (s: string) => fechaDesdeBogota(s);

describe("resumirLicencias", () => {
  it("sin filas: sin licencia", () => {
    expect(resumirLicencias([], en("2026-10-19T10:00")).estado).toBe("SIN_LICENCIA");
  });

  it("cubre desde el primer minuto del primer día hasta el último minuto del último día", () => {
    const filas = [periodo("2026-10-19", "2027-10-18")];
    expect(resumirLicencias(filas, en("2026-10-19T00:00")).estado).toBe("VIGENTE");
    expect(resumirLicencias(filas, en("2027-10-18T23:59")).estado).toBe("VIGENTE");
    expect(resumirLicencias(filas, en("2026-10-18T23:59")).estado).toBe("SIN_LICENCIA");
    expect(resumirLicencias(filas, en("2027-10-19T00:00")).estado).toBe("VENCIDA");
  });

  it("vencida conserva el último día cubierto", () => {
    const r = resumirLicencias([periodo("2025-01-01", "2025-12-31")], en("2026-03-01T09:00"));
    expect(r.estado).toBe("VENCIDA");
    expect(r.hasta).toEqual(fechaDesdeBogota("2025-12-31"));
  });

  it("una licencia revocada no cuenta, ni como vigente ni como vencida", () => {
    const r = resumirLicencias([periodo("2026-01-01", "2026-12-31", new Date())], en("2026-06-01T09:00"));
    expect(r.estado).toBe("SIN_LICENCIA");
  });

  it("con una renovación encadenada, vigente hasta el final de la más larga", () => {
    const r = resumirLicencias(
      [periodo("2026-01-01", "2026-12-31"), periodo("2026-11-01", "2027-10-31")],
      en("2026-11-15T09:00"),
    );
    expect(r.estado).toBe("VIGENTE");
    expect(r.hasta).toEqual(fechaDesdeBogota("2027-10-31"));
  });

  it("una licencia que empieza mañana todavía no habilita", () => {
    expect(resumirLicencias([periodo("2026-10-20", "2027-10-19")], en("2026-10-19T15:00")).estado).toBe("SIN_LICENCIA");
  });
});
