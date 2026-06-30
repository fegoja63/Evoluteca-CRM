import { z } from "zod";

export const registroSchema = z.object({
  nombreEmpresa: z
    .string()
    .min(2, "El nombre de la empresa debe tener al menos 2 caracteres"),
  nombreUsuario: z
    .string()
    .min(2, "Tu nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Ingresa un correo válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type RegistroInput = z.infer<typeof registroSchema>;

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;
