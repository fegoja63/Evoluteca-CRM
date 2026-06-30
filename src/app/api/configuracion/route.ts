import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { modulos: true, nombre: true },
  });

  return NextResponse.json(tenant);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la configuración" }, { status: 403 });
  }

  const body = await request.json();
  const { modulos } = body;

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { modulos },
    select: { modulos: true },
  });

  return NextResponse.json(tenant);
}
