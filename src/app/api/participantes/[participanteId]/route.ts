import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { editarParticipanteSchema } from "@/lib/decisores";

// Cambiar el papel o la postura de una persona del mapa de decisores, o
// quitarla del mapa (el contacto no se borra).

async function participanteVisible(id: string, tenantId: string, rol: string | undefined, userId: string) {
  return prisma.participanteOportunidad.findFirst({
    where: { id, tenantId, oportunidad: { tenantId, eliminadoEn: null, ...filtroOwner(rol, userId) } },
    select: { id: true },
  });
}

export async function PATCH(req: Request, props: { params: Promise<{ participanteId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;

  const parsed = editarParticipanteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  if (!(await participanteVisible(params.participanteId, tenantId, session.user.rol, session.user.id))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const participante = await prisma.participanteOportunidad.update({
    where: { id: params.participanteId, tenantId },
    data: parsed.data,
    select: { id: true, rol: true, postura: true },
  });
  return NextResponse.json(participante);
}

export async function DELETE(_req: Request, props: { params: Promise<{ participanteId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;

  if (!(await participanteVisible(params.participanteId, tenantId, session.user.rol, session.user.id))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  await prisma.participanteOportunidad.delete({ where: { id: params.participanteId, tenantId } });
  return NextResponse.json({ ok: true });
}
