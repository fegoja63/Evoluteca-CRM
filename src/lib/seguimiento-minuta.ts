/**
 * Correo de seguimiento a partir de una minuta guardada: la IA resume la
 * reunión, refuerza el valor, confirma el próximo paso (con su fecha si la hay)
 * y se queda en máximo 120 palabras. Es un borrador: el vendedor lo revisa y
 * decide si lo copia o lo envía desde el CRM. No guarda nada.
 */
import { z } from "zod";

export const PALABRAS_MAX_SEGUIMIENTO = 120;

export const seguimientoMinutaSchema = z.object({
  asunto: z.string().describe("Asunto corto y concreto, máximo 80 caracteres"),
  cuerpo: z.string().describe(`Cuerpo del correo de usted: saludo, resumen breve de la reunión, valor para el cliente, próximo paso con su fecha si se conoce y despedida, firmado con el nombre dado. Máximo ${PALABRAS_MAX_SEGUIMIENTO} palabras`),
});
export type SeguimientoMinuta = z.infer<typeof seguimientoMinutaSchema>;

export function limpiarSeguimiento(s: SeguimientoMinuta): SeguimientoMinuta {
  return {
    asunto: s.asunto.trim().replace(/\s+/g, " ").replace(/^asunto:\s*/i, "").slice(0, 150),
    cuerpo: s.cuerpo.trim().replace(/\n{3,}/g, "\n\n"),
  };
}

export const contarPalabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;
