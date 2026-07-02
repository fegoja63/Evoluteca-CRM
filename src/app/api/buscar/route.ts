import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const tenantId = session.user.tenantId;

  const [empresas, contactos, oportunidades] = await Promise.all([
    prisma.empresa.findMany({
      where: { tenantId, nombre: { contains: q, mode: "insensitive" } },
      select: { id: true, nombre: true, sector: true },
      take: 5,
    }),
    prisma.contacto.findMany({
      where: {
        tenantId,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { email:  { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, email: true, cargo: true },
      take: 5,
    }),
    prisma.oportunidad.findMany({
      where: {
        tenantId,
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, titulo: true, etapa: true, valor: true },
      take: 5,
    }),
  ]);

  const resultados = [
    ...empresas.map(e => ({ tipo: "cliente" as const, id: e.id, titulo: e.nombre, sub: e.sector ?? "Empresa", href: `/dashboard/cuentas/${e.id}` })),
    ...contactos.map(c => ({ tipo: "contacto" as const, id: c.id, titulo: c.nombre, sub: c.cargo ?? c.email ?? "Contacto", href: `/dashboard/contactos/${c.id}` })),
    ...oportunidades.map(o => ({ tipo: "oportunidad" as const, id: o.id, titulo: o.titulo, sub: o.etapa, href: `/dashboard/pipeline/${o.id}` })),
  ];

  return NextResponse.json(resultados);
}
