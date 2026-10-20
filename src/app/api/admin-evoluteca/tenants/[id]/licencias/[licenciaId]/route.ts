import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";

// Revocar una licencia de módulo desde el panel interno. No se borra la fila:
// se marca revocadaEn, para conservar el historial de pagos y habilitaciones.
export async function DELETE(req: Request, props: { params: Promise<{ id: string; licenciaId: string }> }) {
  const params = await props.params;
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const { count } = await prisma.licenciaModulo.updateMany({
    where: { id: params.licenciaId, tenantId: params.id, revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "No encontrada o ya revocada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
