import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { crearCampoSchema } from "@/lib/validations/campos-personalizados";
import { slugCampo, ENTIDADES_CAMPO, type EntidadCampo } from "@/lib/campos-personalizados";

// Lista las definiciones de campos personalizados del tenant. Cualquier usuario
// autenticado puede leerlas (los formularios de Cliente/Oportunidad las
// necesitan para pintar los campos). Con ?entidad=EMPRESA se filtra.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entidadParam = searchParams.get("entidad");
  const entidad = ENTIDADES_CAMPO.includes(entidadParam as EntidadCampo)
    ? (entidadParam as EntidadCampo)
    : undefined;

  const campos = await prisma.campoPersonalizado.findMany({
    where: { tenantId: session.user.tenantId, ...(entidad ? { entidad } : {}) },
    orderBy: [{ entidad: "asc" }, { orden: "asc" }, { creadoEn: "asc" }],
  });

  return NextResponse.json(campos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearCampoSchema, body);
  if (error) return error;

  const opciones = (parsed.opciones ?? []).map(o => o.trim()).filter(Boolean);
  if (parsed.tipo === "LISTA" && opciones.length < 2) {
    return NextResponse.json({ error: "Un campo de tipo Lista necesita al menos 2 opciones" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const existentes = await prisma.campoPersonalizado.findMany({
    where: { tenantId, entidad: parsed.entidad },
    select: { clave: true, orden: true },
  });

  // Clave única por (tenant, entidad): si el slug ya existe, se sufija.
  const usadas = new Set(existentes.map(e => e.clave));
  let clave = slugCampo(parsed.etiqueta);
  if (usadas.has(clave)) {
    let i = 2;
    while (usadas.has(`${clave}_${i}`)) i++;
    clave = `${clave}_${i}`;
  }

  const ordenMax = existentes.reduce((m, e) => Math.max(m, e.orden), -1);

  const campo = await prisma.campoPersonalizado.create({
    data: {
      tenantId,
      entidad: parsed.entidad,
      clave,
      etiqueta: parsed.etiqueta.trim(),
      tipo: parsed.tipo,
      opciones: parsed.tipo === "LISTA" ? opciones : [],
      obligatorio: parsed.obligatorio ?? false,
      orden: ordenMax + 1,
    },
  });

  return NextResponse.json(campo, { status: 201 });
}

// Reordena los campos de una entidad: recibe { ids: [...] } en el nuevo orden y
// reescribe `orden` = posición. Mismo patrón que las etapas del pipeline.
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
  const propios = await prisma.campoPersonalizado.findMany({ where: { tenantId }, select: { id: true } });
  const idsPropios = new Set(propios.map(c => c.id));
  if (!ids.every((id: string) => idsPropios.has(id))) {
    return NextResponse.json({ error: "Algún campo no pertenece a tu cuenta" }, { status: 403 });
  }

  await prisma.$transaction(
    ids.map((id: string, i: number) => prisma.campoPersonalizado.update({ where: { id }, data: { orden: i } }))
  );

  return NextResponse.json({ ok: true });
}
