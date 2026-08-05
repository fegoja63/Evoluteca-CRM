import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizarCuerpo } from "@/lib/cuerpo-cotizacion";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { modulos: true, nombre: true, logoUrl: true, emailsActivos: true, limiteUsuarios: true, cuerpoCotizacion: true, diasEstancamiento: true },
  });

  return NextResponse.json({
    modulos: tenant?.modulos ?? {},
    tenantNombre: tenant?.nombre ?? "",
    logoUrl: tenant?.logoUrl ?? "",
    emailsActivos: tenant?.emailsActivos ?? true,
    cuerpoCotizacion: normalizarCuerpo(tenant?.cuerpoCotizacion),
    diasEstancamiento: tenant?.diasEstancamiento ?? 14,
    // Solo Evoluteca puede cambiar este valor desde el panel interno — no se
    // acepta en el PATCH de esta ruta, es de solo lectura para el tenant.
    limiteUsuarios: tenant?.limiteUsuarios ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.modulos !== undefined) data.modulos = body.modulos;
  if (body.logoUrl !== undefined) {
    // El límite de 2MB ya se valida en el frontend, pero eso no protege contra
    // una llamada directa a esta API — se revalida aquí (2MB en base64 ≈ 2.8M
    // caracteres) para que la fila de Tenant no pueda inflarse sin control.
    if (typeof body.logoUrl === "string" && body.logoUrl.length > 2_800_000) {
      return NextResponse.json({ error: "El logo no puede pesar más de 2MB" }, { status: 400 });
    }
    data.logoUrl = body.logoUrl;
  }
  if (body.emailsActivos !== undefined) data.emailsActivos = body.emailsActivos;
  if (body.diasEstancamiento !== undefined) {
    // Se revalida en el servidor (el frontend limita el input, pero eso no
    // protege contra una llamada directa): entero entre 1 y 365 días.
    const n = Number(body.diasEstancamiento);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      return NextResponse.json({ error: "El umbral debe ser un número entero entre 1 y 365 días" }, { status: 400 });
    }
    data.diasEstancamiento = n;
  }
  if (body.cuerpoCotizacion !== undefined) {
    // Se normaliza en el servidor (recorta títulos/contenido y limita la
    // cantidad de secciones) para que una llamada directa no pueda inflar la
    // fila de Tenant ni guardar datos con forma inesperada.
    data.cuerpoCotizacion = normalizarCuerpo(body.cuerpoCotizacion);
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data,
  });

  return NextResponse.json({
    modulos: tenant.modulos,
    logoUrl: tenant.logoUrl ?? "",
    emailsActivos: tenant.emailsActivos,
    cuerpoCotizacion: normalizarCuerpo(tenant.cuerpoCotizacion),
    diasEstancamiento: tenant.diasEstancamiento,
  });
}
