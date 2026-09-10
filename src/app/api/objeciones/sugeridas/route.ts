import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { OBJECIONES_SUGERIDAS } from "@/lib/objeciones-default";

// POST — precarga las 15 objeciones sugeridas. Idempotente por contenido: no
// vuelve a insertar una objeción cuyo texto ya exista en el tenant, así que se
// puede pulsar sin miedo a duplicar.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Solo Administrador o Gerente pueden editar la guía." }, { status: 403 });

  const tenantId = session.user.tenantId;
  const existentes = await prisma.objecion.findMany({ where: { tenantId }, select: { objecion: true } });
  const yaHay = new Set(existentes.map(o => o.objecion.trim().toLowerCase()));

  const max = await prisma.objecion.aggregate({ where: { tenantId }, _max: { orden: true } });
  let orden = (max._max.orden ?? 0) + 1;

  const nuevas = OBJECIONES_SUGERIDAS
    .filter(s => !yaHay.has(s.objecion.trim().toLowerCase()))
    .map(s => ({ tenantId, categoria: s.categoria, objecion: s.objecion, respuesta: s.respuesta, loQueNoDecir: s.loQueNoDecir, orden: orden++ }));

  if (nuevas.length > 0) await prisma.objecion.createMany({ data: nuevas });
  return NextResponse.json({ agregadas: nuevas.length, omitidas: OBJECIONES_SUGERIDAS.length - nuevas.length });
}
