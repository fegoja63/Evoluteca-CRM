import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearMetaVendedorSchema } from "@/lib/validations/metas";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rol, tenantId } = session.user;
  if (rol !== "ADMINISTRADOR" && rol !== "GERENTE") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const anio = parseInt(searchParams.get("anio") ?? String(new Date().getFullYear()));
  const mes  = parseInt(searchParams.get("mes")  ?? String(new Date().getMonth() + 1));

  const metas = await prisma.metaVendedor.findMany({
    where: { tenantId, anio, mes },
    select: { userId: true, meta: true },
  });

  return NextResponse.json(metas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rol, tenantId } = session.user;
  if (rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo el administrador puede definir la meta de un vendedor" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = parseOrError(crearMetaVendedorSchema, body);
  if (error) return error;
  const { userId, anio, mes, meta } = data;

  const result = await prisma.metaVendedor.upsert({
    where: { tenantId_userId_anio_mes: { tenantId, userId, anio, mes } },
    update: { meta },
    create: { tenantId, userId, anio, mes, meta },
  });

  return NextResponse.json(result);
}
