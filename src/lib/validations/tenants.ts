import { z } from "zod";

const PLANES = ["arranque", "empresa", "corporativo"] as const;

// z.record(z.enum(...), ...) en Zod v4 exige las 4 claves del enum presentes
// (record exhaustivo) — un PATCH parcial como { expedientes: true } lo
// rechaza. Se valida como objeto con las 4 claves opcionales en su lugar,
// ya que el llamador solo manda el/los módulo(s) que está cambiando.
export const editarTenantSchema = z.object({
  activo: z.boolean().optional(),
  plan: z.enum(PLANES, { error: "Plan inválido" }).optional(),
  emailsActivos: z.boolean().optional(),
  modulos: z.object({
    funciones: z.boolean().optional(),
    audiencia: z.boolean().optional(),
    expedientes: z.boolean().optional(),
    salones: z.boolean().optional(),
  }).strict().optional(),
});
