import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { direccionCco } from "@/lib/correo-cco";

// Dirección "CCO inteligente" del usuario en sesión (ver lib/correo-cco.ts).
//   GET    -> la dirección actual (o null si no la ha activado)
//   POST   -> genera una nueva (invalida la anterior)
//   DELETE -> la desactiva
export const dynamic = "force-dynamic";

function respuesta(token: string | null) {
  const base = process.env.INGEST_EMAIL_BASE;
  return NextResponse.json({
    disponible: !!base,
    direccion: token && base ? direccionCco(base, token) : null,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const usuario = await prisma.usuario.findFirst({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    select: { tokenCco: true },
  });
  return respuesta(usuario?.tokenCco ?? null);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.INGEST_EMAIL_BASE) return NextResponse.json({ error: "El registro de correos no está configurado" }, { status: 503 });
  // 16 bytes = 128 bits en hex (32 caracteres): la dirección completa cabe en
  // el límite de 64 caracteres de la parte local de un correo.
  const token = randomBytes(16).toString("hex");
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { tokenCco: token },
  });
  return respuesta(token);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { tokenCco: null },
  });
  return respuesta(null);
}
