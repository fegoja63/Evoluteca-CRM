import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

// KPIs agregados en la base de datos, independientes de la paginación de
// GET /api/empresas — evita que las tarjetas de resumen muestren solo lo
// que trae la página actual.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const where = {
    tenantId: session.user.tenantId,
    eliminadoEn: null,
    ...filtroOwner(session.user.rol, session.user.id),
    ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, conContactos, contactosVinculados] = await Promise.all([
    prisma.empresa.count({ where }),
    prisma.empresa.count({ where: { ...where, contactos: { some: { eliminadoEn: null } } } }),
    prisma.contacto.count({ where: { empresa: where, eliminadoEn: null } }),
  ]);

  return NextResponse.json({ total, conContactos, sinContactos: total - conContactos, contactosVinculados });
}
