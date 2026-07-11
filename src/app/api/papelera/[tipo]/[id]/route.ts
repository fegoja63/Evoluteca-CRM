import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Borrado definitivo desde la papelera — más restrictivo que el borrado
// suave (solo ADMINISTRADOR, no GERENTE), porque esta acción sí es
// irreversible.
export async function DELETE(_req: Request, { params }: { params: { tipo: string; id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo el administrador puede borrar definitivamente" }, { status: 403 });
  }
  const tiposValidos = ["empresa", "contacto", "oportunidad", "cotizacion"];
  if (!tiposValidos.includes(params.tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const where = { id: params.id, tenantId, eliminadoEn: { not: null } };

  if (params.tipo === "empresa") {
    const existente = await prisma.empresa.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.empresa.delete({ where: { id: params.id } });
  } else if (params.tipo === "contacto") {
    const existente = await prisma.contacto.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.contacto.delete({ where: { id: params.id } });
  } else if (params.tipo === "oportunidad") {
    const existente = await prisma.oportunidad.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.oportunidad.delete({ where: { id: params.id } });
  } else {
    const existente = await prisma.cotizacion.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.cotizacion.delete({ where: { id: params.id } });
  }

  return NextResponse.json({ ok: true });
}
