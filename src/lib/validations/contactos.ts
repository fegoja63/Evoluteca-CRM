import { z } from "zod";
import { nombreRequerido, emailOpcional, telefonoOpcional, textoOpcional, idOpcional } from "./campos";

export const crearContactoSchema = z.object({
  nombre: nombreRequerido(),
  email: emailOpcional,
  telefono: telefonoOpcional,
  cargo: textoOpcional(100),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
});

export const editarContactoSchema = z.object({
  nombre: nombreRequerido().optional(),
  email: emailOpcional,
  telefono: telefonoOpcional,
  cargo: textoOpcional(100),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
});
