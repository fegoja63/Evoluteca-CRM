import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner, moduloActivo } from "@/lib/permisos";
import { crearExpedienteSchema } from "@/lib/validations/expedientes";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const expedientes = await prisma.expediente.findMany({
    where: { tenantId: session.user.tenantId, ...filtroOwner(session.user.rol, session.user.id) },
    orderBy: { creadoEn: "desc" },
    include: {
      empresa: { select: { id: true, nombre: true } },
      _count: { select: { terminos: true } },
    },
  });

  return NextResponse.json(expedientes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearExpedienteSchema, body);
  if (error) return error;
  const { numeroRadicado, juzgado, tipoProceso, contraparte, estado, notas, empresaId } = parsed;

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }

  const duplicado = await prisma.expediente.findFirst({
    where: { tenantId: session.user.tenantId, numeroRadicado: numeroRadicado.trim() },
  });
  if (duplicado) {
    return NextResponse.json({ error: "Ya existe un expediente con ese número de radicado" }, { status: 400 });
  }

  const expediente = await prisma.expediente.create({
    data: {
      numeroRadicado: numeroRadicado.trim(),
      juzgado: juzgado?.trim() || null,
      tipoProceso: tipoProceso?.trim() || null,
      contraparte: contraparte.trim(),
      estado: estado || "ACTIVO",
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(expediente, { status: 201 });
}
