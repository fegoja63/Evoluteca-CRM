import { z } from "zod";

export const restaurarSchema = z.object({
  tipo: z.enum(["empresa", "contacto"], { error: "Tipo inválido" }),
  id: z.string().uuid("Id inválido"),
});
