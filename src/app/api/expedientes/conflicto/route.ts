import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const nombre = searchParams.get("nombre")?.trim();
  if (!nombre || nombre.length < 3) {
    return NextResponse.json({ empresas: [], contactos: [] });
  }

  const [empresas, contactos] = await Promise.all([
    prisma.empresa.findMany({
      where: { tenantId: session.user.tenantId, nombre: { contains: nombre, mode: "insensitive" } },
      select: { id: true, nombre: true },
      take: 5,
    }),
    prisma.contacto.findMany({
      where: { tenantId: session.user.tenantId, nombre: { contains: nombre, mode: "insensitive" } },
      select: { id: true, nombre: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ empresas, contactos });
}
