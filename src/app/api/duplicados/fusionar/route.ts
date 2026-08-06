import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { operacionAuditoria } from "@/lib/auditoria";

// Fusiona varios registros duplicados en uno solo:
//  - re-apunta TODO lo colgado (oportunidades, actividades, cotizaciones,
//    correos, adjuntos, timeline...) del/los perdedor(es) al sobreviviente,
//  - rellena los campos vacíos del sobreviviente con datos de los perdedores,
//  - manda a la papelera (eliminadoEn) a los perdedores,
//  - deja registro de auditoría.
// Todo dentro de una transacción: o queda completo o no queda nada.

/** Primer valor con contenido, ya recortado; null si ninguno sirve. */
function primerNoVacio(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

/** Mezcla objetos `extras`: los perdedores rellenan huecos, el sobreviviente
 *  gana en caso de conflicto de la misma llave. */
function mezclarExtrasCrudos(sobreviviente: unknown, perdedores: unknown[]): Prisma.InputJsonValue | undefined {
  const esObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const acc: Record<string, unknown> = {};
  for (const p of perdedores) if (esObj(p)) Object.assign(acc, p);
  if (esObj(sobreviviente)) Object.assign(acc, sobreviviente); // el sobreviviente pisa
  return Object.keys(acc).length > 0 ? (acc as Prisma.InputJsonValue) : undefined;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const body = await request.json().catch(() => null);
  const tipo = body?.tipo;
  const sobrevivienteId = body?.sobrevivienteId;
  const perdedoresIds: string[] = Array.isArray(body?.perdedoresIds) ? body.perdedoresIds : [];

  if (tipo !== "contactos" && tipo !== "empresas") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  if (typeof sobrevivienteId !== "string" || perdedoresIds.length === 0) {
    return NextResponse.json({ error: "Faltan el sobreviviente o los duplicados a fusionar" }, { status: 400 });
  }
  if (perdedoresIds.includes(sobrevivienteId)) {
    return NextResponse.json({ error: "El registro a conservar no puede estar en la lista de duplicados" }, { status: 400 });
  }

  const todosIds = [sobrevivienteId, ...perdedoresIds];

  if (tipo === "contactos") {
    const registros = await prisma.contacto.findMany({
      where: { id: { in: todosIds }, tenantId, eliminadoEn: null },
    });
    if (registros.length !== todosIds.length) {
      return NextResponse.json({ error: "Alguno de los contactos no existe o ya fue eliminado" }, { status: 400 });
    }
    const sobreviviente = registros.find((r) => r.id === sobrevivienteId)!;
    const perdedores = registros.filter((r) => r.id !== sobrevivienteId);

    const datosFusion: Prisma.ContactoUncheckedUpdateInput = {
      email: primerNoVacio(sobreviviente.email, ...perdedores.map((p) => p.email)),
      telefono: primerNoVacio(sobreviviente.telefono, ...perdedores.map((p) => p.telefono)),
      cargo: primerNoVacio(sobreviviente.cargo, ...perdedores.map((p) => p.cargo)),
      notas: primerNoVacio(sobreviviente.notas, ...perdedores.map((p) => p.notas)),
      extras: mezclarExtrasCrudos(sobreviviente.extras, perdedores.map((p) => p.extras)),
      // Si el sobreviviente no tiene empresa pero un perdedor sí, la hereda.
      empresaId: sobreviviente.empresaId ?? perdedores.find((p) => p.empresaId)?.empresaId ?? null,
    };

    const where = { tenantId, contactoId: { in: perdedoresIds } };
    await prisma.$transaction([
      prisma.oportunidad.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.actividad.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.cotizacion.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.eventoTimeline.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.adjunto.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.correoRegistrado.updateMany({ where, data: { contactoId: sobrevivienteId } }),
      prisma.contacto.update({ where: { id: sobrevivienteId }, data: datosFusion }),
      prisma.contacto.updateMany({ where: { id: { in: perdedoresIds }, tenantId }, data: { eliminadoEn: new Date() } }),
      operacionAuditoria({
        tenantId, usuario: session.user, peticion: request, accion: "FUSIONAR", entidad: "Contacto", entidadId: sobrevivienteId,
        descripcion: `Fusionó ${perdedores.length} contacto(s) duplicado(s) en "${sobreviviente.nombre}"`,
        antes: perdedores.map((p) => ({ id: p.id, nombre: p.nombre, email: p.email })),
        despues: { id: sobreviviente.id, nombre: sobreviviente.nombre, ...datosFusion },
      }),
    ]);

    return NextResponse.json({ ok: true, sobrevivienteId, fusionados: perdedores.length });
  }

  // tipo === "empresas"
  const registros = await prisma.empresa.findMany({
    where: { id: { in: todosIds }, tenantId, eliminadoEn: null },
  });
  if (registros.length !== todosIds.length) {
    return NextResponse.json({ error: "Alguna de las empresas no existe o ya fue eliminada" }, { status: 400 });
  }
  const sobreviviente = registros.find((r) => r.id === sobrevivienteId)!;
  const perdedores = registros.filter((r) => r.id !== sobrevivienteId);

  // Unión de etiquetas sin repetidas, con las del sobreviviente primero.
  const etiquetas = Array.from(new Set([sobreviviente.etiquetas, ...perdedores.map((p) => p.etiquetas)].flat()));

  const datosFusion: Prisma.EmpresaUpdateInput = {
    email: primerNoVacio(sobreviviente.email, ...perdedores.map((p) => p.email)),
    sector: primerNoVacio(sobreviviente.sector, ...perdedores.map((p) => p.sector)),
    sitioWeb: primerNoVacio(sobreviviente.sitioWeb, ...perdedores.map((p) => p.sitioWeb)),
    telefono: primerNoVacio(sobreviviente.telefono, ...perdedores.map((p) => p.telefono)),
    notas: primerNoVacio(sobreviviente.notas, ...perdedores.map((p) => p.notas)),
    condicionesComerciales: primerNoVacio(sobreviviente.condicionesComerciales, ...perdedores.map((p) => p.condicionesComerciales)),
    etiquetas,
    extras: mezclarExtrasCrudos(sobreviviente.extras, perdedores.map((p) => p.extras)),
  };

  const where = { tenantId, empresaId: { in: perdedoresIds } };
  await prisma.$transaction([
    prisma.contacto.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.oportunidad.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.actividad.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.cotizacion.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.eventoTimeline.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.expediente.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.adjunto.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.correoRegistrado.updateMany({ where, data: { empresaId: sobrevivienteId } }),
    prisma.empresa.update({ where: { id: sobrevivienteId }, data: datosFusion }),
    prisma.empresa.updateMany({ where: { id: { in: perdedoresIds }, tenantId }, data: { eliminadoEn: new Date() } }),
    operacionAuditoria({
      tenantId, usuario: session.user, peticion: request, accion: "FUSIONAR", entidad: "Empresa", entidadId: sobrevivienteId,
      descripcion: `Fusionó ${perdedores.length} empresa(s) duplicada(s) en "${sobreviviente.nombre}"`,
      antes: perdedores.map((p) => ({ id: p.id, nombre: p.nombre, email: p.email })),
      despues: { id: sobreviviente.id, nombre: sobreviviente.nombre, ...datosFusion },
    }),
  ]);

  return NextResponse.json({ ok: true, sobrevivienteId, fusionados: perdedores.length });
}
