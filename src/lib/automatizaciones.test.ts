import { describe, it, expect } from "vitest";
import { aplicarPlantilla, validarConfigAccion } from "./automatizaciones";

describe("aplicarPlantilla", () => {
  it("reemplaza {oportunidad} y {cliente} (sin distinguir mayúsculas)", () => {
    const r = aplicarPlantilla("Llamar a {cliente} por {OPORTUNIDAD}", { oportunidad: "Renta salón", cliente: "Teatro X" });
    expect(r).toBe("Llamar a Teatro X por Renta salón");
  });

  it("deja vacío lo que no tiene valor", () => {
    expect(aplicarPlantilla("Hola {cliente}", {})).toBe("Hola ");
  });
});

describe("validarConfigAccion — CREAR_TAREA", () => {
  it("acepta y normaliza una config válida", () => {
    const r = validarConfigAccion("CREAR_TAREA", { titulo: "  Llamar  ", tipo: "LLAMADA", diasPlazo: 3, responsable: "DUENO" });
    expect(r.ok).toBe(true);
    if (r.ok && r.accion === "CREAR_TAREA") {
      expect(r.config.titulo).toBe("Llamar");
      expect(r.config.tipo).toBe("LLAMADA");
      expect(r.config.diasPlazo).toBe(3);
      expect(r.config.responsable).toBe("DUENO");
    }
  });

  it("exige título", () => {
    expect(validarConfigAccion("CREAR_TAREA", { titulo: "", diasPlazo: 1 }).ok).toBe(false);
  });

  it("rechaza un plazo fuera de rango o no entero", () => {
    expect(validarConfigAccion("CREAR_TAREA", { titulo: "X", diasPlazo: -1 }).ok).toBe(false);
    expect(validarConfigAccion("CREAR_TAREA", { titulo: "X", diasPlazo: 2.5 }).ok).toBe(false);
    expect(validarConfigAccion("CREAR_TAREA", { titulo: "X", diasPlazo: 400 }).ok).toBe(false);
  });

  it("rechaza un tipo de tarea inválido", () => {
    expect(validarConfigAccion("CREAR_TAREA", { titulo: "X", tipo: "VISITA_TECNICA", diasPlazo: 1 }).ok).toBe(false);
  });
});

describe("validarConfigAccion — ENVIAR_CORREO", () => {
  it("acepta una config válida", () => {
    const r = validarConfigAccion("ENVIAR_CORREO", { destinatario: "GERENTES", asunto: "Aviso", cuerpo: "Texto" });
    expect(r.ok).toBe(true);
    if (r.ok && r.accion === "ENVIAR_CORREO") {
      expect(r.config.destinatario).toBe("GERENTES");
    }
  });

  it("rechaza un destinatario inválido", () => {
    expect(validarConfigAccion("ENVIAR_CORREO", { destinatario: "TODOS", asunto: "A", cuerpo: "B" }).ok).toBe(false);
  });

  it("exige asunto y cuerpo", () => {
    expect(validarConfigAccion("ENVIAR_CORREO", { destinatario: "DUENO", asunto: "", cuerpo: "B" }).ok).toBe(false);
    expect(validarConfigAccion("ENVIAR_CORREO", { destinatario: "DUENO", asunto: "A", cuerpo: "" }).ok).toBe(false);
  });
});

describe("validarConfigAccion — acción desconocida", () => {
  it("rechaza", () => {
    expect(validarConfigAccion("BORRAR_TODO", {}).ok).toBe(false);
  });
});
