import { describe, it, expect } from "vitest";
import { parseMonto } from "@/lib/parse-monto";

describe("parseMonto", () => {
  it("formato colombiano con punto de miles", () => {
    expect(parseMonto("4.800.000")).toBe(4800000);
    expect(parseMonto("$ 4.800.000")).toBe(4800000);
    expect(parseMonto("1.500.000")).toBe(1500000);
    expect(parseMonto("4.800")).toBe(4800);
  });

  it("formato plano, sin separadores", () => {
    expect(parseMonto("4800000")).toBe(4800000);
    expect(parseMonto("3500000")).toBe(3500000);
  });

  it("coma como decimal (es-CO)", () => {
    expect(parseMonto("1.200,50")).toBe(1200.5);
    expect(parseMonto("4.800.000,75")).toBe(4800000.75);
    expect(parseMonto("50,25")).toBe(50.25);
  });

  it("respeta un decimal corto con punto", () => {
    expect(parseMonto("4.5")).toBe(4.5);
    expect(parseMonto("4.50")).toBe(4.5);
  });

  it("vacío o no numérico devuelve null", () => {
    expect(parseMonto("")).toBeNull();
    expect(parseMonto(null)).toBeNull();
    expect(parseMonto(undefined)).toBeNull();
    expect(parseMonto("abc")).toBeNull();
    expect(parseMonto("$")).toBeNull();
  });

  it("limpia símbolos y espacios", () => {
    expect(parseMonto("  $12.000 COP ")).toBe(12000);
  });
});
