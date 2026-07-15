import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const errores = await prisma.errorLog.findMany({
    orderBy: { creadoEn: "desc" },
    take: 200,
  });

  // Total de últimas 24h para un resumen rápido en el panel.
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const total24h = await prisma.errorLog.count({ where: { creadoEn: { gte: hace24h } } });

  return NextResponse.json({ errores, total24h });
}

// Borrado en lote del histórico (limpieza) — protegido por la clave admin.
export async function DELETE(req: Request) {
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const { count } = await prisma.errorLog.deleteMany({});
  return NextResponse.json({ ok: true, eliminados: count });
}
