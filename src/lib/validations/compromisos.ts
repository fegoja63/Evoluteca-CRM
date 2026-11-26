import { z } from "zod";

const cantidad = z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo").max(10_000, "Es demasiado alto");
const indicadores = {
  contactos: cantidad.default(0),
  negocios: cantidad.default(0),
  llamadas: cantidad.default(0),
  reuniones: cantidad.default(0),
  propuestas: cantidad.default(0),
};

export const metaActividadSchema = z.object({
  userId: z.string().min(1, "Falta el usuario").max(64),
  ...indicadores,
});

export const compromisoSemanalSchema = z.object({
  userId: z.string().min(1, "Falta el usuario").max(64),
  // Lunes de la semana ("YYYY-MM-DD"); si no viene, la semana actual.
  semana: z.string().optional(),
  ...indicadores,
  nota: z.string().trim().max(500, "La nota es muy larga").optional().nullable(),
});
