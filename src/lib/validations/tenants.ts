import { z } from "zod";

const PLANES = ["arranque", "empresa", "corporativo"] as const;

// Fecha de calendario de un <input type="date"> ("YYYY-MM-DD"); null la borra.
const diaOpcional = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"), z.null()]).optional();

// Habilitar un módulo de pago desde el panel interno (ver lib/licencias.ts).
// Las fechas son "YYYY-MM-DD": compararlas como texto da el orden correcto.
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
export const crearLicenciaSchema = z.object({
  producto: z.enum(["FINANZAS"], { error: "Producto inválido" }),
  desde: dia,
  hasta: dia,
  referenciaPago: z.string().trim().min(3, "Escriba la referencia del pago recibido").max(120, "Máximo 120 caracteres"),
  nota: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
}).refine(d => d.hasta >= d.desde, { message: "La fecha final debe ser igual o posterior a la inicial", path: ["hasta"] });

// z.record(z.enum(...), ...) en Zod v4 exige las 4 claves del enum presentes
// (record exhaustivo) — un PATCH parcial como { expedientes: true } lo
// rechaza. Se valida como objeto con las 4 claves opcionales en su lugar,
// ya que el llamador solo manda el/los módulo(s) que está cambiando.
export const editarTenantSchema = z.object({
  activo: z.boolean().optional(),
  plan: z.enum(PLANES, { error: "Plan inválido" }).optional(),
  emailsActivos: z.boolean().optional(),
  soloFinanzas: z.boolean().optional(),
  // null = sin límite (usuarios ilimitados); un entero positivo es el tope
  // de usuarios activos permitidos para ese tenant.
  limiteUsuarios: z.union([z.number().int().min(1).max(9999), z.null()]).optional(),
  // Tope mensual de Resúmenes con IA. null = ilimitado; 0 = desactivado;
  // entero positivo = tope. Palanca de plan controlada solo por el panel.
  limiteResumenesIA: z.union([z.number().int().min(0).max(99999), z.null()]).optional(),
  // Vencimiento de la licencia y día del aviso interno (ver lib/aviso-licencia).
  licenciaVenceEn: diaOpcional,
  licenciaAvisoEn: diaOpcional,
  modulos: z.object({
    funciones: z.boolean().optional(),
    audiencia: z.boolean().optional(),
    expedientes: z.boolean().optional(),
    salones: z.boolean().optional(),
    ahorros: z.boolean().optional(),
  }).strict().optional(),
});
