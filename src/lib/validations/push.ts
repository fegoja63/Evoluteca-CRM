import { z } from "zod";

// Lo que entrega PushSubscription.toJSON() en el navegador.
export const suscripcionPushSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100),
  }),
  agente: z.string().max(120).optional(),
});

export const quitarPushSchema = z.object({
  endpoint: z.string().url().max(1000),
});
