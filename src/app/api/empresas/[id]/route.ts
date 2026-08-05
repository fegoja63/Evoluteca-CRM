import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { operacionAuditoria } from "@/lib/auditoria";
import { editarEmpresaSchema } from "@/lib/validations/empresas";
import { parseOrError } from "@/lib/validations/helpers";
import { construirExtrasConCampos } from "@/lib/campos-servidor";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresa = await prisma.empresa.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      contactos: { where: { eliminadoEn: null } },
      oportunidades: { where: { eliminadoEn: null } },
      actividades: { orderBy: { fecha: "asc" } },
      cotizaciones: { where: { eliminadoEn: null }, include: { items: true } },
    },
  });

  if (!empresa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(empresa);
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.empresa.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarEmpresaSchema, body);
  if (error) return error;
  const { nombre, email, sector, sitioWeb, telefono, notas, condicionesComerciales, etiquetas } = parsed;

  // Campos personalizados: si el formulario los envía, se validan contra las
  // definiciones del tenant y se mezclan con los extras ya guardados (que
  // incluyen datos importados de Excel, que no se deben pisar).
  let extrasParaGuardar: Prisma.InputJsonObject | undefined;
  if (body.extras !== undefined && typeof body.extras === "object" && body.extras !== null) {
    const r = await construirExtrasConCampos({
      tenantId: session.user.tenantId,
      entidad: "EMPRESA",
      entrantes: body.extras as Record<string, unknown>,
      extrasActuales: existente.extras,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    extrasParaGuardar = r.extras;
  }

  if (etiquetas !== undefined && !nombre) {
    const empresa = await prisma.empresa.update({
      where: { id: params.id },
      data: { etiquetas, ...(extrasParaGuardar !== undefined ? { extras: extrasParaGuardar } : {}) },
    });
    return NextResponse.json(empresa);
  }

  // Actualización solo de campos personalizados (sin tocar los datos base).
  if (extrasParaGuardar !== undefined && nombre === undefined && etiquetas === undefined) {
    const empresa = await prisma.empresa.update({
      where: { id: params.id },
      data: { extras: extrasParaGuardar },
    });
    return NextResponse.json(empresa);
  }

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: params.id },
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      sector: sector?.trim() || null,
      sitioWeb: sitioWeb?.trim() || null,
      telefono: telefono?.trim() || null,
      notas: notas?.trim() || null,
      condicionesComerciales: condicionesComerciales?.trim() || null,
      ...(etiquetas !== undefined ? { etiquetas } : {}),
      ...(extrasParaGuardar !== undefined ? { extras: extrasParaGuardar } : {}),
    },
  });

  return NextResponse.json(empresa);
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const existente = await prisma.empresa.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Borrado suave: el registro se guarda en la papelera (/dashboard/papelera)
  // y se puede restaurar. El borrado definitivo solo se hace desde ahí.
  await prisma.$transaction([
    prisma.empresa.update({ where: { id: params.id }, data: { eliminadoEn: new Date() } }),
    operacionAuditoria({
      tenantId: session.user.tenantId,
      usuario: session.user,
      accion: "ELIMINAR",
      entidad: "Empresa",
      entidadId: existente.id,
      descripcion: `Envió a la papelera la empresa "${existente.nombre}"`,
      antes: existente,
      peticion: request,
    }),
  ]);
  return NextResponse.json({ ok: true });
}
