import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const [empresas, contactos] = await Promise.all([
    prisma.empresa.findMany({
      where: { tenantId, eliminadoEn: { not: null } },
      select: { id: true, nombre: true, email: true, sector: true, eliminadoEn: true },
      orderBy: { eliminadoEn: "desc" },
    }),
    prisma.contacto.findMany({
      where: { tenantId, eliminadoEn: { not: null } },
      select: { id: true, nombre: true, email: true, cargo: true, eliminadoEn: true },
      orderBy: { eliminadoEn: "desc" },
    }),
  ]);

  return NextResponse.json({ empresas, contactos });
}
