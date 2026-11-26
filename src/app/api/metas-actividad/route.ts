import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { metaActividadSchema } from "@/lib/validations/compromisos";
import { CLAVES } from "@/lib/actividad-semanal";

// Meta semanal estándar de actividad de un vendedor (contactos, negocios,
// llamadas, reuniones y propuestas). La fijan el administrador o el gerente;
// todo en cero la retira.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { tenantId, rol } = session.user;
  if (rol !== "ADMINISTRADOR" && rol !== "GERENTE") {
    return NextResponse.json({ error: "Solo el administrador o el gerente pueden fijar metas de actividad" }, { status: 403 });
  }

  const { data, error } = parseOrError(metaActividadSchema, await req.json().catch(() => null));
  if (error) return error;
  const usuario = await prisma.usuario.findFirst({ where: { id: data.userId, tenantId, activo: true }, select: { id: true } });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const valores = Object.fromEntries(CLAVES.map(k => [k, data[k]])) as Record<(typeof CLAVES)[number], number>;
  if (!CLAVES.some(k => valores[k] > 0)) {
    await prisma.metaActividad.deleteMany({ where: { tenantId, userId: data.userId } });
    return NextResponse.json({ ok: true, borrado: true });
  }
  const r = await prisma.metaActividad.upsert({
    where: { tenantId_userId: { tenantId, userId: data.userId } },
    create: { tenantId, userId: data.userId, ...valores },
    update: valores,
  });
  return NextResponse.json({ ok: true, id: r.id });
}
