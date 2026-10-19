import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generarIcsAgenda, esFiltroAgenda } from "@/lib/calendario-ics";
import { fechaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  // Permite exportar solo el bloque que el usuario está viendo en la Agenda
  // (pendientes, todas, vencidas o asignadas a mí). Sin parámetro válido se
  // mantiene el comportamiento de siempre: las pendientes.
  const param = new URL(request.url).searchParams.get("filtro");
  const filtro = esFiltroAgenda(param) ? param : "pendientes";

  const ics = await generarIcsAgenda({
    tenantId: session.user.tenantId,
    rol:      session.user.rol,
    userId:   session.user.id,
    nombre:   session.user.name ?? null,
    filtro,
  });

  const fecha = fechaISO(new Date());
  return new NextResponse(ics, {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda-evoluteca-${filtro}-${fecha}.ics"`,
    },
  });
}
