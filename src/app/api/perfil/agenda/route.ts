import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agendaConfigSchema, configDe } from "@/lib/agendar";
import { parseOrError } from "@/lib/validations/helpers";

// Enlace para agendar del usuario en sesión (ver lib/agendar.ts).
//   GET    -> enlace actual (o null) y horario
//   POST   -> activa / genera un enlace nuevo (el anterior deja de funcionar)
//   PUT    -> guarda el horario
//   DELETE -> apaga el enlace
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";

async function estado(usuarioId: string, tenantId: string) {
  const u = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId },
    select: { tokenAgenda: true, agendaConfig: true },
  });
  return NextResponse.json({
    enlace: u?.tokenAgenda ? `${BASE_URL}/agendar/${u.tokenAgenda}` : null,
    config: configDe(u?.agendaConfig),
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return estado(session.user.id, session.user.tenantId);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { tokenAgenda: randomBytes(16).toString("hex") },
  });
  return estado(session.user.id, session.user.tenantId);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = parseOrError(agendaConfigSchema, await request.json().catch(() => null));
  if (error) return error;
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { agendaConfig: data },
  });
  return estado(session.user.id, session.user.tenantId);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { tokenAgenda: null },
  });
  return estado(session.user.id, session.user.tenantId);
}
