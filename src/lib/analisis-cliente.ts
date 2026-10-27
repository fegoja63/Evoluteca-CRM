/**
 * Análisis del negocio de un cliente: la IA lee lo que sube el vendedor
 * (informe anual, presentación corporativa, noticias, datos del sector) y lo
 * resume en los puntos que importan para venderle: situación, desafíos,
 * objetivos, plazo, cómo mide el éxito, dónde podemos ayudar y qué validar.
 *
 * Se guarda uno por cliente (tabla analisis_cliente) para que el Plan para
 * ganar y Preparar reunión lo usen sin que nadie lo vuelva a pegar.
 */
import { z } from "zod";
import { formatoDia } from "@/lib/fecha-bogota";

// Vercel no acepta cuerpos de más de 4,5 MB en una función.
export const MAX_BYTES_ANALISIS = 4 * 1024 * 1024;
export const MAX_TEXTO_ANALISIS = 60_000;
export const MIN_TEXTO_ANALISIS = 40;

export const analisisClienteSchema = z.object({
  situacion: z.string().describe("Situación actual del cliente en 2 o 3 frases"),
  desafios: z.array(z.string()).describe("Principales desafíos o problemas, máximo 4"),
  objetivos: z.array(z.string()).describe("Lo que quiere lograr, máximo 4"),
  plazo: z.string().nullable().describe("Horizonte o plazo de sus objetivos si el material lo dice; si no, null"),
  exito: z.string().nullable().describe("Cómo mide el éxito (indicadores, metas) si el material lo dice; si no, null"),
  dondeAyudar: z.array(z.string()).describe("Dónde encaja lo que vende nuestra empresa frente a esos desafíos u objetivos, máximo 3"),
  preguntas: z.array(z.string()).describe("Preguntas para validar con el cliente lo que el material no aclara, máximo 3"),
});
export type AnalisisClienteIA = z.infer<typeof analisisClienteSchema>;

const lista = (xs: string[], max: number) => xs.map(x => x.trim()).filter(Boolean).slice(0, max);
const opcional = (s: string | null) => (s && s.trim() ? s.trim() : null);

export function limpiarAnalisis(a: AnalisisClienteIA): AnalisisClienteIA {
  return {
    situacion: a.situacion.trim(),
    desafios: lista(a.desafios, 4),
    objetivos: lista(a.objetivos, 4),
    plazo: opcional(a.plazo),
    exito: opcional(a.exito),
    dondeAyudar: lista(a.dondeAyudar, 3),
    preguntas: lista(a.preguntas, 3),
  };
}

/** El análisis guardado, en texto para el contexto de otras funciones de IA. */
export function analisisATexto(a: AnalisisClienteIA & { fuentes: string; actualizadoEn: Date }): string[] {
  const d = [`\nANÁLISIS DEL NEGOCIO DEL CLIENTE (de ${a.fuentes.slice(0, 200)}, ${formatoDia(a.actualizadoEn)}):`];
  d.push(`Situación: ${a.situacion.slice(0, 800)}`);
  if (a.desafios.length) d.push(`Desafíos: ${a.desafios.join("; ").slice(0, 800)}`);
  if (a.objetivos.length) d.push(`Objetivos: ${a.objetivos.join("; ").slice(0, 800)}`);
  if (a.plazo) d.push(`Plazo: ${a.plazo.slice(0, 200)}`);
  if (a.exito) d.push(`Cómo mide el éxito: ${a.exito.slice(0, 300)}`);
  if (a.dondeAyudar.length) d.push(`Dónde podemos ayudar: ${a.dondeAyudar.join("; ").slice(0, 600)}`);
  return d;
}
