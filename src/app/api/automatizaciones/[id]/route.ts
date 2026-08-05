import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { editarAutomatizacionSchema } from "@/lib/validations/automatizaciones";
import { validarConfigAccion, RESPONSABLE_DUENO } from "@/lib/automatizaciones";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const existente = await prisma.automatizacion.findFirst({ where: { id: params.id, tenantId } });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarAutomatizacionSchema, body);
  if (error) return error;

  const data: Record<string, unknown> = {};
  if (parsed.nombre !== undefined) data.nombre = parsed.nombre.trim();
  if (parsed.activa !== undefined) data.activa = parsed.activa;
  if (parsed.orden !== undefined) data.orden = parsed.orden;

  // etapaDestino solo aplica si el evento (fijo) es un cambio de etapa.
  if (parsed.etapaDestino !== undefined) {
    data.etapaDestino =
      existente.evento === "OPORTUNIDAD_CAMBIA_ETAPA" && parsed.etapaDestino ? parsed.etapaDestino : null;
  }

  // La acción no cambia; si viene config, se revalida contra la acción existente.
  if (parsed.config !== undefined) {
    const v = validarConfigAccion(existente.accion, parsed.config);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    if (existente.accion === "CREAR_TAREA") {
      const responsable = String((v.config as { responsable?: string }).responsable ?? RESPONSABLE_DUENO);
      if (responsable !== RESPONSABLE_DUENO) {
        const u = await prisma.usuario.findFirst({ where: { id: responsable, tenantId, activo: true }, select: { id: true } });
        if (!u) return NextResponse.json({ error: "El responsable elegido no existe en tu organización." }, { status: 400 });
      }
    }
    data.config = v.config;
  }

  const automatizacion = await prisma.automatizacion.update({ where: { id: params.id }, data });
  return NextResponse.json(automatizacion);
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const existente = await prisma.automatizacion.findFirst({ where: { id: params.id, tenantId } });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.automatizacion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
