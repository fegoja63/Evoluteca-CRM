import { z } from "zod";
import { TIPOS_CAMPO, ENTIDADES_CAMPO } from "@/lib/campos-personalizados";

const opciones = z
  .array(z.string().trim().min(1, "Una opción no puede estar vacía").max(80, "Máximo 80 caracteres"))
  .max(50, "Máximo 50 opciones");

export const crearCampoSchema = z.object({
  entidad: z.enum(ENTIDADES_CAMPO, { error: "Entidad inválida" }),
  etiqueta: z.string().trim().min(1, "Ponle un nombre al campo").max(60, "Máximo 60 caracteres"),
  tipo: z.enum(TIPOS_CAMPO, { error: "Tipo inválido" }),
  opciones: opciones.optional().default([]),
  obligatorio: z.boolean().optional().default(false),
});

export const editarCampoSchema = z.object({
  etiqueta: z.string().trim().min(1, "Ponle un nombre al campo").max(60, "Máximo 60 caracteres").optional(),
  opciones: opciones.optional(),
  obligatorio: z.boolean().optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});
