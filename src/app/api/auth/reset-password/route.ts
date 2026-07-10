import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { parseOrError } from "@/lib/validations/helpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = parseOrError(resetPasswordSchema, body);
  if (error) return error;
  const { token, password } = data;

  // El token es de 256 bits (imposible de adivinar), pero se limita por IP
  // de todas formas como defensa adicional y para frenar abuso automatizado.
  const permitido = await permitirYRegistrar(`reset:ip:${obtenerIp(req)}`, 10, 15 * 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });

  const usuario = await prisma.usuario.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!usuario) {
    return NextResponse.json({ error: "El enlace es inválido o ya expiró" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
