import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { esComercial } from "@/lib/permisos";
import { diasValidos } from "@/lib/base-dormida";
import { clientesDormidos } from "@/lib/base-dormida-carga";

export const dynamic = "force-dynamic";

// Base dormida (ver lib/base-dormida.ts): clientes sin negocio en curso ni
// movimiento en `dias` días. El comercial ve solo los suyos.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = diasValidos(new URL(req.url).searchParams.get("dias"));
  const clientes = await clientesDormidos(
    session.user.tenantId, dias, esComercial(session.user.rol) ? session.user.id : null,
  );
  return NextResponse.json({ dias, clientes });
}
