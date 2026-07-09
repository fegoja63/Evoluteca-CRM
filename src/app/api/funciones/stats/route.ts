import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// KPIs agregados en la base de datos, independientes de la paginación de
// GET /api/funciones. La ocupación promedio se calcula en memoria a partir
// de una selección liviana (solo 3 campos numéricos, sin relaciones) porque
// es un promedio de razones por fila que Prisma no puede agregar en SQL
// directamente.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const where = { tenantId: session.user.tenantId };

  const [filas, npsTotal] = await Promise.all([
    prisma.funcion.findMany({ where, select: { sillasTotales: true, sillasVendidas: true, ingresoEstimado: true } }),
    prisma.npsRespuesta.count({ where: { funcion: where } }),
  ]);

  const total = filas.length;
  const promOcupacion = total
    ? Math.round(filas.reduce((acc, f) => acc + (f.sillasTotales > 0 ? (f.sillasVendidas / f.sillasTotales) * 100 : 0), 0) / total)
    : 0;
  const totalIngreso = filas.reduce((acc, f) => acc + Number(f.ingresoEstimado ?? 0), 0);

  return NextResponse.json({ total, promOcupacion, totalIngreso, npsTotal });
}
