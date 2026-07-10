import { z } from "zod";
import { nombreRequerido, textoOpcional, idOpcional, fechaValida, fechaOpcional } from "./campos";

const ESTADOS_EXPEDIENTE = ["ACTIVO", "ARCHIVADO", "GANADO", "PERDIDO"] as const;
const ESTADOS_TERMINO = ["PENDIENTE", "CUMPLIDO", "VENCIDO"] as const;

export const crearExpedienteSchema = z.object({
  numeroRadicado: nombreRequerido(1, 100),
  juzgado: textoOpcional(200),
  tipoProceso: textoOpcional(200),
  contraparte: nombreRequerido(1, 300),
  estado: z.enum(ESTADOS_EXPEDIENTE, { error: "Estado inválido" }).optional(),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
});

export const editarExpedienteSchema = z.object({
  numeroRadicado: nombreRequerido(1, 100).optional(),
  juzgado: textoOpcional(200),
  tipoProceso: textoOpcional(200),
  contraparte: nombreRequerido(1, 300).optional(),
  estado: z.enum(ESTADOS_EXPEDIENTE, { error: "Estado inválido" }).optional(),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
});

export const crearTerminoSchema = z.object({
  descripcion: nombreRequerido(1, 500),
  fechaLimite: fechaValida,
  notas: textoOpcional(2000),
});

export const editarTerminoSchema = z.object({
  estado: z.enum(ESTADOS_TERMINO, { error: "Estado inválido" }).optional(),
  descripcion: nombreRequerido(1, 500).optional(),
  fechaLimite: fechaOpcional,
  notas: textoOpcional(2000),
});

export const registrarHorasSchema = z.object({
  fecha: fechaValida,
  horas: z.coerce.number().min(0.25, "Mínimo 0.25 horas").max(24, "Máximo 24 horas por registro"),
  descripcion: textoOpcional(500),
});
