import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { apiKeyLeads: true } });
  return NextResponse.json({ apiKeyLeads: tenant?.apiKeyLeads ?? null });
}

// Genera (o rota) la clave de captura de leads. Rotar invalida la clave
// anterior de inmediato — cualquier integración externa que la use deja de
// funcionar hasta que se actualice con la nueva.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const nuevaClave = `evt_${randomBytes(24).toString("hex")}`;
  await prisma.tenant.update({ where: { id: session.user.tenantId }, data: { apiKeyLeads: nuevaClave } });

  return NextResponse.json({ apiKeyLeads: nuevaClave });
}
