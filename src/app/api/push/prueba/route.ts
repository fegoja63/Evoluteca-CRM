import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enviarPush } from "@/lib/push";
import { permitirYRegistrar } from "@/lib/rate-limit";

// "Enviar aviso de prueba" desde Mi perfil: llega a los dispositivos del propio usuario.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const permitido = await permitirYRegistrar(`pushprueba:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  const enviados = await enviarPush(session.user.tenantId, [session.user.id], {
    titulo: "Evoluteca CRM",
    cuerpo: "¡Listo! Así te llegarán los avisos del CRM.",
    url: "/dashboard/perfil",
    etiqueta: "prueba",
  });
  if (enviados === 0) return NextResponse.json({ error: "No hay dispositivos con avisos activos" }, { status: 409 });
  return NextResponse.json({ ok: true, enviados });
}
