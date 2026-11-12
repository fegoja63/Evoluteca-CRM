import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { secuenciaSchema } from "@/lib/secuencias";

// Secuencias de seguimiento (ver lib/secuencias.ts). Todos las ven y las usan;
// solo Administrador y Gerente las crean o cambian.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const [secuencias, activas] = await Promise.all([
    prisma.secuencia.findMany({ where: { tenantId }, orderBy: { creadoEn: "asc" } }),
    prisma.inscripcionSecuencia.groupBy({ by: ["secuenciaId"], where: { tenantId, estado: "ACTIVA" }, _count: { _all: true } }),
  ]);
  const n = new Map(activas.map(a => [a.secuenciaId, a._count._all]));
  return NextResponse.json(secuencias.map(s => ({ ...s, activas: n.get(s.id) ?? 0 })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol === "COMERCIAL") return NextResponse.json({ error: "Solo Administrador o Gerente crean secuencias" }, { status: 403 });
  const { data, error } = parseOrError(secuenciaSchema, await request.json().catch(() => null));
  if (error) return error;
  const s = await prisma.secuencia.create({
    data: {
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      pasos: data.pasos,
      activa: data.activa ?? true,
    },
  });
  return NextResponse.json(s, { status: 201 });
}
