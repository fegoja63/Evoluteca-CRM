import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — orden de menú guardado del usuario actual (null si nunca lo personalizó)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { ordenMenu: true },
  });
  return NextResponse.json({ ordenMenu: (usuario?.ordenMenu as string[] | null) ?? null });
}

// PATCH — guarda el nuevo orden (array de hrefs) o lo restablece si se envía null
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ordenMenu } = await req.json();
  if (ordenMenu !== null && (!Array.isArray(ordenMenu) || !ordenMenu.every(h => typeof h === "string"))) {
    return NextResponse.json({ error: "ordenMenu debe ser un array de texto o null" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { ordenMenu: ordenMenu ?? Prisma.JsonNull },
  });
  return NextResponse.json({ ok: true });
}
