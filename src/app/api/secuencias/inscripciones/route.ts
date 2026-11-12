import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { inscribir } from "@/lib/secuencias";

export const dynamic = "force-dynamic";

const inscribirSchema = z.object({
  secuenciaId: z.string().min(1),
  contactoId: z.string().min(1),
  oportunidadId: z.string().min(1).optional().nullable(),
});

// Lista inscripciones: las de un contacto u oportunidad (para la ficha) o, sin
// filtro, las activas (el Comercial ve solo las suyas).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const contactoId = searchParams.get("contactoId") || undefined;
  const oportunidadId = searchParams.get("oportunidadId") || undefined;
  const deFicha = !!(contactoId || oportunidadId);
  const lista = await prisma.inscripcionSecuencia.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(deFicha ? { contactoId, oportunidadId } : { estado: "ACTIVA" as const }),
      ...(!deFicha && session.user.rol === "COMERCIAL" ? { usuarioId: session.user.id } : {}),
    },
    orderBy: { creadoEn: "desc" },
    take: 200,
    include: {
      secuencia: { select: { nombre: true, pasos: true } },
      contacto: { select: { id: true, nombre: true, email: true } },
      oportunidad: { select: { id: true, titulo: true } },
      usuario: { select: { nombre: true } },
    },
  });
  return NextResponse.json(lista);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = parseOrError(inscribirSchema, await request.json().catch(() => null));
  if (error) return error;
  const r = await inscribir({
    tenantId: session.user.tenantId,
    usuarioId: session.user.id,
    secuenciaId: data.secuenciaId,
    contactoId: data.contactoId,
    oportunidadId: data.oportunidadId ?? null,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r, { status: 201 });
}
