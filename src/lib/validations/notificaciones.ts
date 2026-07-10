import { z } from "zod";

// El "tipo" determina qué plantilla de email arma la ruta — sin este
// allow-list, un tipo no reconocido armaba silenciosamente un correo con
// asunto y cuerpo vacíos en vez de fallar con un error claro.
export const enviarNotificacionSchema = z.object({
  tipo: z.enum(["RECORDATORIO_ACTIVIDAD", "COTIZACION_ENVIADA", "RESUMEN_DIARIO"], { error: "Tipo de notificación inválido" }),
  datos: z.record(z.string(), z.unknown()).optional().default({}),
});
