import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { parseOrError } from "@/lib/validations/helpers";

// Acciones en lote sobre varias cotizaciones a la vez. A propósito NO incluye
// "ACEPTADA": aceptar cierra el negocio como Ganado (efecto en cascada) y es
// una decisión que debe tomarse cotización por cotización desde el detalle,
// para no cerrar negocios en masa por accidente.
const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecciona al menos una cotización").max(500),
  accion: z.enum(["ENVIADA", "RECHAZADA", "eliminar"], { error: "Acción inválida" }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data, error } = parseOrError(bulkSchema, body);
  if (error) return error;
  const { ids, accion } = data;

  const where = { id: { in: ids }, tenantId: session.user.tenantId, eliminadoEn: null };

  if (accion === "eliminar") {
    if (!puedeEliminar(session.user.rol)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
    }
    // Borrado suave: van a la Papelera y se pueden restaurar.
    const { count } = await prisma.cotizacion.updateMany({ where, data: { eliminadoEn: new Date() } });
    return NextResponse.json({ ok: true, afectadas: count });
  }

  // Cambio de estado (ENVIADA o RECHAZADA) en una sola operación.
  const { count } = await prisma.cotizacion.updateMany({ where, data: { estado: accion } });
  return NextResponse.json({ ok: true, afectadas: count });
}
