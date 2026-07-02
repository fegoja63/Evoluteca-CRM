import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { usuarioId, soloSinDueno } = await req.json();
  if (!usuarioId) return NextResponse.json({ error: "usuarioId requerido" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const where = soloSinDueno
    ? { tenantId, creadoBy: null }
    : { tenantId };

  const [empresas, oportunidades, actividades] = await Promise.all([
    prisma.empresa.updateMany({ where, data: { creadoBy: usuarioId } }),
    prisma.oportunidad.updateMany({ where, data: { creadoBy: usuarioId } }),
    prisma.actividad.updateMany({ where, data: { creadoBy: usuarioId } }),
  ]);

  return NextResponse.json({
    empresas: empresas.count,
    oportunidades: oportunidades.count,
    actividades: actividades.count,
  });
}
