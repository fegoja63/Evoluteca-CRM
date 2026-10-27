import { describe, it, expect } from "vitest";
import { limpiarPlanGanar, type PlanGanar } from "./plan-ganar";

const BASE: PlanGanar = {
  lectura: " El negocio está en propuesta. ",
  calificacion: [
    { criterio: "PROBABILIDAD", nivel: "MEDIA", porque: " Sin respuesta a la cotización. " },
    { criterio: "AJUSTE", nivel: "ALTA", porque: "Compró antes." },
    { criterio: "AJUSTE", nivel: "BAJA", porque: "Repetido." },
  ],
  riesgos: [
    { riesgo: "Precio", senal: "Pidió descuento", pregunta: "¿Qué presupuesto tiene?" },
    { riesgo: "", senal: "x", pregunta: "y" },
    { riesgo: "Competencia", senal: "a", pregunta: "b" },
    { riesgo: "Tiempo", senal: "a", pregunta: "b" },
    { riesgo: "Cuarto", senal: "a", pregunta: "b" },
  ],
  propuestaValor: " Ahorro en 6 meses. ",
  mensajes: [{ persona: "  Ana   Pérez ", mensaje: "Hablarle del ahorro." }, { persona: "", mensaje: "nada" }],
  proximosPasos: [
    { tipo: "LLAMADA", titulo: "  Llamar a Ana  ", porque: "Confirmar presupuesto." },
    { tipo: "TAREA", titulo: " ", porque: "vacío" },
  ],
  faltaSaber: ["Presupuesto", " ", "Quién firma", "Fecha", "Otro"],
};

describe("limpiarPlanGanar", () => {
  it("deja un criterio por valor, en orden fijo, y recorta textos", () => {
    const p = limpiarPlanGanar(BASE);
    expect(p.lectura).toBe("El negocio está en propuesta.");
    expect(p.calificacion).toEqual([
      { criterio: "AJUSTE", nivel: "BAJA", porque: "Repetido." },
      { criterio: "PROBABILIDAD", nivel: "MEDIA", porque: "Sin respuesta a la cotización." },
    ]);
    expect(p.propuestaValor).toBe("Ahorro en 6 meses.");
  });

  it("descarta lo vacío y respeta los máximos", () => {
    const p = limpiarPlanGanar(BASE);
    expect(p.riesgos.map(r => r.riesgo)).toEqual(["Precio", "Competencia", "Tiempo"]);
    expect(p.mensajes).toEqual([{ persona: "Ana Pérez", mensaje: "Hablarle del ahorro." }]);
    expect(p.proximosPasos).toEqual([{ tipo: "LLAMADA", titulo: "Llamar a Ana", porque: "Confirmar presupuesto." }]);
    expect(p.faltaSaber).toEqual(["Presupuesto", "Quién firma", "Fecha"]);
  });
});
