import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Los 6 valores que puede tener Oportunidad.etapa (enum EtapaOportunidad) no
// cambian nunca — lo único configurable por tenant es el nombre visible y el
// orden. Si el tenant no tiene fila (primera vez), se sembra con estos
// valores por defecto.
const DEFAULTS: { key: string; nombre: string; orden: number }[] = [
  { key: "PROSPECTO",   nombre: "Prospecto",   orden: 1 },
  { key: "CALIFICADO",  nombre: "Calificado",  orden: 2 },
  { key: "PROPUESTA",   nombre: "Cotización",  orden: 3 },
  { key: "NEGOCIACION", nombre: "Negociación", orden: 4 },
  { key: "GANADA",      nombre: "Ganada",      orden: 5 },
  { key: "PERDIDA",     nombre: "Perdida",     orden: 6 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  let etapas = await prisma.etapaPipeline.findMany({ where: { tenantId }, orderBy: { orden: "asc" } });

  if (etapas.length === 0) {
    await prisma.etapaPipeline.createMany({
      data: DEFAULTS.map(d => ({ ...d, tenantId })),
      skipDuplicates: true,
    });
    etapas = await prisma.etapaPipeline.findMany({ where: { tenantId }, orderBy: { orden: "asc" } });
  }

  return NextResponse.json(etapas);
}

// Recibe la lista completa reordenada/renombrada y la reemplaza — más simple
// que un PATCH parcial ya que el frontend siempre maneja el arreglo completo
// (igual patrón que el drag-and-drop del orden del menú lateral).
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const etapas = body?.etapas;
  if (!Array.isArray(etapas) || etapas.length === 0) {
    return NextResponse.json({ error: "etapas debe ser un array" }, { status: 400 });
  }
  for (const e of etapas) {
    if (typeof e.id !== "string" || typeof e.nombre !== "string" || !e.nombre.trim() || typeof e.orden !== "number") {
      return NextResponse.json({ error: "Cada etapa necesita id, nombre y orden" }, { status: 400 });
    }
  }

  const tenantId = session.user.tenantId;
  const propias = await prisma.etapaPipeline.findMany({ where: { tenantId }, select: { id: true } });
  const idsPropios = new Set(propias.map(e => e.id));
  if (!etapas.every(e => idsPropios.has(e.id))) {
    return NextResponse.json({ error: "Alguna etapa no pertenece a tu cuenta" }, { status: 403 });
  }

  await prisma.$transaction(
    etapas.map(e => prisma.etapaPipeline.update({ where: { id: e.id }, data: { nombre: e.nombre.trim(), orden: e.orden } }))
  );

  const actualizadas = await prisma.etapaPipeline.findMany({ where: { tenantId }, orderBy: { orden: "asc" } });
  return NextResponse.json(actualizadas);
}
