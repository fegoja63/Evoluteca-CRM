import { prisma } from "@/lib/prisma";

/**
 * Rate limiting de ventana fija persistido en la tabla RateLimit — no
 * requiere Redis/Upstash. Cada "clave" (ej. `login:correo@x.com`,
 * `ip:1.2.3.4:forgot-password`) tiene su propio contador que se reinicia
 * solo cuando la ventana expira.
 */

/** Permite la solicitud y la cuenta contra el límite. Usar cuando cada
 * llamada (exitosa o no) debe contar — ej. forgot-password, link público. */
export async function permitirYRegistrar(clave: string, maxIntentos: number, ventanaMs: number): Promise<boolean> {
  const ahora = new Date();
  const existente = await prisma.rateLimit.findUnique({ where: { clave } });

  if (!existente || ahora.getTime() - existente.ventanaInicio.getTime() > ventanaMs) {
    await prisma.rateLimit.upsert({
      where: { clave },
      create: { clave, intentos: 1, ventanaInicio: ahora },
      update: { intentos: 1, ventanaInicio: ahora },
    });
    return true;
  }

  if (existente.intentos >= maxIntentos) return false;

  await prisma.rateLimit.update({ where: { clave }, data: { intentos: { increment: 1 } } });
  return true;
}

/** Solo verifica, sin registrar — usar antes de intentar una acción cuyo
 * fallo se registra aparte con registrarIntentoFallido (ej. login). */
export async function estaBloqueado(clave: string, maxIntentos: number, ventanaMs: number): Promise<boolean> {
  const existente = await prisma.rateLimit.findUnique({ where: { clave } });
  if (!existente) return false;
  if (Date.now() - existente.ventanaInicio.getTime() > ventanaMs) return false;
  return existente.intentos >= maxIntentos;
}

/** Registra un intento fallido contra la clave (ej. contraseña incorrecta). */
export async function registrarIntentoFallido(clave: string, ventanaMs: number): Promise<void> {
  const ahora = new Date();
  const existente = await prisma.rateLimit.findUnique({ where: { clave } });

  if (!existente || ahora.getTime() - existente.ventanaInicio.getTime() > ventanaMs) {
    await prisma.rateLimit.upsert({
      where: { clave },
      create: { clave, intentos: 1, ventanaInicio: ahora },
      update: { intentos: 1, ventanaInicio: ahora },
    });
    return;
  }

  await prisma.rateLimit.update({ where: { clave }, data: { intentos: { increment: 1 } } });
}

/** Limpia el contador (ej. tras un login exitoso). */
export async function limpiarIntentos(clave: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { clave } });
}

/** IP del cliente detrás del proxy de Vercel. */
export function obtenerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}
