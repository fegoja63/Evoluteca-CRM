/**
 * "Preparar reunión": antes de una reunión o visita agendada, la IA arma el
 * objetivo, una agenda corta, quién debe asistir del lado del cliente, las
 * preguntas pendientes, qué llevar y la invitación lista para copiar. Usa lo
 * que el CRM ya sabe del negocio (ver contexto-oportunidad.ts). No guarda nada.
 */
import { z } from "zod";

/** Tipos de actividad que se pueden preparar. */
export const TIPOS_PREPARABLES = ["REUNION", "VISITA_COMERCIAL", "VISITA_TECNICA"] as const;
export const esPreparable = (tipo: string) => (TIPOS_PREPARABLES as readonly string[]).includes(tipo);

export const prepararReunionSchema = z.object({
  objetivo: z.string().describe("Qué debe quedar logrado al salir de la reunión, en una frase concreta"),
  agenda: z.array(z.object({
    punto: z.string().describe("Tema de la agenda, corto"),
    porque: z.string().describe("Por qué importa para las prioridades del cliente, en una frase"),
  })).describe("De 1 a 3 puntos, en el orden en que se tratarían"),
  participantes: z.array(z.object({
    persona: z.string().describe("Nombre de una persona del CRM, o el cargo que hace falta si no está registrada"),
    porque: z.string().describe("Por qué debe estar, en una frase"),
  })).describe("Quiénes deben asistir por parte del cliente, máximo 4"),
  preguntas: z.array(z.string()).describe("Preguntas pendientes para hacerle al cliente, máximo 5, la más importante primero"),
  llevar: z.array(z.string()).describe("Qué preparar o llevar (propuesta, demo, caso de éxito, cifras), máximo 4"),
  invitacion: z.object({
    asunto: z.string().describe("Asunto de la invitación, máximo 80 caracteres"),
    cuerpo: z.string().describe("Texto de la invitación para el cliente, de usted, con el objetivo y la agenda, máximo 120 palabras, sin firma"),
  }),
});
export type PrepararReunion = z.infer<typeof prepararReunionSchema>;

const corto = (s: string, max: number) => s.trim().replace(/\s+/g, " ").slice(0, max);

/** Recorta lo que devuelve la IA antes de mostrarlo. */
export function limpiarPrepararReunion(p: PrepararReunion): PrepararReunion {
  return {
    objetivo: p.objetivo.trim(),
    agenda: p.agenda
      .map(a => ({ punto: corto(a.punto, 150), porque: a.porque.trim() }))
      .filter(a => a.punto)
      .slice(0, 3),
    participantes: p.participantes
      .map(x => ({ persona: corto(x.persona, 120), porque: x.porque.trim() }))
      .filter(x => x.persona)
      .slice(0, 4),
    preguntas: p.preguntas.map(q => q.trim()).filter(Boolean).slice(0, 5),
    llevar: p.llevar.map(q => q.trim()).filter(Boolean).slice(0, 4),
    invitacion: { asunto: corto(p.invitacion.asunto, 120), cuerpo: p.invitacion.cuerpo.trim() },
  };
}
