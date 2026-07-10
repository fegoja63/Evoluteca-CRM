import { z } from "zod";
import { nombreRequerido, textoOpcional, montoNoNegativo, montoOpcional } from "./campos";

export const crearProductoSchema = z.object({
  nombre: nombreRequerido(2, 200),
  descripcion: textoOpcional(1000),
  precioBase: montoNoNegativo(999_999_999, "El precio no puede ser negativo"),
});

export const editarProductoSchema = z.object({
  nombre: nombreRequerido(2, 200).optional(),
  descripcion: textoOpcional(1000),
  precioBase: montoOpcional(999_999_999, "El precio no puede ser negativo"),
  activo: z.boolean().optional(),
});
