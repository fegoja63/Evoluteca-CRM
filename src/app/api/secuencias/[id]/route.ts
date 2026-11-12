import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { secuenciaSchema } from "@/lib/secuencias";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const s = await prisma.secuencia.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!s) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(s);
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol === "COMERCIAL") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const { data, error } = parseOrError(secuenciaSchema, await request.json().catch(() => null));
  if (error) return error;
  const r = await prisma.secuencia.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      pasos: data.pasos,
      ...(data.activa !== undefined ? { activa: data.activa } : {}),
    },
  });
  if (r.count === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Borrar una secuencia detiene a los contactos que siguen en ella (sus correos
// ya enviados quedan en las fichas).
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol === "COMERCIAL") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const r = await prisma.secuencia.deleteMany({ where: { id, tenantId: session.user.tenantId } });
  if (r.count === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
