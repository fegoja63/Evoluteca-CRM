/**
 * Cupo mensual de IA del tenant (palanca del plan, `Tenant.limiteResumenesIA`)
 * para las funciones de IA del Gerente Financiero. Mismo contador (`UsoIA`)
 * que las demás funciones de IA del CRM.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fechaISO } from "@/lib/fecha-bogota";

const periodoActual = () => fechaISO().slice(0, 7);

/** Respuesta de error si el tenant no tiene cupo, o null si puede seguir. */
export async function verificarCupoIA(tenantId: string): Promise<NextResponse | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { limiteResumenesIA: true } });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) return NextResponse.json({ error: "Las funciones de IA no están incluidas en su plan." }, { status: 403 });
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({ where: { tenantId_periodo: { tenantId, periodo: periodoActual() } }, select: { cantidad: true } });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json({ error: `Alcanzó el límite de ${limite} acciones de IA este mes. Escríbanos para ampliar su plan.` }, { status: 429 });
    }
  }
  return null;
}

/** Suma una acción de IA. Nunca tumba la respuesta si el conteo falla. */
export async function registrarUsoIA(tenantId: string, usage: { input_tokens: number; output_tokens: number }): Promise<void> {
  const periodo = periodoActual();
  try {
    await prisma.usoIA.upsert({
      where: { tenantId_periodo: { tenantId, periodo } },
      create: { tenantId, periodo, cantidad: 1, tokensEntrada: usage.input_tokens, tokensSalida: usage.output_tokens },
      update: { cantidad: { increment: 1 }, tokensEntrada: { increment: usage.input_tokens }, tokensSalida: { increment: usage.output_tokens } },
    });
  } catch { /* el conteo no debe tumbar la respuesta */ }
}
