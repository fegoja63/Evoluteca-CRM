import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarIcsAgenda } from "@/lib/calendario-ics";

// Feed público de suscripción de calendario. NO usa sesión: los clientes de
// calendario (Google/Outlook/Apple) refrescan la URL periódicamente sin enviar
// cookies, así que la autorización es el token secreto e irrepetible que va en
// la ruta. El token se puede revocar/regenerar desde "Mi perfil".
export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  // La URL termina en ".ics" para que los clientes de calendario la reconozcan;
  // el token real es el segmento sin esa extensión.
  const token = params.token.replace(/\.ics$/i, "");
  if (!token) return new NextResponse("No encontrado", { status: 404 });

  const usuario = await prisma.usuario.findUnique({
    where: { tokenCalendario: token },
    select: {
      id: true, nombre: true, rol: true, activo: true, tenantId: true,
      tenant: { select: { activo: true } },
    },
  });

  // Respuesta idéntica (404) tanto si el token no existe como si el usuario o su
  // tenant están inactivos, para no filtrar cuáles tokens son válidos.
  if (!usuario || !usuario.activo || !usuario.tenant.activo) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const ics = await generarIcsAgenda({
    tenantId: usuario.tenantId,
    rol:      usuario.rol,
    userId:   usuario.id,
    nombre:   usuario.nombre,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type":  "text/calendar; charset=utf-8",
      // Inline (no attachment): es un feed que el cliente de calendario lee, no
      // un archivo que el usuario descarga.
      "Content-Disposition": 'inline; filename="agenda-evoluteca.ics"',
      // `private` para que ningún CDN/proxy intermedio cachee datos personales
      // bajo la URL del token, y `no-store` para que revocar el token surta
      // efecto al instante (sin ventana de cache que siga sirviendo la agenda).
      // Los clientes de calendario refrescan por su cuenta (ver REFRESH-INTERVAL).
      "Cache-Control": "private, no-store",
    },
  });
}
