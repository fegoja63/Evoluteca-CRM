import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { validarUrlCalendario, ocupadosDeCalendarioExterno } from "@/lib/calendario-externo";
import { permitirYRegistrar } from "@/lib/rate-limit";

// Calendario externo del usuario (dirección secreta iCal; ver lib/calendario-externo.ts).
//   GET    -> si está conectado y de qué proveedor (nunca devuelve la dirección)
//   PUT    -> lo conecta: valida la dirección y la prueba leyendo los próximos 14 días
//   DELETE -> lo desconecta
export const dynamic = "force-dynamic";

function proveedor(url: string | null): string | null {
  if (!url) return null;
  const h = new URL(url).hostname;
  return h.includes("google") ? "Google Calendar" : h.includes("icloud") ? "iCloud" : "Outlook";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const u = await prisma.usuario.findFirst({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    select: { calendarioExterno: true },
  });
  return NextResponse.json({ conectado: !!u?.calendarioExterno, proveedor: proveedor(u?.calendarioExterno ?? null) });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const permitido = await permitirYRegistrar(`calext:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });

  const { data, error } = parseOrError(z.object({ url: z.string().max(2000) }), await request.json().catch(() => null));
  if (error) return error;
  const v = validarUrlCalendario(data.url);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const ahora = new Date();
  let eventos: number;
  try {
    eventos = (await ocupadosDeCalendarioExterno(v.url, ahora, new Date(ahora.getTime() + 14 * 86_400_000))).length;
  } catch {
    return NextResponse.json({ error: "No pudimos leer ese calendario. Revisa que copiaste la dirección secreta completa." }, { status: 400 });
  }
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { calendarioExterno: v.url },
  });
  return NextResponse.json({ conectado: true, proveedor: proveedor(v.url), eventos });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.usuario.update({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    data: { calendarioExterno: null },
  });
  return NextResponse.json({ conectado: false, proveedor: null });
}
