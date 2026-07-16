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
  // null = sin límite (usuarios ilimitados); un entero positivo es el tope
  // de usuarios activos permitidos para ese tenant.
  limiteUsuarios: z.union([z.number().int().min(1).max(9999), z.null()]).optional(),
  // Tope mensual de Resúmenes con IA. null = ilimitado; 0 = desactivado;
  // entero positivo = tope. Palanca de plan controlada solo por el panel.
  limiteResumenesIA: z.union([z.number().int().min(0).max(99999), z.null()]).optional(),
  modulos: z.object({
    funciones: z.boolean().optional(),
    audiencia: z.boolean().optional(),
    expedientes: z.boolean().optional(),
    salones: z.boolean().optional(),
    ahorros: z.boolean().optional(),
  }).strict().optional(),
});
