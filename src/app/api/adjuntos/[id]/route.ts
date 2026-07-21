import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adjunto = await prisma.adjunto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!adjunto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(adjunto);
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.adjunto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.adjunto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
