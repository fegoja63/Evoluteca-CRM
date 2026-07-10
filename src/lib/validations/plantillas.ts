import { z } from "zod";
import { nombreRequerido, textoOpcional, montoOpcional } from "./campos";

const itemSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción del ítem es obligatoria").max(300),
  cantidad: montoOpcional(1_000_000, "La cantidad no puede ser negativa"),
  precioUnit: montoOpcional(999_999_999, "El precio no puede ser negativo"),
});

export const crearPlantillaSchema = z.object({
  nombre: nombreRequerido(2, 200),
  notas: textoOpcional(1000),
  items: z.array(itemSchema).optional().default([]),
});

// PATCH acepta un renombre solo (nombre) o una edición completa (nombre +
// items, donde items reemplaza la lista entera de ítems de la plantilla).
export const editarPlantillaSchema = z.object({
  nombre: nombreRequerido(2, 200),
  items: z.array(itemSchema).optional(),
});
