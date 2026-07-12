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

  // Tope de usuarios activos según el plan contratado (lo fija Evoluteca desde
  // el panel interno, no el propio tenant). Los usuarios inactivos no cuentan
  // contra el límite — desactivar a alguien libera un cupo para invitar a otro.
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteUsuarios: true } });
  if (tenant?.limiteUsuarios != null) {
    const activos = await prisma.usuario.count({ where: { tenantId: session.user.tenantId, activo: true } });
    if (activos >= tenant.limiteUsuarios) {
      return NextResponse.json(
        { error: `Tu plan permite hasta ${tenant.limiteUsuarios} usuario${tenant.limiteUsuarios !== 1 ? "s" : ""} activo${tenant.limiteUsuarios !== 1 ? "s" : ""}. Contacta a tu asesor Evoluteca para ampliar el límite.` },
        { status: 403 }
      );
    }
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
