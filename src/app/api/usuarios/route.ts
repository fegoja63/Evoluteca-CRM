import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { creadoEn: "asc" },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede invitar usuarios" }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, email, password, rol } = body;

  if (!nombre?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Nombre, correo y una contraseña de al menos 8 caracteres son obligatorios" },
      { status: 400 }
    );
  }

  if (!["ADMINISTRADOR", "GERENTE", "COMERCIAL"].includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      email: email.trim(),
      passwordHash,
      rol,
      tenantId: session.user.tenantId,
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
