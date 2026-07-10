import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// KPIs agregados en la base de datos, independientes de la paginación de
// GET /api/contactos.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const where = {
    tenantId: session.user.tenantId,
    eliminadoEn: null,
    ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, conEmpresa, conEmail] = await Promise.all([
    prisma.contacto.count({ where }),
    prisma.contacto.count({ where: { ...where, empresaId: { not: null } } }),
    prisma.contacto.count({ where: { ...where, email: { not: null } } }),
  ]);

  return NextResponse.json({ total, conEmpresa, sinEmpresa: total - conEmpresa, conEmail });
}
