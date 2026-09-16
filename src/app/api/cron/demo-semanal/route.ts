import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { refrescarDemoSemanal } from "@/lib/demo-semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Refresca la actividad de relleno de la cuenta demo, una vez por semana, para
// que el CRM se vea "vivo" a quien entra a probarlo (ver src/lib/demo-semanal.ts).
//
// Doble vía de acceso, igual que /api/cron/resumen-semanal:
//  · Bearer CRON_SECRET → la corrida real semanal (GitHub Action).
//  · Sesión de ADMINISTRADOR → dispararlo a mano para probar.
export async function GET(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const esCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;

  if (!esCron) {
    const session = await auth();
    if (session?.user?.rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  // Slug configurable por si en el futuro hay más de una cuenta demo.
  const slug = new URL(req.url).searchParams.get("slug") ?? undefined;

  try {
    const resultado = await refrescarDemoSemanal(prisma, slug);
    const status = resultado.ok ? 200 : 422;
    return NextResponse.json(resultado, { status });
  } catch (e) {
    console.error("[cron/demo-semanal] error:", e);
    return NextResponse.json({ ok: false, error: "Error interno al refrescar el demo" }, { status: 500 });
  }
}
