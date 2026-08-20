import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { baseUrlDesdePeticion } from "@/lib/base-url";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    select: { id: true, tokenPublico: true },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const token = cot.tokenPublico ?? randomBytes(24).toString("hex");
  if (!cot.tokenPublico) {
    await prisma.cotizacion.update({ where: { id: params.id }, data: { tokenPublico: token } });
  }

  const url = `${baseUrlDesdePeticion(req)}/cotizacion/${token}`;
  return NextResponse.json({ token, url });
}
