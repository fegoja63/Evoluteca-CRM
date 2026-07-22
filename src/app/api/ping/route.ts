import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// El commit que Vercel desplego, expuesto en tiempo de ejecucion. Sirve para
// verificar un despliegue con un simple GET, comparando este sha con el que se
// acaba de subir: no hay que parsear la tabla de `vercel ls`, que sin terminal
// interactiva parte la salida en varias lineas y hace imposible saber de forma
// fiable si el estado es "Ready".
const COMMIT = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, commit: COMMIT });
  } catch {
    // Se mantiene el 200 de antes: podria haber un monitor externo esperandolo.
    return NextResponse.json({ ok: false, commit: COMMIT });
  }
}
