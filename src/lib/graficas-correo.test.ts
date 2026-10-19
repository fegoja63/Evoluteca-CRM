import { describe, it, expect } from "vitest";
import { anchoPct, barrasHorizontales, barraApilada, barrasComparadas, variacion } from "./graficas-correo";

describe("anchoPct", () => {
  it("es proporcional al máximo", () => {
    expect(anchoPct(50, 100)).toBe(50);
    expect(anchoPct(100, 100)).toBe(100);
  });
  it("lo que tiene valor nunca queda invisible", () => {
    expect(anchoPct(1, 1000)).toBe(3);
  });
  it("sin valor no dibuja barra", () => {
    expect(anchoPct(0, 100)).toBe(0);
    expect(anchoPct(5, 0)).toBe(0);
  });
});

describe("barrasHorizontales", () => {
  it("dibuja una fila por barra con su cifra, sin svg", () => {
    const html = barrasHorizontales([
      { etiqueta: "Prospecto", valor: 10, detalle: "2 · $10M", color: "#93c5fd" },
      { etiqueta: "Propuesta", valor: 5, color: "#2563eb" },
    ]);
    expect(html).toContain("Prospecto");
    expect(html).toContain("2 · $10M");
    expect(html).toContain('width="100%" style="background:#93c5fd');
    expect(html).toContain('width="50%" style="background:#2563eb');
    expect(html).not.toContain("<svg");
  });
});

describe("barraApilada", () => {
  it("los tramos suman 100% y la leyenda trae los conteos", () => {
    const html = barraApilada([
      { etiqueta: "Alta", valor: 1, color: "#10b981" },
      { etiqueta: "Riesgo", valor: 2, color: "#ef4444" },
      { etiqueta: "Vacío", valor: 0, color: "#000" },
    ]);
    const anchos = [...html.matchAll(/<td width="(\d+)%"/g)].map(m => Number(m[1]));
    expect(anchos.reduce((a, b) => a + b, 0)).toBe(100);
    expect(html).toContain("Riesgo: <strong>2</strong>");
    expect(html).not.toContain("Vacío");
  });
  it("sin datos no muestra nada", () => {
    expect(barraApilada([{ etiqueta: "x", valor: 0, color: "#000" }])).toBe("");
  });
});

describe("barrasComparadas", () => {
  it("muestra la cifra actual contra la anterior", () => {
    const html = barrasComparadas([{ etiqueta: "Llamadas", actual: 4, anterior: 2 }], "#059669");
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain("vs 2");
  });
});

describe("variacion", () => {
  it("sube, baja o se mantiene", () => {
    expect(variacion(6, 4).texto).toBe("↑ 50% vs. la semana anterior");
    expect(variacion(2, 4).texto).toBe("↓ 50% vs. la semana anterior");
    expect(variacion(3, 3).texto).toBe("= igual que la semana anterior");
  });
  it("sin semana anterior no inventa porcentaje", () => {
    expect(variacion(3, 0).texto).not.toContain("%");
  });
});
