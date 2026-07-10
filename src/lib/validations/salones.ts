import { z } from "zod";
import { nombreRequerido, textoOpcional, enteroOpcional } from "./campos";

export const crearSalonSchema = z.object({
  nombre: nombreRequerido(2, 200),
  capacidad: enteroOpcional(100_000).nullable(),
  descripcion: textoOpcional(1000),
});

export const editarSalonSchema = z.object({
  nombre: nombreRequerido(2, 200).optional(),
  capacidad: enteroOpcional(100_000).nullable(),
  descripcion: textoOpcional(1000),
  activo: z.boolean().optional(),
});
