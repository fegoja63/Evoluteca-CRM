import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operacionAuditoria } from "@/lib/auditoria";

// Borrado definitivo desde la papelera — más restrictivo que el borrado
// suave (solo ADMINISTRADOR, no GERENTE), porque esta acción sí es
// irreversible.
export async function DELETE(_req: Request, { params }: { params: { tipo: string; id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo el administrador puede borrar definitivamente" }, { status: 403 });
  }
  const tiposValidos = ["empresa", "contacto", "oportunidad", "cotizacion"];
  if (!tiposValidos.includes(params.tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const where = { id: params.id, tenantId, eliminadoEn: { not: null } };

  // Nombre del modelo y etiqueta legible por cada tipo, para la auditoría.
  const porTipo = {
    empresa: { modelo: prisma.empresa, entidad: "Empresa", etiqueta: "la empresa" },
    contacto: { modelo: prisma.contacto, entidad: "Contacto", etiqueta: "el contacto" },
    oportunidad: { modelo: prisma.oportunidad, entidad: "Oportunidad", etiqueta: "la oportunidad" },
    cotizacion: { modelo: prisma.cotizacion, entidad: "Cotizacion", etiqueta: "la cotización" },
  }[params.tipo as "empresa" | "contacto" | "oportunidad" | "cotizacion"];

  const existente = (await (porTipo.modelo as { findFirst: (a: unknown) => Promise<unknown> }).findFirst({
    where,
  })) as Record<string, unknown> | null;

  if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });

  // Esta es la única acción del sistema que destruye datos de verdad, así que
  // el registro guarda la fila ENTERA en `antes`: es lo único que quedará de
  // ella. Va en la misma transacción que el borrado.
  const nombre = (existente.nombre ?? existente.titulo ?? existente.numero ?? params.id) as string;

  await prisma.$transaction([
    (porTipo.modelo as { delete: (a: unknown) => unknown }).delete({ where: { id: params.id } }) as never,
    operacionAuditoria({
      tenantId,
      usuario: session.user,
      accion: "ELIMINAR_DEFINITIVO",
      entidad: porTipo.entidad,
      entidadId: params.id,
      descripcion: `Borró definitivamente ${porTipo.etiqueta} "${nombre}"`,
      antes: existente,
      peticion: _req,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
