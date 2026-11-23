import { describe, it, expect } from "vitest";
import { configDe, configSchema, ventanaCierre, notasTarea, CONFIG_POR_DEFECTO, VENTANA_DIAS } from "./resena-recompra";

describe("configuración", () => {
  it("apagada por defecto si falta o está dañada", () => {
    expect(configDe(null)).toEqual(CONFIG_POR_DEFECTO);
    expect(configDe({ resena: "x" }).resena.activa).toBe(false);
  });
  it("la reseña activa necesita un enlace https", () => {
    const base = { ...CONFIG_POR_DEFECTO, resena: { ...CONFIG_POR_DEFECTO.resena, activa: true } };
    expect(configSchema.safeParse(base).success).toBe(false);
    expect(configSchema.safeParse({ ...base, resena: { ...base.resena, enlace: "https://g.page/r/abc/review" } }).success).toBe(true);
    // Apagada, no importa el enlace.
    expect(configSchema.safeParse(CONFIG_POR_DEFECTO).success).toBe(true);
  });
});

describe("ventanaCierre", () => {
  it("cierres entre dias+14 y dias atrás", () => {
    const ahora = new Date("2026-11-23T13:30:00Z");
    const { desde, hasta } = ventanaCierre(15, ahora);
    expect(hasta.toISOString()).toBe("2026-11-08T13:30:00.000Z");
    expect((hasta.getTime() - desde.getTime()) / 86_400_000).toBe(VENTANA_DIAS);
  });
});

describe("notasTarea", () => {
  it("con celular trae el enlace de WhatsApp; sin celular lo dice", () => {
    const con = notasTarea("resena", "Hola Ana", { telefono: "3001234567", email: "ana@x.co" }, null);
    expect(con).toContain("Abrir WhatsApp: https://wa.me/573001234567?text=Hola%20Ana");
    expect(con).toContain("Correo del contacto: ana@x.co");
    const sin = notasTarea("recompra", "Hola", { telefono: null, email: null }, null);
    expect(sin).not.toContain("wa.me");
    expect(sin).toContain("no tiene celular");
  });
});
