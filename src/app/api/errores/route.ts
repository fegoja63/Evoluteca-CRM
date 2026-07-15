import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";

// Endpoint del monitoreo propio: recibe errores del cliente (error boundary +
// window.onerror) y los guarda en error_logs. Es best-effort: nunca lanza ni
// devuelve un error que pueda causar más ruido — si algo falla, se ignora.

const cap = (v: unknown, n: number): string | null =>
  typeof v === "string" && v.trim() ? v.slice(0, n) : null;

export async function POST(req: Request) {
  try {
    // Límite por IP para que nadie inunde la tabla con reportes falsos.
    const permitido = await permitirYRegistrar(`errores:${obtenerIp(req)}`, 40, 60 * 1000);
    if (!permitido) return new NextResponse(null, { status: 204 });

    const body = await req.json().catch(() => ({}));
    const mensaje = cap(body?.mensaje, 2000);
    if (!mensaje) return new NextResponse(null, { status: 204 });

    // Contexto de sesión, si hay (para saber qué tenant/usuario tuvo el error).
    let tenantId: string | null = null, tenantNombre: string | null = null, usuarioEmail: string | null = null;
    try {
      const session = await auth();
      if (session?.user) {
        tenantId = session.user.tenantId ?? null;
        tenantNombre = session.user.tenantNombre ?? null;
        usuarioEmail = session.user.email ?? null;
      }
    } catch { /* sin sesión */ }

    const tipo = ["client", "unhandledrejection", "boundary"].includes(body?.tipo) ? body.tipo : "client";

    await prisma.errorLog.create({
      data: {
        mensaje,
        stack: cap(body?.stack, 8000),
        url: cap(body?.url, 500),
        tipo,
        tenantId, tenantNombre, usuarioEmail,
        userAgent: cap(req.headers.get("user-agent"), 400),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
