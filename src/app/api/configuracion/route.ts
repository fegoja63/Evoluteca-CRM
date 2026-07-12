import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { modulos: true, nombre: true, logoUrl: true, emailsActivos: true, limiteUsuarios: true },
  });

  return NextResponse.json({
    modulos: tenant?.modulos ?? {},
    tenantNombre: tenant?.nombre ?? "",
    logoUrl: tenant?.logoUrl ?? "",
    emailsActivos: tenant?.emailsActivos ?? true,
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

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data,
  });

  return NextResponse.json({ modulos: tenant.modulos, logoUrl: tenant.logoUrl ?? "", emailsActivos: tenant.emailsActivos });
}
