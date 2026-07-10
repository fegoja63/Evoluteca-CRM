import { NextResponse } from "next/server";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";

// Autenticación de las páginas internas de Evoluteca (crear/gestionar
// tenants): una clave compartida (ADMIN_REGISTRO_SECRET), no una sesión de
// usuario — mismo patrón que ya usaba /api/registro. Se limita por IP para
// que la clave no sea adivinable por fuerza bruta.
export async function verificarClaveAdmin(req: Request): Promise<NextResponse | null> {
  const secretConfigurado = process.env.ADMIN_REGISTRO_SECRET;
  if (!secretConfigurado) {
    return NextResponse.json({ error: "ADMIN_REGISTRO_SECRET no configurado" }, { status: 503 });
  }

  const permitido = await permitirYRegistrar(`admin-evoluteca:${obtenerIp(req)}`, 10, 15 * 60 * 1000);
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const clave = req.headers.get("x-admin-secret");
  if (clave !== secretConfigurado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return null;
}
