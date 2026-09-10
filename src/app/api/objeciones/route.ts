import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { crearObjecionSchema } from "@/lib/validations/objeciones";
import { parseOrError } from "@/lib/validations/helpers";

// GET — lista de objeciones del tenant (todas las ven; solo Admin/Gerente editan)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const objeciones = await prisma.objecion.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
  });
  return NextResponse.json(objeciones);
}

// POST — crear una objeción (Admin/Gerente)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Solo Administrador o Gerente pueden editar la guía." }, { status: 403 });

  const body = await req.json();
  const { data, error } = parseOrError(crearObjecionSchema, body);
  if (error) return error;

  const max = await prisma.objecion.aggregate({ where: { tenantId: session.user.tenantId }, _max: { orden: true } });
  const objecion = await prisma.objecion.create({
    data: {
      tenantId: session.user.tenantId,
      categoria: data.categoria?.trim() || null,
      objecion: data.objecion.trim(),
      respuesta: data.respuesta.trim(),
      loQueNoDecir: data.loQueNoDecir?.trim() || null,
      orden: (max._max.orden ?? 0) + 1,
    },
  });
  return NextResponse.json(objecion, { status: 201 });
}
