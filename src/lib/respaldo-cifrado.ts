/**
 * Cifrado del respaldo diario antes de subirlo a Vercel Blob.
 *
 * Por qué cifrar: el respaldo contiene TODOS los datos de los clientes, y las
 * URLs de Vercel Blob son públicas (llevan un sufijo aleatorio, pero cualquiera
 * con el enlace puede descargar). Si ese enlace se filtrara (un correo
 * reenviado, un log), quedaría expuesta la base entera. Cifrando el archivo,
 * aunque el enlace se filtre el contenido es ilegible sin la clave.
 *
 * Esquema: AES-256-GCM (cifra y autentica: si el archivo se corrompe o se
 * altera, el descifrado falla en vez de devolver basura).
 *
 * La clave vive en la variable RESPALDO_CLAVE (32 bytes en hexadecimal = 64
 * caracteres). Se genera una vez con:  openssl rand -hex 32
 * y se guarda en Vercel (Environment Variables) y en el .env local. SIN esa
 * clave el respaldo NO se puede restaurar, así que hay que conservarla.
 *
 * Formato del archivo cifrado:  [ iv (12 bytes) | authTag (16 bytes) | datos ]
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_BYTES = 12;
const TAG_BYTES = 16;

function clave(): Buffer {
  const raw = process.env.RESPALDO_CLAVE;
  if (!raw) throw new Error("RESPALDO_CLAVE no configurada");
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== 32) {
    throw new Error("RESPALDO_CLAVE debe ser 32 bytes en hexadecimal (64 caracteres). Genérala con: openssl rand -hex 32");
  }
  return key;
}

/** Indica si hay una clave de respaldo válida configurada (para fallar temprano). */
export function hayClaveRespaldo(): boolean {
  try {
    clave();
    return true;
  } catch {
    return false;
  }
}

export function cifrar(datos: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", clave(), iv);
  const cifrado = Buffer.concat([cipher.update(datos), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, cifrado]);
}

export function descifrar(paquete: Buffer): Buffer {
  const iv = paquete.subarray(0, IV_BYTES);
  const tag = paquete.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const cifrado = paquete.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", clave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]);
}
