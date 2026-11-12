import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { enviarCorreoSchema } from "@/lib/validations/correos";
import { enviarCorreoAlCliente } from "@/lib/enviar-correo";

export const dynamic = "force-dynamic";

// Lista los correos registrados de un contacto / empresa / oportunidad. El
// scope por tenant es obligatorio; los filtros afinan a la ficha desde la que
// se pide.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contactoId = searchParams.get("contactoId") || undefined;
  const empresaId = searchParams.get("empresaId") || undefined;
  const oportunidadId = searchParams.get("oportunidadId") || undefined;

  const correos = await prisma.correoRegistrado.findMany({
    where: { tenantId: session.user.tenantId, contactoId, empresaId, oportunidadId },
    orderBy: { fecha: "desc" },
    take: 100,
  });

  return NextResponse.json(correos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.user.email) return NextResponse.json({ error: "Tu usuario no tiene email para enviar" }, { status: 400 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(enviarCorreoSchema, body);
  if (error) return error;
  const { para, asunto, cuerpo, empresaId, contactoId, oportunidadId } = parsed;

  const tenantId = session.user.tenantId;

  // Las entidades vinculadas deben ser del mismo tenant (evita colgar un correo
  // de datos de otra organización pasando un id arbitrario). Se valida ANTES de
  // cualquier efecto (envío), tanto por seguridad como para que el aislamiento
  // sea comprobable aunque el envío no esté configurado.
  if (empresaId) {
    const e = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!e) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const c = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!c) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }
  if (oportunidadId) {
    const o = await prisma.oportunidad.findFirst({ where: { id: oportunidadId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!o) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 400 });
  }

  const r = await enviarCorreoAlCliente({
    tenantId,
    remitente: { id: session.user.id, nombre: session.user.name ?? null, email: session.user.email },
    para, asunto, cuerpo, empresaId, contactoId, oportunidadId,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.registro, { status: 201 });
}
