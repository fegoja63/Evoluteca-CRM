import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner, moduloActivo } from "@/lib/permisos";
import { MODULO_POSTVENTA } from "@/lib/postventa";

export const dynamic = "force-dynamic";

// Tablero de Postventa: los negocios GANADOS que están en postventa (con etapa
// de postventa asignada). Un COMERCIAL ve solo los suyos, como en el Pipeline.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, MODULO_POSTVENTA)) {
    return NextResponse.json({ error: "El módulo Postventa no está activo" }, { status: 403 });
  }

  const negocios = await prisma.oportunidad.findMany({
    where: {
      tenantId, eliminadoEn: null, etapa: "GANADA", postventaEtapa: { not: null },
      ...filtroOwner(session.user.rol, session.user.id),
    },
    select: {
      id: true, titulo: true, valor: true, postventaEtapa: true, fechaRenovacion: true,
      fechaCierre: true, creadoBy: true,
      empresa: { select: { id: true, nombre: true } },
      _count: { select: { renovaciones: { where: { eliminadoEn: null } } } },
    },
    orderBy: [{ fechaRenovacion: { sort: "asc", nulls: "last" } }, { fechaCierre: "desc" }],
  });

  return NextResponse.json(negocios.map(({ _count, ...n }) => ({ ...n, tieneRenovacion: _count.renovaciones > 0 })));
}
