/**
 * "Plan para ganar": la estrategia de UNA oportunidad, armada por la IA con lo
 * que el CRM ya sabe del negocio (minutas, decisores, actividades,
 * cotizaciones, correos y la guía de objeciones). El vendedor no pega nada.
 *
 * Junta en un solo paso la calificación (ajuste, potencial, urgencia,
 * decisión, probabilidad), los riesgos con la pregunta para aclararlos, la
 * propuesta de valor, el mensaje para cada decisor y los próximos pasos, que
 * se agendan con un clic. No guarda nada.
 */
import { z } from "zod";

export const CRITERIOS = ["AJUSTE", "POTENCIAL", "URGENCIA", "DECISION", "PROBABILIDAD"] as const;
export const CRITERIO_LABEL: Record<(typeof CRITERIOS)[number], string> = {
  AJUSTE: "Ajuste con lo que vendemos",
  POTENCIAL: "Potencial de ingresos",
  URGENCIA: "Urgencia del cliente",
  DECISION: "Acceso a quien decide",
  PROBABILIDAD: "Probabilidad de cierre",
};

export const NIVELES = ["ALTA", "MEDIA", "BAJA", "SIN_DATOS"] as const;
export const NIVEL_LABEL: Record<(typeof NIVELES)[number], string> = {
  ALTA: "Alta", MEDIA: "Media", BAJA: "Baja", SIN_DATOS: "Sin datos",
};

export const TIPOS_PASO = ["LLAMADA", "REUNION", "EMAIL", "TAREA"] as const;

export const planGanarSchema = z.object({
  lectura: z.string().describe("2 o 3 frases: en qué punto está el negocio y qué lo define ahora"),
  calificacion: z.array(z.object({
    criterio: z.enum(CRITERIOS),
    nivel: z.enum(NIVELES).describe("SIN_DATOS si el CRM no tiene información para calificarlo"),
    porque: z.string().describe("Una frase con la evidencia de <datos> que justifica el nivel"),
  })).describe("Los 5 criterios, uno por cada valor"),
  riesgos: z.array(z.object({
    riesgo: z.string().describe("Qué puede frenar la decisión"),
    senal: z.string().describe("La señal concreta en <datos> que lo indica"),
    pregunta: z.string().describe("Pregunta para hacerle al cliente que lo aclare o lo mitigue"),
  })).describe("De 0 a 3 riesgos, el más grave primero"),
  propuestaValor: z.string().describe("La propuesta de valor para ESTE cliente, en 2 frases"),
  mensajes: z.array(z.object({
    persona: z.string().describe("Nombre de la persona del mapa de decisores (o del contacto)"),
    mensaje: z.string().describe("Qué decirle a esa persona según su rol y postura, en 1 o 2 frases"),
  })).describe("Un mensaje por persona conocida, máximo 4. Vacío si no hay personas registradas"),
  proximosPasos: z.array(z.object({
    tipo: z.enum(TIPOS_PASO),
    titulo: z.string().describe("La acción, empezando con un verbo, como se escribiría en la agenda (máx. 80 caracteres)"),
    porque: z.string().describe("Para qué sirve, en una frase"),
  })).describe("De 1 a 4 pasos concretos, el más urgente primero"),
  faltaSaber: z.array(z.string()).describe("Datos clave que faltan en el CRM para afinar el plan (máx. 3)"),
});
export type PlanGanar = z.infer<typeof planGanarSchema>;

const corto = (s: string, max: number) => s.trim().replace(/\s+/g, " ").slice(0, max);

/** Recorta y ordena lo que devuelve la IA antes de mostrarlo. */
export function limpiarPlanGanar(p: PlanGanar): PlanGanar {
  // Un criterio por valor, en el orden fijo de CRITERIOS.
  const porCriterio = new Map(p.calificacion.map(c => [c.criterio, c]));
  return {
    lectura: p.lectura.trim(),
    calificacion: CRITERIOS.flatMap(k => {
      const c = porCriterio.get(k);
      return c ? [{ criterio: k, nivel: c.nivel, porque: c.porque.trim() }] : [];
    }),
    riesgos: p.riesgos
      .map(r => ({ riesgo: r.riesgo.trim(), senal: r.senal.trim(), pregunta: r.pregunta.trim() }))
      .filter(r => r.riesgo)
      .slice(0, 3),
    propuestaValor: p.propuestaValor.trim(),
    mensajes: p.mensajes
      .map(m => ({ persona: corto(m.persona, 120), mensaje: m.mensaje.trim() }))
      .filter(m => m.persona && m.mensaje)
      .slice(0, 4),
    proximosPasos: p.proximosPasos
      .map(s => ({ tipo: s.tipo, titulo: corto(s.titulo, 120), porque: s.porque.trim() }))
      .filter(s => s.titulo)
      .slice(0, 4),
    faltaSaber: p.faltaSaber.map(s => s.trim()).filter(Boolean).slice(0, 3),
  };
}
