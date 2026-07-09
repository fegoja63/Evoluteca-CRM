import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede editar usuarios" }, { status: 403 });
  }

  const existente = await prisma.usuario.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (existente.id === session.user.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol o estado" }, { status: 400 });
  }

  const body = await request.json();
  const { nombre, rol, activo, nuevaPassword } = body;

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    data.nombre = nombre.trim();
  }
  if (rol !== undefined) {
    if (!["ADMINISTRADOR", "GERENTE", "COMERCIAL"].includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    data.rol = rol;
  }
  if (activo !== undefined) data.activo = activo;
  if (nuevaPassword !== undefined) {
    if (typeof nuevaPassword !== "string" || nuevaPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(nuevaPassword, 12);
  }

  const actualizado = await prisma.usuario.update({
    where: { id: params.id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  });

  return NextResponse.json(actualizado);
}
