import { z } from "zod";
import { textoOpcional } from "./campos";

// Único endpoint de escritura alcanzable sin autenticación (protegido solo
// por el token de alta entropía + rate limit) — motivoRechazo se acota para
// no permitir texto libre sin límite desde una fuente no autenticada.
export const accionCotizacionPublicaSchema = z.object({
  accion: z.enum(["ACEPTADA", "RECHAZADA"], { error: "Acción inválida" }),
  motivoRechazo: textoOpcional(1000),
});
