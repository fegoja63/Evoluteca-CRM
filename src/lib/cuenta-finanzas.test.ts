import { describe, it, expect } from "vitest";
import { rutaPermitidaSoloFinanzas } from "./cuenta-finanzas";

describe("rutaPermitidaSoloFinanzas", () => {
  it("deja el módulo y lo administrativo", () => {
    expect(rutaPermitidaSoloFinanzas("/dashboard/finanzas")).toBe(true);
    expect(rutaPermitidaSoloFinanzas("/dashboard/finanzas/caja")).toBe(true);
    expect(rutaPermitidaSoloFinanzas("/dashboard/equipo")).toBe(true);
    expect(rutaPermitidaSoloFinanzas("/dashboard/configuracion")).toBe(true);
    expect(rutaPermitidaSoloFinanzas("/dashboard/terminos")).toBe(true);
  });

  it("saca las pantallas del CRM", () => {
    expect(rutaPermitidaSoloFinanzas("/dashboard")).toBe(false);
    expect(rutaPermitidaSoloFinanzas("/dashboard/pipeline")).toBe(false);
    expect(rutaPermitidaSoloFinanzas("/dashboard/cuentas/abc")).toBe(false);
    expect(rutaPermitidaSoloFinanzas("/dashboard/hoy")).toBe(false);
  });

  it("no se deja engañar por un prefijo parecido", () => {
    expect(rutaPermitidaSoloFinanzas("/dashboard/finanzas-falsa")).toBe(false);
    expect(rutaPermitidaSoloFinanzas("/dashboard/equipos")).toBe(false);
  });
});
