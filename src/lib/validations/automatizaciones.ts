import { z } from "zod";
import { EVENTOS, ACCIONES } from "@/lib/automatizaciones";

// Keys del enum EtapaOportunidad (valor destino que dispara la regla).
const ETAPAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"] as const;

// La forma concreta de `config` la valida validarConfigAccion() según la acción;
// aquí solo se acepta un objeto suelto.
const config = z.record(z.string(), z.unknown());

export const crearAutomatizacionSchema = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre a la automatización").max(100, "Máximo 100 caracteres"),
  evento: z.enum(EVENTOS, { error: "Evento inválido" }),
  etapaDestino: z.union([z.enum(ETAPAS), z.literal(""), z.null()]).optional(),
  accion: z.enum(ACCIONES, { error: "Acción inválida" }),
  config: config.optional().default({}),
  activa: z.boolean().optional().default(true),
});

export const editarAutomatizacionSchema = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre a la automatización").max(100, "Máximo 100 caracteres").optional(),
  etapaDestino: z.union([z.enum(ETAPAS), z.literal(""), z.null()]).optional(),
  config: config.optional(),
  activa: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});
