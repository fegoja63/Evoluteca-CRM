import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { editarCampoSchema } from "@/lib/validations/campos-personalizados";

// Edita una definición: etiqueta, opciones, obligatorio, activo, orden. NO se
// permite cambiar el tipo, la clave ni la entidad — cambiarlos invalidaría los
// valores ya guardados en los `extras` de cada registro.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const existente = await prisma.campoPersonalizado.findFirst({ where: { id: params.id, tenantId } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarCampoSchema, body);
  if (error) return error;

  const data: Record<string, unknown> = {};
  if (parsed.etiqueta !== undefined) data.etiqueta = parsed.etiqueta.trim();
  if (parsed.obligatorio !== undefined) data.obligatorio = parsed.obligatorio;
  if (parsed.activo !== undefined) data.activo = parsed.activo;
  if (parsed.orden !== undefined) data.orden = parsed.orden;
  if (parsed.opciones !== undefined) {
    const opciones = parsed.opciones.map(o => o.trim()).filter(Boolean);
    if (existente.tipo === "LISTA" && opciones.length < 2) {
      return NextResponse.json({ error: "Un campo de tipo Lista necesita al menos 2 opciones" }, { status: 400 });
    }
    data.opciones = existente.tipo === "LISTA" ? opciones : [];
  }

  const campo = await prisma.campoPersonalizado.update({ where: { id: params.id }, data });
  return NextResponse.json(campo);
}

// Borra la definición. Los valores que ya estén guardados en los `extras` de
// cada registro quedan huérfanos pero inertes: al no haber definición, ninguna
// vista los muestra ni el guardado los vuelve a escribir.
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const existente = await prisma.campoPersonalizado.findFirst({ where: { id: params.id, tenantId } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.campoPersonalizado.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
