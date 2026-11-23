import { NextResponse } from "next/server";
import { procesarSecuencias } from "@/lib/secuencias";
import { procesarResenaRecompra } from "@/lib/resena-recompra";

// Cumple los pasos de secuencias que vencieron (ver lib/secuencias.ts) y deja
// las tareas de reseña y recompra de los negocios ganados (lib/resena-recompra.ts).
// Lo llama el workflow "Secuencias CRM" de GitHub Actions los días hábiles en
// la mañana, con el CRON_SECRET.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await procesarSecuencias();
  const postventa = await procesarResenaRecompra();
  return NextResponse.json({ ...r, ...postventa });
}
