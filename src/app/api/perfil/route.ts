import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, email, passwordActual, nuevaPassword } = await req.json();

  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (nombre?.trim()) data.nombre = nombre.trim();

  if (email?.trim() && email !== usuario.email) {
    const existe = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (existe) return NextResponse.json({ error: "Ese correo ya está en uso" }, { status: 400 });
    data.email = email.toLowerCase();
  }

  if (nuevaPassword) {
    if (!passwordActual) return NextResponse.json({ error: "Debes ingresar tu contraseña actual" }, { status: 400 });
    const valida = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!valida) return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    if (nuevaPassword.length < 8) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(nuevaPassword, 12);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

  await prisma.usuario.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true });
}
