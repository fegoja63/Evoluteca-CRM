import { z } from "zod";
import { nombreRequerido, textoOpcional, idOpcional, montoOpcional, porcentajeOpcional, fechaOpcional, horaOpcional } from "./campos";

const ETAPAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"] as const;

export const crearOportunidadSchema = z.object({
  titulo: nombreRequerido(2, 300),
  valor: montoOpcional().nullable(),
  etapa: z.enum(ETAPAS, { error: "Etapa inválida" }).optional(),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
  contactoId: idOpcional,
  probabilidad: porcentajeOpcional.nullable(),
  fechaCierre: fechaOpcional,
  salonId: idOpcional,
  sede: textoOpcional(200),
  fechaEvento: fechaOpcional,
  horaInicio: horaOpcional,
  horaFin: horaOpcional,
});

export const editarOportunidadSchema = crearOportunidadSchema.extend({
  titulo: nombreRequerido(2, 300).optional(),
});
