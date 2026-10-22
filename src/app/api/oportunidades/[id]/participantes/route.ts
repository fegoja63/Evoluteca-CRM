import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { crearParticipanteSchema, sugerirRol } from "@/lib/decisores";

// Mapa de decisores de una oportunidad: lista y alta de las personas que
// participan en la decisión de compra. Un COMERCIAL solo ve y edita el mapa de
// sus propias oportunidades.

const SELECT = {
  id: true, rol: true, postura: true,
  contacto: { select: { id: true, nombre: true, cargo: true, email: true, telefono: true } },
} as const;

async function oportunidadVisible(id: string, tenantId: string, rol: string | undefined, userId: string) {
  return prisma.oportunidad.findFirst({
    where: { id, tenantId, eliminadoEn: null, ...filtroOwner(rol, userId) },
    select: { id: true },
  });
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;

  if (!(await oportunidadVisible(params.id, tenantId, session.user.rol, session.user.id))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const participantes = await prisma.participanteOportunidad.findMany({
    where: { tenantId, oportunidadId: params.id, contacto: { eliminadoEn: null } },
    orderBy: { creadoEn: "asc" },
    select: SELECT,
  });
  return NextResponse.json(participantes);
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;

  const parsed = crearParticipanteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  if (!(await oportunidadVisible(params.id, tenantId, session.user.rol, session.user.id))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const contacto = await prisma.contacto.findFirst({
    where: { id: parsed.data.contactoId, tenantId, eliminadoEn: null },
    select: { id: true, cargo: true },
  });
  if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  try {
    const participante = await prisma.participanteOportunidad.create({
      data: {
        tenantId,
        oportunidadId: params.id,
        contactoId: contacto.id,
        rol: parsed.data.rol ?? sugerirRol(contacto.cargo),
        postura: parsed.data.postura ?? "SIN_CONTACTAR",
      },
      select: SELECT,
    });
    return NextResponse.json(participante, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Esa persona ya está en el mapa" }, { status: 409 });
    }
    throw e;
  }
}
