import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const VERSION_TERMINOS = "1.0";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      aceptoTerminosEn: new Date(),
      versionTerminos: VERSION_TERMINOS,
    },
  });

  return NextResponse.json({ ok: true });
}
