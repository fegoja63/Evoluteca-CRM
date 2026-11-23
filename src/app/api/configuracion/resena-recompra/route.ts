import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { configSchema, configDe } from "@/lib/resena-recompra";

// Configuración de reseña y recompra (ver lib/resena-recompra.ts). Solo administradores.

async function admin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (session.user.rol !== "ADMINISTRADOR") return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  return { tenantId: session.user.tenantId };
}

export async function GET() {
  const a = await admin();
  if (a.error) return a.error;
  const t = await prisma.tenant.findUnique({ where: { id: a.tenantId }, select: { resenaRecompraConfig: true } });
  return NextResponse.json(configDe(t?.resenaRecompraConfig));
}

export async function PUT(req: Request) {
  const a = await admin();
  if (a.error) return a.error;
  const { data, error } = parseOrError(configSchema, await req.json().catch(() => null));
  if (error) return error;
  await prisma.tenant.update({ where: { id: a.tenantId }, data: { resenaRecompraConfig: data } });
  return NextResponse.json(data);
}
