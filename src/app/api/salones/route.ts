import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";
import { crearSalonSchema } from "@/lib/validations/salones";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const salones = await prisma.salon.findMany({
    where: { tenantId: session.user.tenantId, activo: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(salones);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "salones")) {
    return NextResponse.json({ error: "El módulo Salones no está activo" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = parseOrError(crearSalonSchema, body);
  if (error) return error;
  const { nombre, capacidad, descripcion } = data;

  const salon = await prisma.salon.create({
    data: {
      nombre: nombre.trim(),
      capacidad: capacidad ?? null,
      descripcion: descripcion?.trim() || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(salon, { status: 201 });
}
