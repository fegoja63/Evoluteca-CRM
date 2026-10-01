import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operacionAuditoria } from "@/lib/auditoria";

// Normaliza para comparar el nombre escrito con el de la empresa: sin espacios
// sobrantes ni diferencias de mayúsculas.
const normalizar = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Borra DEFINITIVAMENTE todos los datos comerciales del tenant (no pasan por
 * la papelera). Por eso exige escribir el nombre exacto de la empresa —dos
 * "Aceptar" seguidos se dan sin leer— y deja constancia en la auditoría de
 * quién lo hizo, cuándo y cuánto se borró.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true } });
  if (!tenant) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null) as { confirmacion?: unknown } | null;
  const confirmacion = typeof body?.confirmacion === "string" ? body.confirmacion : "";
  if (normalizar(confirmacion) !== normalizar(tenant.nombre)) {
    return NextResponse.json(
      { error: `Para confirmar, escribe el nombre exacto de la empresa: "${tenant.nombre}".` },
      { status: 400 },
    );
  }

  // Lo que se va a borrar, para que el registro de auditoría diga cuánto se perdió.
  const [empresas, contactos, oportunidades, actividades, cotizaciones] = await Promise.all([
    prisma.empresa.count({ where: { tenantId } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.count({ where: { tenantId } }),
    prisma.actividad.count({ where: { tenantId } }),
    prisma.cotizacion.count({ where: { tenantId } }),
  ]);

  await prisma.$transaction([
    prisma.npsRespuesta.deleteMany({ where: { funcion: { tenantId } } }),
    prisma.itemCotizacion.deleteMany({ where: { cotizacion: { tenantId } } }),
    prisma.cotizacion.deleteMany({ where: { tenantId } }),
    // EventoTimeline con empresaId ya se borra en cascada al borrar la empresa,
    // pero uno vinculado solo a un contacto (o a ninguno) no — se borra aparte
    // para no dejar registros huérfanos del tenant tras "limpiar datos".
    prisma.eventoTimeline.deleteMany({ where: { tenantId } }),
    prisma.actividad.deleteMany({ where: { tenantId } }),
    prisma.oportunidad.deleteMany({ where: { tenantId } }),
    // Expediente en cascada borra sus términos, bitácora y registros de horas.
    prisma.expediente.deleteMany({ where: { tenantId } }),
    prisma.espectador.deleteMany({ where: { tenantId } }),
    prisma.funcion.deleteMany({ where: { tenantId } }),
    prisma.contacto.deleteMany({ where: { tenantId } }),
    prisma.empresa.deleteMany({ where: { tenantId } }),
    // En la misma transacción: o queda el borrado con su constancia, o nada.
    operacionAuditoria({
      tenantId,
      usuario: session.user,
      accion: "ELIMINAR_DEFINITIVO",
      entidad: "Tenant",
      entidadId: tenantId,
      descripcion: `Borró todos los datos del CRM: ${empresas} empresas, ${contactos} contactos, ${oportunidades} oportunidades, ${actividades} actividades y ${cotizaciones} cotizaciones`,
      antes: { empresas, contactos, oportunidades, actividades, cotizaciones },
      peticion: req,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
