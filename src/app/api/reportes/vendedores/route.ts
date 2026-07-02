import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!["ADMINISTRADOR", "GERENTE"].includes(session.user.rol)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;

  const anioActual = new Date().getFullYear();
  const mesActual  = new Date().getMonth() + 1;

  const [usuarios, oportunidades, actividades, metas] = await Promise.all([
    prisma.usuario.findMany({
      where: { tenantId, activo: true },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, creadoBy: { not: null } },
      select: { id: true, etapa: true, valor: true, probabilidad: true, creadoBy: true, creadoEn: true },
    }),
    prisma.actividad.findMany({
      where: { tenantId, creadoBy: { not: null } },
      select: { id: true, completada: true, fecha: true, creadoBy: true },
    }),
    prisma.metaVendedor.findMany({
      where: { tenantId, anio: anioActual, mes: mesActual },
      select: { userId: true, meta: true },
    }),
  ]);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const etapasActivas = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];

  const vendedores = usuarios.map(u => {
    const ops = oportunidades.filter(o => o.creadoBy === u.id);
    const acts = actividades.filter(a => a.creadoBy === u.id);

    const ganadas  = ops.filter(o => o.etapa === "GANADA");
    const perdidas = ops.filter(o => o.etapa === "PERDIDA");
    const activas  = ops.filter(o => etapasActivas.includes(o.etapa));

    const cerradas = ganadas.length + perdidas.length;
    const tasaCierre = cerradas > 0 ? Math.round((ganadas.length / cerradas) * 100) : 0;

    const valorGanado  = ganadas.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);
    const valorPipeline = activas.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);
    const valorPonderado = activas.reduce((acc, o) => acc + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0);

    // Ganadas este mes
    const ganadasMes = ganadas.filter(o => new Date(o.creadoEn) >= inicioMes);
    const valorMes   = ganadasMes.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

    // Actividades
    const actsPendientes  = acts.filter(a => !a.completada && new Date(a.fecha) >= hoy).length;
    const actsVencidas    = acts.filter(a => !a.completada && new Date(a.fecha) < hoy).length;
    const actsCompletadas = acts.filter(a => a.completada).length;

    const metaMes = Number(metas.find(m => m.userId === u.id)?.meta ?? 0);

    return {
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      totalOps: ops.length,
      activas: activas.length,
      ganadas: ganadas.length,
      perdidas: perdidas.length,
      tasaCierre,
      valorGanado,
      valorPipeline,
      valorPonderado,
      valorMes,
      ganadasMes: ganadasMes.length,
      actsPendientes,
      actsVencidas,
      actsCompletadas,
      metaMes,
    };
  });

  // Ordenar por valor ganado desc
  vendedores.sort((a, b) => b.valorGanado - a.valorGanado);

  return NextResponse.json(vendedores);
}
