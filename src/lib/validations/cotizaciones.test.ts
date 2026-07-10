import { describe, it, expect } from "vitest";
import { crearCotizacionSchema } from "./cotizaciones";

const itemValido = { descripcion: "Servicio de sonido", precioUnit: 100_000 };

describe("crearCotizacionSchema", () => {
  it("acepta una cotización con un ítem válido", () => {
    const r = crearCotizacionSchema.parse({ items: [itemValido] });
    expect(r.items).toHaveLength(1);
  });

  it("rechaza una cotización sin ítems", () => {
    expect(() => crearCotizacionSchema.parse({ items: [] })).toThrow();
  });

  it("rechaza un ítem sin descripción", () => {
    expect(() => crearCotizacionSchema.parse({ items: [{ precioUnit: 100 }] })).toThrow();
  });

  it("rechaza un precio negativo", () => {
    expect(() => crearCotizacionSchema.parse({ items: [{ descripcion: "X", precioUnit: -1 }] })).toThrow();
  });

  it("rechaza un impuesto fuera de 0-100", () => {
    expect(() => crearCotizacionSchema.parse({ items: [itemValido], impuestoPorcentaje: 150 })).toThrow();
  });

  // Regresión: cantidad vacía ("") debía caer al default (1 en la ruta), no
  // convertirse en 0 y fallar la validación mínima de 0.01.
  it("trata cantidad vacía ('') como ausente, no como 0", () => {
    const r = crearCotizacionSchema.parse({ items: [{ ...itemValido, cantidad: "" }] });
    expect(r.items[0].cantidad).toBeUndefined();
  });

  it("trata impuestoPorcentaje vacío ('') como ausente, no como 0", () => {
    const r = crearCotizacionSchema.parse({ items: [itemValido], impuestoPorcentaje: "" });
    expect(r.impuestoPorcentaje).toBeUndefined();
  });

  it("acepta dos impuestos válidos simultáneos", () => {
    const r = crearCotizacionSchema.parse({
      items: [itemValido],
      impuestoNombre: "IVA", impuestoPorcentaje: 19,
      impuesto2Nombre: "Retención", impuesto2Porcentaje: 4,
    });
    expect(r.impuestoPorcentaje).toBe(19);
    expect(r.impuesto2Porcentaje).toBe(4);
  });
});
