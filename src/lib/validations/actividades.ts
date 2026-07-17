import { z } from "zod";
import { nombreRequerido, textoOpcional, idOpcional, fechaValida, fechaOpcional } from "./campos";

const TIPOS = ["LLAMADA", "REUNION", "TAREA", "EMAIL", "VISITA_COMERCIAL", "VISITA_TECNICA"] as const;
const ESTADOS = ["PENDIENTE", "EN_PROGRESO", "COMPLETADA"] as const;

export const crearActividadSchema = z.object({
  tipo: z.enum(TIPOS, { error: "Tipo inválido" }).optional(),
  titulo: nombreRequerido(2, 300),
  fecha: fechaValida,
  notas: textoOpcional(2000),
  estado: z.enum(ESTADOS, { error: "Estado inválido" }).optional(),
  responsableId: idOpcional,
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
});

export const editarActividadSchema = z.object({
  completada: z.boolean().optional(),
  estado: z.enum(ESTADOS, { error: "Estado inválido" }).optional(),
  responsableId: idOpcional,
  titulo: nombreRequerido(2, 300).optional(),
  tipo: z.enum(TIPOS, { error: "Tipo inválido" }).optional(),
  fecha: fechaOpcional,
  notas: textoOpcional(2000),
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
});
