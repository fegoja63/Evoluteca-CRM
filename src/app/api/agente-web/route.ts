import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { agenteConfigSchema, configAgente } from "@/lib/agente-web";

// Configuración del Chat web (ver lib/agente-web.ts). Solo administradores.

async function admin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (session.user.rol !== "ADMINISTRADOR") return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  return { tenantId: session.user.tenantId };
}

async function estado(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { agenteWebToken: true, agenteWebConfig: true } });
  return { token: t?.agenteWebToken ?? null, config: configAgente(t?.agenteWebConfig) };
}

export async function GET() {
  const a = await admin();
  if (a.error) return a.error;
  return NextResponse.json(await estado(a.tenantId));
}

/** Guarda la configuración. Al activarlo por primera vez se crea el token. */
export async function PUT(req: Request) {
  const a = await admin();
  if (a.error) return a.error;
  const { data, error } = parseOrError(agenteConfigSchema, await req.json().catch(() => null));
  if (error) return error;
  if (data.responsableId) {
    const u = await prisma.usuario.findFirst({ where: { id: data.responsableId, tenantId: a.tenantId, activo: true }, select: { id: true } });
    if (!u) return NextResponse.json({ error: "El responsable no es un usuario activo de su cuenta." }, { status: 400 });
  }
  const actual = await estado(a.tenantId);
  await prisma.tenant.update({
    where: { id: a.tenantId },
    data: {
      agenteWebConfig: data,
      ...(data.activo && !actual.token ? { agenteWebToken: randomBytes(16).toString("hex") } : {}),
    },
  });
  return NextResponse.json(await estado(a.tenantId));
}

/** Cambia el código: el anterior deja de funcionar de inmediato. */
export async function POST() {
  const a = await admin();
  if (a.error) return a.error;
  await prisma.tenant.update({ where: { id: a.tenantId }, data: { agenteWebToken: randomBytes(16).toString("hex") } });
  return NextResponse.json(await estado(a.tenantId));
}
