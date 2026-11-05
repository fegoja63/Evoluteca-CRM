import { randomBytes } from "crypto";

/**
 * Lógica pura del correo entrante (sin IMAP ni BD), aislada para poder probarla.
 *
 * Flujo: al ENVIAR un correo desde el CRM se genera un `tokenHilo` que viaja en
 * el Reply-To como sub-dirección del buzón de ingest en Gmail
 * (`base+<token>@gmail.com`, usando el truco del "+"). Cuando el cliente
 * responde, la respuesta llega a ese buzón; el cron de entrada lee el token de
 * la dirección de destino y así sabe a qué oportunidad/contacto pertenece y a
 * qué vendedor reenviarla.
 */

// 16 bytes → 32 hex. Solo [0-9a-f]: seguro dentro del local-part de un email y
// del sub-address de Gmail, sin caracteres que haya que escapar.
export function generarTokenHilo(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Construye el Reply-To con sub-dirección a partir del buzón de ingest.
 * `crm.evoluteca.inbox@gmail.com` + token → `crm.evoluteca.inbox+token@gmail.com`.
 * Devuelve null si el buzón no tiene el formato `local@dominio`.
 */
export function construirReplyTo(ingestBase: string, token: string): string | null {
  const base = ingestBase.trim().toLowerCase();
  const arroba = base.lastIndexOf("@");
  if (arroba <= 0 || arroba === base.length - 1) return null;
  const local = base.slice(0, arroba);
  const dominio = base.slice(arroba + 1);
  return `${local}+${token}@${dominio}`;
}

/**
 * Extrae el token de hilo de una lista de direcciones destino (To/Cc/etc.).
 * Solo acepta direcciones cuyo buzón (ignorando la sub-dirección `+…`) coincida
 * con el buzón de ingest configurado — así una respuesta que llegue por copia a
 * otra dirección no se malinterpreta. Devuelve el primer token encontrado.
 */
export function extraerToken(direcciones: string[], ingestBase: string): string | null {
  const base = ingestBase.trim().toLowerCase();
  const arroba = base.lastIndexOf("@");
  if (arroba <= 0) return null;
  const localBase = base.slice(0, arroba);
  const dominioBase = base.slice(arroba + 1);

  for (const dir of direcciones) {
    if (!dir) continue;
    const limpia = dir.trim().toLowerCase();
    const a = limpia.lastIndexOf("@");
    if (a <= 0) continue;
    const local = limpia.slice(0, a);
    const dominio = limpia.slice(a + 1);
    if (dominio !== dominioBase) continue;

    const mas = local.indexOf("+");
    if (mas < 0) continue;
    const local0 = local.slice(0, mas);
    const token = local.slice(mas + 1);
    if (local0 !== localBase) continue;
    if (token) return token;
  }
  return null;
}

/**
 * Topes de tiempo del cron de correos entrantes (ms). Vercel corta la función a
 * los 120 s (maxDuration) y responde 504; el 2026-10-29 y el 2026-11-05 Gmail
 * respondió lento y pasó. Cada paso que espera a Gmail o a Resend tiene su
 * propio tope, y solo se empieza un mensaje nuevo dentro del presupuesto del
 * lote, así que la suma queda por debajo de 120 s:
 *   conexión 30 + buzón 15 (dentro del lote de 60) + último mensaje
 *   (descarga 15 + aviso 10 + marcar leído 5) + cierre 5 ≈ 95 s.
 * Lo que no alcanza queda sin leer y lo toma la próxima corrida.
 */
export const TOPES_CORREO = {
  lote: 60_000,
  conexion: 30_000,
  buzon: 15_000,
  descarga: 15_000,
  aviso: 10_000,
  marcarLeido: 5_000,
  cierre: 5_000,
};

/** Error de un paso que no respondió a tiempo. */
export class TopeExcedido extends Error {}

/** Espera la promesa hasta `ms`; si no llega, falla con TopeExcedido. */
export function conTope<T>(promesa: Promise<T>, ms: number, paso: string): Promise<T> {
  // Si el tope gana, la operación original puede fallar después (p. ej. al
  // cerrar la conexión): se atiende aquí para que no quede como rechazo no
  // manejado, que en Node puede tumbar el proceso.
  promesa.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TopeExcedido(`${paso}: sin respuesta en ${Math.round(ms / 1000)} s`)), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}
