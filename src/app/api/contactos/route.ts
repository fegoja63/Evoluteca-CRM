import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const tenantId = session.user.tenantId;
  const page = searchParams.get("page");
  const take = Number(searchParams.get("take") ?? 30) || 30;

  const where = {
    tenantId,
    ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
  };

  // Sin "page" se mantiene el comportamiento anterior (lista completa) —
  // el dropdown de Contacto en otras pantallas depende del arreglo entero.
  if (!page) {
    const contactos = await prisma.contacto.findMany({
      where,
      include: { empresa: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json(contactos);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const [contactos, total] = await Promise.all([
    prisma.contacto.findMany({
      where,
      include: { empresa: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pageNum - 1) * take,
      take,
    }),
    prisma.contacto.count({ where }),
  ]);

  return NextResponse.json(contactos, { headers: { "X-Total-Count": String(total) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, email, telefono, cargo, notas, empresaId } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }

  const contacto = await prisma.contacto.create({
    data: {
      nombre,
      email: email || null,
      telefono: telefono || null,
      cargo: cargo || null,
      notas: notas || null,
      empresaId: empresaId || null,
      tenantId: session.user.tenantId,
    },
    include: { empresa: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(contacto, { status: 201 });
}
