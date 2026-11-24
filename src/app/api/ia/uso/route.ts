import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fechaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

// Consumo de "Resúmenes con IA" del tenant en el mes actual, para mostrar
// "X / 100 este mes" en la ficha del cliente. limite null = ilimitado.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Mismo mes que usa el contador (registrarUsoIA): el de Bogotá, no el de UTC.
  const periodo = fechaISO().slice(0, 7);
  const [tenant, uso] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { limiteResumenesIA: true },
    }),
    prisma.usoIA.findUnique({
      where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } },
      select: { cantidad: true },
    }),
  ]);

  return NextResponse.json(
    {
      limite: tenant?.limiteResumenesIA ?? null, // null = ilimitado
      usados: uso?.cantidad ?? 0,
      periodo,
      iaConfigurada: !!process.env.ANTHROPIC_API_KEY,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
