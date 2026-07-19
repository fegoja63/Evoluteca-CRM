import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Gestión del token de suscripción de calendario del usuario en sesión.
//   GET    -> devuelve el token actual (o null si no hay suscripción activa)
//   POST   -> genera uno nuevo (o lo regenera, invalidando el anterior)
//   DELETE -> revoca la suscripción
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { tokenCalendario: true },
  });

  return NextResponse.json({ token: usuario?.tokenCalendario ?? null });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 24 bytes = 192 bits de entropía en hex: imposible de adivinar y revocable.
  const token = randomBytes(24).toString("hex");

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { tokenCalendario: token },
  });

  return NextResponse.json({ token });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { tokenCalendario: null },
  });

  return NextResponse.json({ ok: true });
}
