import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner, moduloActivo } from "@/lib/permisos";
import { MODULO_POSTVENTA } from "@/lib/postventa";
import { dispararAutomatizaciones } from "@/lib/automatizaciones-motor";

// Crea la OPORTUNIDAD DE RENOVACIÓN de un negocio ganado: un negocio nuevo en
// el pipeline (Calificado, 60%), ligado al original, con cierre estimado en la
// fecha de renovación y una tarea para hoy "Preparar propuesta de renovación"
// (así nace con su próximo paso). El original pasa a la etapa Renovación del
// tablero de postventa. Si ya tiene una renovación viva, no se duplica (409).
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, MODULO_POSTVENTA)) {
    return NextResponse.json({ error: "El módulo Postventa no está activo" }, { status: 403 });
  }

  const original = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId, eliminadoEn: null, ...filtroOwner(session.user.rol, session.user.id) },
    select: {
      id: true, titulo: true, valor: true, etapa: true, postventaEtapa: true, fechaRenovacion: true,
      empresaId: true, contactoId: true, creadoBy: true,
      renovaciones: { where: { eliminadoEn: null }, select: { id: true }, take: 1 },
    },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (original.etapa !== "GANADA") {
    return NextResponse.json({ error: "Solo se puede renovar un negocio ganado" }, { status: 400 });
  }
  if (original.renovaciones.length > 0) {
    return NextResponse.json({ error: "Este negocio ya tiene una oportunidad de renovación", id: original.renovaciones[0].id }, { status: 409 });
  }

  // La renovación es del mismo vendedor del negocio original (si lo hay).
  const dueno = original.creadoBy ?? session.user.id;
  const titulo = `Renovación — ${original.titulo}`.slice(0, 300);

  const renovacion = await prisma.$transaction(async (tx) => {
    const nueva = await tx.oportunidad.create({
      data: {
        titulo,
        valor: original.valor,
        etapa: "CALIFICADO",
        probabilidad: 60,
        fechaCierre: original.fechaRenovacion,
        recurrente: true,
        origenRenovacionId: original.id,
        empresaId: original.empresaId,
        contactoId: original.contactoId,
        tenantId,
        creadoBy: dueno,
      },
    });
    await tx.actividad.create({
      data: {
        tipo: "TAREA",
        titulo: `Preparar propuesta de renovación: ${original.titulo}`.slice(0, 300),
        fecha: new Date(),
        tenantId,
        creadoBy: session.user.id,
        responsableId: dueno,
        oportunidadId: nueva.id,
        empresaId: original.empresaId,
        contactoId: original.contactoId,
      },
    });
    // El original avanza a Renovación en el tablero (si aún no pasó de ahí).
    if (original.postventaEtapa !== "RENOVACION" && original.postventaEtapa !== "CERRADO") {
      await tx.oportunidad.update({ where: { id: original.id }, data: { postventaEtapa: "RENOVACION" } });
    }
    return nueva;
  });

  await dispararAutomatizaciones({
    evento: "OPORTUNIDAD_CREADA",
    tenantId,
    oportunidad: {
      id: renovacion.id, titulo: renovacion.titulo, empresaId: renovacion.empresaId,
      contactoId: renovacion.contactoId, creadoBy: renovacion.creadoBy,
    },
    actorId: session.user.id,
  });

  return NextResponse.json(renovacion, { status: 201 });
}
