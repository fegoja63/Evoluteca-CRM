import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import bcrypt from "bcryptjs";

/**
 * Verificación en dos pasos (TOTP), opcional por usuario.
 *
 * TOTP y no códigos por correo a propósito: es lo que esperan los pliegos de
 * gobierno y sector financiero, funciona sin depender del envío de correo, y
 * no cuesta nada por uso. El usuario lo configura con Google Authenticator,
 * Microsoft Authenticator, 1Password o cualquier app compatible.
 */

// otplib 13 pide los plugins de forma explícita: no trae criptografía ni
// base32 propios. Se crea una sola instancia y se reutiliza.
const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

// Margen de un período (30 s) a cada lado. Sin esto, un reloj de teléfono
// ligeramente desfasado —cosa muy común— hace que la app "no funcione" sin
// que el usuario entienda por qué.
const TOLERANCIA_SEGUNDOS = 30;

const CANTIDAD_CODIGOS_RESPALDO = 8;

/** Secreto nuevo para empezar la activación. */
export async function generarSecreto(): Promise<string> {
  return totp.generateSecret();
}

/**
 * URI que la app de autenticación entiende (se pinta como código QR).
 * El "emisor" es lo que el usuario verá en su app junto al código.
 */
export async function uriParaApp(
  email: string,
  secreto: string,
  emisor = "Evoluteca CRM"
): Promise<string> {
  return totp.toURI({ secret: secreto, label: email, issuer: emisor });
}

/** Genera el código actual para un secreto. Se usa en pruebas y al confirmar. */
export async function generarCodigo(secreto: string): Promise<string> {
  return totp.generate({ secret: secreto });
}

/** ¿El código de 6 dígitos corresponde a este secreto ahora mismo? */
export async function codigoValido(codigo: string, secreto: string): Promise<boolean> {
  // Se quitan espacios porque la gente copia y pega el código desde la app.
  const limpio = (codigo ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return false;

  try {
    const resultado = await totp.verify(limpio, {
      secret: secreto,
      epochTolerance: TOLERANCIA_SEGUNDOS,
    });
    return resultado.valid === true;
  } catch {
    // Un secreto corrupto no debe tumbar el login: simplemente no valida.
    return false;
  }
}

/**
 * Códigos de un solo uso para cuando el usuario pierde el teléfono.
 *
 * Se devuelven en claro UNA vez —para que los guarde— y se almacenan
 * hasheados. Si se guardaran en claro serían una segunda contraseña escrita
 * en la base de datos.
 */
export async function generarCodigosRespaldo(): Promise<{ enClaro: string[]; hasheados: string[] }> {
  const enClaro = Array.from({ length: CANTIDAD_CODIGOS_RESPALDO }, () => {
    // Se usa la criptografía estándar (Web Crypto) y no node:crypto: este
    // módulo lo importa auth.ts, que acaba en el bundle del middleware, y ahí
    // corre el runtime Edge, donde "node:crypto" no existe y rompe el build.
    const bytes = new Uint8Array(5);
    globalThis.crypto.getRandomValues(bytes);

    // 10 caracteres hexadecimales en dos bloques, legibles al copiarlos a mano.
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
      .replace(/^(.{5})(.{5})$/, "$1-$2");
  });

  const hasheados = await Promise.all(enClaro.map((c) => bcrypt.hash(c, 10)));
  return { enClaro, hasheados };
}

/**
 * Consume un código de respaldo: si coincide con alguno, lo devuelve gastado.
 *
 * Devuelve la lista de hashes YA SIN el usado. Un código de respaldo que
 * sirviera dos veces no sería de un solo uso.
 */
export async function consumirCodigoRespaldo(
  codigo: string,
  hasheados: string[]
): Promise<{ valido: boolean; restantes: string[] }> {
  const limpio = (codigo ?? "").trim().toUpperCase();
  if (!limpio) return { valido: false, restantes: hasheados };

  for (const hash of hasheados) {
    if (await bcrypt.compare(limpio, hash)) {
      return { valido: true, restantes: hasheados.filter((h) => h !== hash) };
    }
  }

  return { valido: false, restantes: hasheados };
}

/** ¿Este usuario tiene la verificación en dos pasos realmente activa? */
export function tieneDosFactores(usuario: {
  totpSecret: string | null;
  totpActivadoEn: Date | null;
}): boolean {
  // Hacen falta las dos cosas: hay secreto guardado desde que EMPIEZA la
  // activación, pero no cuenta hasta que confirmó con un código válido.
  return Boolean(usuario.totpSecret && usuario.totpActivadoEn);
}
