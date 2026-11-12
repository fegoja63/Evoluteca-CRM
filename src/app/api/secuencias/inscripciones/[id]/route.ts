import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detenerInscripcion } from "@/lib/secuencias";

export const dynamic = "force-dynamic";

// Detiene la secuencia de un contacto. Puede hacerlo quien lo inscribió, un
// Gerente o un Administrador.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const ins = await prisma.inscripcionSecuencia.findFirst({ where: { id, tenantId }, select: { usuarioId: true } });
  if (!ins) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (session.user.rol === "COMERCIAL" && ins.usuarioId !== session.user.id) {
    return NextResponse.json({ error: "Solo quien la inició puede detenerla" }, { status: 403 });
  }
  await detenerInscripcion(id, tenantId);
  return NextResponse.json({ ok: true });
}
