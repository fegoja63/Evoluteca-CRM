import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { crearEmpresaSchema } from "@/lib/validations/empresas";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = searchParams.get("page");
  const take = Number(searchParams.get("take") ?? 30) || 30;

  const where = {
    tenantId: session.user.tenantId,
    eliminadoEn: null,
    ...filtroOwner(session.user.rol, session.user.id),
    ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const contactosActivos = { contactos: { where: { eliminadoEn: null } } };

  // Sin "page" se mantiene el comportamiento anterior (lista completa) —
  // varias pantallas (dropdowns de Empresa, detección de duplicados) dependen
  // de recibir el arreglo entero sin paginar.
  if (!page) {
    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: { _count: { select: contactosActivos } },
    });
    return NextResponse.json(empresas);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const [empresas, total] = await Promise.all([
    prisma.empresa.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: { _count: { select: contactosActivos } },
      skip: (pageNum - 1) * take,
      take,
    }),
    prisma.empresa.count({ where }),
  ]);

  return NextResponse.json(empresas, { headers: { "X-Total-Count": String(total) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearEmpresaSchema, body);
  if (error) return error;
  const { nombre, email, sector, sitioWeb, telefono, notas, condicionesComerciales } = parsed;

  const empresa = await prisma.empresa.create({
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      sector: sector?.trim() || null,
      sitioWeb: sitioWeb?.trim() || null,
      telefono: telefono?.trim() || null,
      notas: notas?.trim() || null,
      condicionesComerciales: condicionesComerciales?.trim() || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(empresa, { status: 201 });
}
