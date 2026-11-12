import { describe, it, expect } from "vitest";
import { aplicarVariables, pasosDe, diaDeEnvio, secuenciaSchema } from "./secuencias";

describe("aplicarVariables", () => {
  it("usa el primer nombre en {{nombre}} y el completo en {{nombre_completo}}", () => {
    const t = aplicarVariables("Hola {{nombre}} ({{nombre_completo}}) de {{empresa}}, soy {{vendedor}}", {
      nombre: "Ana María Pérez", empresa: "Quesos SAS", vendedor: "Laura",
    });
    expect(t).toBe("Hola Ana (Ana María Pérez) de Quesos SAS, soy Laura");
  });
  it("las variables sin dato quedan vacías y las desconocidas se respetan", () => {
    expect(aplicarVariables("{{empresa}}|{{ NEGOCIO }}|{{otra}}", { nombre: "Ana" })).toBe("||{{otra}}");
  });
});

describe("pasos", () => {
  it("una secuencia sin correos o con un paso vacío no es válida", () => {
    expect(secuenciaSchema.safeParse({ nombre: "Prueba", pasos: [] }).success).toBe(false);
    expect(secuenciaSchema.safeParse({ nombre: "Prueba", pasos: [{ diasEspera: 1, asunto: "", cuerpo: "x" }] }).success).toBe(false);
  });
  it("pasos dañados se leen como vacíos", () => {
    expect(pasosDe("nada")).toEqual([]);
  });
});

describe("diaDeEnvio", () => {
  it("programa para el inicio del día en Bogotá, así el envío de la mañana lo toma", () => {
    // Martes 17 nov 2026, 4:00 p. m. Bogotá + 3 días = viernes 20 a las 00:00 Bogotá (05:00Z).
    expect(diaDeEnvio(3, new Date("2026-11-17T21:00:00Z")).toISOString()).toBe("2026-11-20T05:00:00.000Z");
  });
});
