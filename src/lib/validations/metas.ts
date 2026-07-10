import { z } from "zod";
import { montoNoNegativo } from "./campos";

const anio = z.coerce.number().int().min(2020, "Año inválido").max(2100, "Año inválido");
const mes = z.coerce.number().int().min(1, "Mes inválido").max(12, "Mes inválido");

export const crearMetaSchema = z.object({
  anio,
  // null/ausente = meta anual (MetaVenta.mes es opcional en el schema de Prisma).
  mes: mes.optional().nullable(),
  valorObjetivo: montoNoNegativo(999_999_999_999, "El objetivo no puede ser negativo").refine(v => v > 0, "El objetivo debe ser mayor a 0"),
});

export const eliminarMetaSchema = z.object({
  anio,
  mes: mes.optional().nullable(),
});

export const crearMetaVendedorSchema = z.object({
  userId: z.string().uuid("Id de usuario inválido"),
  anio,
  mes,
  meta: montoNoNegativo(999_999_999_999, "La meta no puede ser negativa").refine(v => v > 0, "La meta debe ser mayor a 0"),
});
