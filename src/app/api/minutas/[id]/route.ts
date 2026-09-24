import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

// DELETE — borra una minuta (quien la creó, o Administrador/Gerente). La
// reunión y las tareas que generó se conservan: son actividad real del equipo.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const minuta = await prisma.minuta.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true, creadoBy: true },
  });
  if (!minuta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (minuta.creadoBy !== session.user.id && !puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "Solo quien creó la minuta, un Gerente o un Administrador pueden eliminarla." }, { status: 403 });
  }

  await prisma.minuta.deleteMany({ where: { id: minuta.id, tenantId: session.user.tenantId } });
  return NextResponse.json({ ok: true });
}
