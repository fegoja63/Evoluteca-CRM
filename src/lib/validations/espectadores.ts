import { z } from "zod";
import { nombreRequerido, emailOpcional, telefonoOpcional, textoOpcional } from "./campos";

const SEGMENTOS = ["INDIVIDUAL", "GRUPO", "EMPRESA", "COLEGIO"] as const;
const NIVELES = ["ESPECTADOR", "FANATICO", "MECENAS"] as const;

export const crearEspectadorSchema = z.object({
  nombre: nombreRequerido(2, 200),
  email: emailOpcional,
  telefono: telefonoOpcional,
  segmento: z.enum(SEGMENTOS, { error: "Segmento inválido" }).optional(),
  notas: textoOpcional(2000),
});

export const editarEspectadorSchema = z.object({
  nombre: nombreRequerido(2, 200).optional(),
  email: emailOpcional,
  telefono: telefonoOpcional,
  segmento: z.enum(SEGMENTOS, { error: "Segmento inválido" }).optional(),
  nivelMembresia: z.union([z.enum(NIVELES, { error: "Nivel inválido" }), z.null()]).optional(),
  notas: textoOpcional(2000),
});
