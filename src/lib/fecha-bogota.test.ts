import { describe, it, expect } from "vitest";
import { anclarBogota, fechaDesdeBogota, aInputDatetimeLocal, formatoFecha, formatoFechaHora, formatoHora, fechaISO, ahoraParaInput, formatoDia, diaISO, aInputDia } from "@/lib/fecha-bogota";

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

describe("conversiones centralizadas (dan lo mismo en el servidor UTC y en el navegador)", () => {
  // 9:30 p. m. del 19 de octubre en Bogotá = 02:30 UTC del 20.
  const nocheBogota = new Date("2026-10-20T02:30:00Z");

  it("una fecha de calendario guardada a medianoche UTC se lee como ese día", () => {
    expect(formatoDia(new Date("2026-10-20T00:00:00Z"))).toBe("20/10/2026");
    expect(diaISO("2026-10-20T00:00:00.000Z")).toBe("2026-10-20");
    expect(aInputDia("2026-10-20T00:00:00.000Z")).toBe("2026-10-20");
  });

  it("una fecha anclada a Bogotá (05:00Z) también se lee como ese día", () => {
    expect(formatoDia(new Date("2026-10-20T05:00:00Z"))).toBe("20/10/2026");
    expect(aInputDia("2026-10-20T05:00:00.000Z")).toBe("2026-10-20");
  });

  it("un INSTANTE a las 7:00 p. m. de Bogotá (= medianoche UTC) es de ese día, no del siguiente", () => {
    expect(formatoFecha(new Date("2026-10-21T00:00:00Z"))).toBe("20/10/2026");
  });

  it("un instante de la noche en Bogotá es de ese día, no del siguiente (UTC)", () => {
    expect(formatoFecha(nocheBogota)).toBe("19/10/2026");
    expect(fechaISO(nocheBogota)).toBe("2026-10-19");
  });

  it("la hora se muestra en hora de Bogotá", () => {
    const nueveAm = new Date("2026-10-20T14:00:00Z");
    expect(formatoHora(nueveAm)).toMatch(/^9:00/);
    expect(formatoFechaHora(nueveAm)).toMatch(/^20\/10\/2026.*9:00/);
  });

  it("datetime-local: precarga en hora de Bogotá, no en UTC", () => {
    expect(aInputDatetimeLocal(new Date("2026-10-20T14:00:00Z"))).toBe("2026-10-20T09:00");
    expect(aInputDatetimeLocal(nocheBogota)).toBe("2026-10-19T21:30");
  });

  it("valor por defecto: la próxima hora en punto en Bogotá", () => {
    expect(ahoraParaInput(new Date("2026-10-19T16:12:00Z"))).toBe("2026-10-19T12:00"); // 11:12 a. m.
    expect(ahoraParaInput(nocheBogota)).toBe("2026-10-19T22:00");
  });

  it("ida y vuelta: lo que precarga el formulario, la API lo guarda en el mismo instante", () => {
    const original = new Date("2026-10-20T14:00:00Z");
    expect(new Date(anclarBogota(aInputDatetimeLocal(original)) as string).getTime()).toBe(original.getTime());
  });
});
