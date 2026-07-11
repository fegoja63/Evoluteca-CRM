import { z } from "zod";
import { nombreRequerido, textoOpcional, emailOpcional, telefonoOpcional, montoOpcional } from "./campos";

export const capturarLeadSchema = z.object({
  empresaNombre: nombreRequerido(2, 300),
  empresaEmail: emailOpcional,
  empresaTelefono: telefonoOpcional,
  empresaSector: textoOpcional(100),
  contactoNombre: textoOpcional(200),
  contactoEmail: emailOpcional,
  contactoTelefono: telefonoOpcional,
  contactoCargo: textoOpcional(100),
  oportunidadTitulo: textoOpcional(300),
  oportunidadValor: montoOpcional().nullable(),
  origenLead: textoOpcional(100),
  notas: textoOpcional(2000),
});
