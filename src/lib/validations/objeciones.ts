import { z } from "zod";

// Objeción de venta: lo que dice el cliente + la respuesta recomendada, con una
// categoría libre y, opcionalmente, la respuesta que conviene evitar.
export const crearObjecionSchema = z.object({
  categoria: z.string().trim().max(60).optional().nullable(),
  objecion: z.string().trim().min(2, "La objeción es obligatoria").max(300),
  respuesta: z.string().trim().min(2, "La respuesta recomendada es obligatoria").max(2000),
  loQueNoDecir: z.string().trim().max(2000).optional().nullable(),
});

export const editarObjecionSchema = crearObjecionSchema.partial().extend({
  activa: z.boolean().optional(),
  orden: z.number().int().min(0).max(100000).optional(),
});
