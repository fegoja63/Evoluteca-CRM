import { z } from "zod";
import { nombreRequerido, textoOpcional, idOpcional, fechaValida, fechaOpcional } from "./campos";

const TIPOS = ["LLAMADA", "REUNION", "TAREA", "EMAIL"] as const;

export const crearActividadSchema = z.object({
  tipo: z.enum(TIPOS, { error: "Tipo inválido" }).optional(),
  titulo: nombreRequerido(2, 300),
  fecha: fechaValida,
  notas: textoOpcional(2000),
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
});

export const editarActividadSchema = z.object({
  completada: z.boolean().optional(),
  titulo: nombreRequerido(2, 300).optional(),
  tipo: z.enum(TIPOS, { error: "Tipo inválido" }).optional(),
  fecha: fechaOpcional,
  notas: textoOpcional(2000),
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
});
