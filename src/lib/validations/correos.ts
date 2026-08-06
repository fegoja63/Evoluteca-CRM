import { z } from "zod";
import { emailRequerido, idOpcional } from "./campos";

export const enviarCorreoSchema = z.object({
  para: emailRequerido,
  asunto: z.string().trim().min(1, "El asunto es obligatorio").max(200, "Máximo 200 caracteres"),
  cuerpo: z.string().trim().min(1, "El mensaje no puede estar vacío").max(10000, "Máximo 10.000 caracteres"),
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
});
