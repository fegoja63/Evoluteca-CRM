import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Consulta del registro de auditoría.
 *
 * Solo lectura, y a propósito: no existe ninguna ruta para editar ni borrar
 * estas filas. Un registro que el propio administrador puede maquillar no
 * sirve como evidencia — que es justamente para lo que existe.
 *
 * Filtros opcionales: ?entidad=Usuario &entidadId=... &usuarioId=... &accion=...
 * Paginación: ?page=1&take=50
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo el administrador. Un comercial no debe poder reconstruir la actividad
  // de sus compañeros, y un gerente tampoco: esto es control, no reportería.
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json(
      { error: "Solo un administrador puede consultar la auditoría" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const entidad = searchParams.get("entidad")?.trim() || undefined;
  const entidadId = searchParams.get("entidadId")?.trim() || undefined;
  const usuarioId = searchParams.get("usuarioId")?.trim() || undefined;
  const accion = searchParams.get("accion")?.trim() || undefined;

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const take = Math.min(200, Math.max(1, Number(searchParams.get("take") ?? 50) || 50));

  const where = {
    tenantId: session.user.tenantId,
    ...(entidad ? { entidad } : {}),
    ...(entidadId ? { entidadId } : {}),
    ...(usuarioId ? { usuarioId } : {}),
    ...(accion ? { accion } : {}),
  };

  const [registros, total] = await Promise.all([
    prisma.registroAuditoria.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.registroAuditoria.count({ where }),
  ]);

  return NextResponse.json(registros, { headers: { "X-Total-Count": String(total) } });
}
