import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generarIcsAgenda } from "@/lib/calendario-ics";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  const ics = await generarIcsAgenda({
    tenantId: session.user.tenantId,
    rol:      session.user.rol,
    userId:   session.user.id,
    nombre:   session.user.name ?? null,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda-evoluteca-${new Date().toISOString().slice(0,10)}.ics"`,
    },
  });
}
