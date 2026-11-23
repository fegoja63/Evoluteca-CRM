import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { parteSchema, guardarParte } from "@/lib/finanzas/subida-partes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Recibe una parte de un archivo grande para la lectura con IA (ver
// lib/finanzas/subida-partes.ts). Mismo permiso que leer: editar finanzas.
export async function POST(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const permitido = await permitirYRegistrar(`finanzas-parte:${usuarioId}`, 40, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiadas partes seguidas. Espere un momento." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const parte = form?.get("parte");
  const datos = parteSchema.safeParse({
    subidaId: form?.get("subidaId"), indice: form?.get("indice"), total: form?.get("total"), nombre: form?.get("nombre"),
  });
  if (!datos.success || !(parte instanceof File)) return NextResponse.json({ error: "Parte inválida." }, { status: 400 });

  const r = await guardarParte({ tenantId: acceso.tenantId, usuarioId }, datos.data, Buffer.from(await parte.arrayBuffer()));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
