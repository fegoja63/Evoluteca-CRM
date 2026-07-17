import { z } from "zod";
import { nombreRequerido, emailOpcional, telefonoOpcional, urlOpcional, textoOpcional } from "./campos";

export const crearEmpresaSchema = z.object({
  nombre: nombreRequerido(),
  email: emailOpcional,
  sector: textoOpcional(100),
  sitioWeb: urlOpcional,
  telefono: telefonoOpcional,
  notas: textoOpcional(2000),
  condicionesComerciales: textoOpcional(4000),
});

export const editarEmpresaSchema = z.object({
  nombre: nombreRequerido().optional(),
  email: emailOpcional,
  sector: textoOpcional(100),
  sitioWeb: urlOpcional,
  telefono: telefonoOpcional,
  notas: textoOpcional(2000),
  condicionesComerciales: textoOpcional(4000),
  etiquetas: z.array(z.string().trim().max(40)).max(20, "Máximo 20 etiquetas").optional(),
});
