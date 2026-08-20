// Dirección base pública desde la que llegó la petición (el dominio del
// despliegue actual). Sirve para construir enlaces de correo / PDF / enlace
// público que apunten al MISMO entorno donde se generan: producción→producción,
// preview→preview, local→local. Evita el cruce de entornos que se daba al usar
// un dominio fijo (NEXTAUTH_URL), donde un enlace generado en el preview
// apuntaba a producción y "no encontraba" la cotización.
//
// Detrás del proxy de Vercel, el dominio público viene en x-forwarded-host; se
// usa como primera opción. Si no hubiera cabeceras (algún entorno raro), se cae
// al origin de la URL de la petición y, por último, a NEXTAUTH_URL.
export function baseUrlDesdePeticion(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.NEXTAUTH_URL ?? "";
  }
}
