import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { crearAutomatizacionSchema } from "@/lib/validations/automatizaciones";
import { validarConfigAccion, RESPONSABLE_DUENO } from "@/lib/automatizaciones";

// Comprueba que, si la acción CREAR_TAREA apunta a un usuario concreto como
// responsable, ese usuario exista y pertenezca al tenant. Devuelve un mensaje
// de error o null si todo está bien.
async function validarResponsable(
  accion: string,
  config: { responsable?: string } | Record<string, unknown>,
  tenantId: string
): Promise<string | null> {
  if (accion !== "CREAR_TAREA") return null;
  const responsable = String((config as { responsable?: string }).responsable ?? RESPONSABLE_DUENO);
  if (responsable === RESPONSABLE_DUENO) return null;
  const u = await prisma.usuario.findFirst({ where: { id: responsable, tenantId, activo: true }, select: { id: true } });
  return u ? null : "El responsable elegido no existe en tu organización.";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const automatizaciones = await prisma.automatizacion.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
  });

  return NextResponse.json(automatizaciones);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearAutomatizacionSchema, body);
  if (error) return error;

  // La configuración de la acción se valida y normaliza según su tipo.
  const v = validarConfigAccion(parsed.accion, parsed.config);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const errResp = await validarResponsable(parsed.accion, v.config, session.user.tenantId);
  if (errResp) return NextResponse.json({ error: errResp }, { status: 400 });

  // etapaDestino solo tiene sentido cuando el evento es un cambio de etapa.
  const etapaDestino =
    parsed.evento === "OPORTUNIDAD_CAMBIA_ETAPA" && parsed.etapaDestino ? parsed.etapaDestino : null;

  const tenantId = session.user.tenantId;
  const ordenMax = await prisma.automatizacion.aggregate({ where: { tenantId }, _max: { orden: true } });

  const automatizacion = await prisma.automatizacion.create({
    data: {
      tenantId,
      nombre: parsed.nombre.trim(),
      evento: parsed.evento,
      etapaDestino,
      accion: parsed.accion,
      config: v.config,
      activa: parsed.activa ?? true,
      orden: (ordenMax._max.orden ?? -1) + 1,
    },
  });

  return NextResponse.json(automatizacion, { status: 201 });
}

// Reordena: recibe { ids: [...] } en el nuevo orden y reescribe `orden`.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x: unknown) => typeof x === "string")) {
    return NextResponse.json({ error: "ids debe ser un array de identificadores" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const propias = await prisma.automatizacion.findMany({ where: { tenantId }, select: { id: true } });
  const idsPropios = new Set(propias.map(a => a.id));
  if (!ids.every((id: string) => idsPropios.has(id))) {
    return NextResponse.json({ error: "Alguna automatización no pertenece a tu cuenta" }, { status: 403 });
  }

  await prisma.$transaction(
    ids.map((id: string, i: number) => prisma.automatizacion.update({ where: { id }, data: { orden: i } }))
  );

  return NextResponse.json({ ok: true });
}
