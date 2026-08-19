import { describe, it, expect } from "vitest";
import { seccionesParaCotizacion, cuerpoEditable, tieneCuerpoPropio, CONDICIONES_DEFAULT } from "./cuerpo-cotizacion";

const plantillaTenant = [
  { titulo: "Sobre nosotros", contenido: "Somos X" },
  { titulo: "Condiciones comerciales", contenido: "Genéricas" },
];

describe("tieneCuerpoPropio", () => {
  it("true solo cuando hay secciones válidas", () => {
    expect(tieneCuerpoPropio(null)).toBe(false);
    expect(tieneCuerpoPropio([])).toBe(false);
    expect(tieneCuerpoPropio([{ titulo: "", contenido: "" }])).toBe(false);
    expect(tieneCuerpoPropio([{ titulo: "A", contenido: "" }])).toBe(true);
  });
});

describe("seccionesParaCotizacion (render)", () => {
  it("si la cotización tiene cuerpo propio, ese manda", () => {
    const cot = { cuerpoCotizacion: [{ titulo: "Propio", contenido: "X" }], condicionesComerciales: null, tenant: { cuerpoCotizacion: plantillaTenant } };
    expect(seccionesParaCotizacion(cot)).toEqual([{ titulo: "Propio", contenido: "X" }]);
  });

  it("sin cuerpo propio, usa el del tenant y oculta 'Condiciones comerciales' si hay condiciones propias", () => {
    const cot = { cuerpoCotizacion: null, condicionesComerciales: "Pago 50/50", tenant: { cuerpoCotizacion: plantillaTenant } };
    const res = seccionesParaCotizacion(cot);
    expect(res.some(s => s.titulo === "Sobre nosotros")).toBe(true);
    expect(res.some(s => s.titulo.toLowerCase() === "condiciones comerciales")).toBe(false);
  });

  it("sin cuerpo propio ni tenant, cae a las condiciones por defecto", () => {
    const cot = { cuerpoCotizacion: null, condicionesComerciales: null, tenant: { cuerpoCotizacion: null } };
    expect(seccionesParaCotizacion(cot)).toEqual(CONDICIONES_DEFAULT);
  });
});

describe("cuerpoEditable (editor del detalle)", () => {
  it("cotización vieja: inyecta condicionesComerciales en la sección 'Condiciones comerciales' sin perder texto", () => {
    const cot = { cuerpoCotizacion: null, condicionesComerciales: "Pago contra entrega", tenant: { cuerpoCotizacion: plantillaTenant } };
    const res = cuerpoEditable(cot);
    const cond = res.find(s => s.titulo === "Condiciones comerciales");
    expect(cond?.contenido).toBe("Pago contra entrega");
    expect(res.some(s => s.titulo === "Sobre nosotros")).toBe(true);
  });

  it("cotización con cuerpo propio: lo devuelve tal cual", () => {
    const cot = { cuerpoCotizacion: [{ titulo: "Propio", contenido: "X" }], condicionesComerciales: "algo", tenant: { cuerpoCotizacion: plantillaTenant } };
    expect(cuerpoEditable(cot)).toEqual([{ titulo: "Propio", contenido: "X" }]);
  });
});
