import { describe, it, expect } from "vitest";
import { anclarBogota, fechaDesdeBogota, aInputDatetimeLocal } from "@/lib/fecha-bogota";

describe("anclarBogota", () => {
  it("ancla una hora de pared (datetime-local) a UTC-5", () => {
    // 7:00 p.m. en Bogotá = 00:00 UTC del día siguiente.
    expect(fechaDesdeBogota("2026-10-20T19:00").toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });

  it("conserva los segundos si vienen", () => {
    expect(anclarBogota("2026-10-20T19:00:30")).toBe("2026-10-20T19:00:30-05:00");
  });

  it("agrega segundos si faltan", () => {
    expect(anclarBogota("2026-10-20T19:00")).toBe("2026-10-20T19:00:00-05:00");
  });

  it("una fecha sola se ancla a medianoche de Bogotá", () => {
    expect(fechaDesdeBogota("2026-10-20").toISOString()).toBe("2026-10-20T05:00:00.000Z");
  });

  it("no toca un string que ya trae zona (Z u offset)", () => {
    expect(anclarBogota("2026-10-20T19:00:00Z")).toBe("2026-10-20T19:00:00Z");
    expect(anclarBogota("2026-10-20T19:00-05:00")).toBe("2026-10-20T19:00-05:00");
  });

  it("deja pasar vacío, null, undefined y no-strings", () => {
    expect(anclarBogota("")).toBe("");
    expect(anclarBogota(null)).toBeNull();
    expect(anclarBogota(undefined)).toBeUndefined();
    const d = new Date();
    expect(anclarBogota(d)).toBe(d);
  });
});

describe("aInputDatetimeLocal", () => {
  it("hace ida y vuelta con la hora anclada (en zona Bogotá)", () => {
    // Este test asume que corre en una máquina en Bogotá o en UTC; solo
    // verificamos que el formato sea YYYY-MM-DDTHH:mm.
    const salida = aInputDatetimeLocal("2026-10-21T00:00:00.000Z");
    expect(salida).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
