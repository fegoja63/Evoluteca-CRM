import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operacionAuditoria } from "@/lib/auditoria";

// Reasigna UN cliente concreto (y todo lo que cuelga de él) a un vendedor.
// A diferencia de /api/usuarios/reasignar —que mueve en bloque TODOS los
// registros sin dueño del tenant— aquí se mueve solo la empresa indicada,
// arrastrando sus oportunidades, actividades y expedientes para que el nuevo
// vendedor las vea completas con su perfil COMERCIAL.
//
// Las cotizaciones no tienen dueño propio (no existe Cotizacion.creadoBy): su
// visibilidad va ligada a la empresa/oportunidad, así que "siguen" al nuevo
// vendedor automáticamente al mover esas dos — no hay nada que actualizar aquí.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { usuarioId } = await req.json();
  if (!usuarioId) return NextResponse.json({ error: "usuarioId requerido" }, { status: 400 });

  const tenantId = session.user.tenantId;

  const empresa = await prisma.empresa.findFirst({ where: { id: params.id, tenantId, eliminadoEn: null } });
  if (!empresa) return NextResponse.json({ error: "Cliente no encontrado en tu organización" }, { status: 404 });

  const destino = await prisma.usuario.findFirst({ where: { id: usuarioId, tenantId } });
  if (!destino) return NextResponse.json({ error: "Vendedor destino no encontrado en tu organización" }, { status: 400 });

  // Ids de las oportunidades y expedientes del cliente: se usan para arrastrar
  // las actividades ligadas a esas oportunidades (aunque no tengan empresaId) y
  // los términos de esos expedientes.
  const [oportunidades, expedientes] = await Promise.all([
    prisma.oportunidad.findMany({ where: { tenantId, empresaId: empresa.id }, select: { id: true } }),
    prisma.expediente.findMany({ where: { tenantId, empresaId: empresa.id }, select: { id: true } }),
  ]);
  const oppIds = oportunidades.map(o => o.id);
  const expIds = expedientes.map(e => e.id);

  const resultado = await prisma.$transaction(async (tx) => {
    const empresaUpd = await tx.empresa.update({ where: { id: empresa.id }, data: { creadoBy: usuarioId } });

    const oportunidadesUpd = await tx.oportunidad.updateMany({
      where: { tenantId, empresaId: empresa.id },
      data: { creadoBy: usuarioId },
    });

    const actividadesUpd = await tx.actividad.updateMany({
      where: { tenantId, OR: [{ empresaId: empresa.id }, ...(oppIds.length ? [{ oportunidadId: { in: oppIds } }] : [])] },
      data: { creadoBy: usuarioId },
    });

    const expedientesUpd = await tx.expediente.updateMany({
      where: { tenantId, empresaId: empresa.id },
      data: { creadoBy: usuarioId },
    });

    const terminosUpd = expIds.length
      ? await tx.terminoExpediente.updateMany({ where: { tenantId, expedienteId: { in: expIds } }, data: { creadoBy: usuarioId } })
      : { count: 0 };

    await operacionAuditoria({
      tenantId,
      usuario: session.user,
      accion: "ACTUALIZAR",
      entidad: "Empresa",
      entidadId: empresa.id,
      descripcion: `Reasignó el cliente "${empresa.nombre}" al vendedor ${destino.nombre}`,
      antes: { creadoBy: empresa.creadoBy },
      despues: { creadoBy: usuarioId },
      peticion: req,
    });

    return {
      empresas: 1,
      oportunidades: oportunidadesUpd.count,
      actividades: actividadesUpd.count,
      expedientes: expedientesUpd.count,
      terminos: terminosUpd.count,
      empresaUpd,
    };
  });

  return NextResponse.json({
    empresas: resultado.empresas,
    oportunidades: resultado.oportunidades,
    actividades: resultado.actividades,
    expedientes: resultado.expedientes,
    terminos: resultado.terminos,
  });
}
