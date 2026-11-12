import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { suscripcionPushSchema, quitarPushSchema } from "@/lib/validations/push";
import { llavePublicaPush } from "@/lib/push";

// Avisos en el dispositivo (ver lib/push.ts). GET dice si el servidor los
// tiene configurados y en cuántos dispositivos los activó el usuario; POST
// guarda la suscripción de este navegador; DELETE la quita.

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const publicKey = llavePublicaPush();
  const dispositivos = await prisma.suscripcionPush.count({
    where: { tenantId: session.user.tenantId, usuarioId: session.user.id },
  });
  return NextResponse.json({ disponible: !!publicKey, publicKey, dispositivos });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = parseOrError(suscripcionPushSchema, await request.json().catch(() => null));
  if (error) return error;

  const tenantId = session.user.tenantId;
  // Un mismo navegador en la misma cuenta es una sola suscripción; si otro
  // usuario de la cuenta inicia sesión en ese navegador, pasa a ser suya.
  await prisma.suscripcionPush.upsert({
    where: { tenantId_endpoint: { tenantId, endpoint: data.endpoint } },
    create: {
      tenantId, usuarioId: session.user.id, endpoint: data.endpoint,
      p256dh: data.keys.p256dh, auth: data.keys.auth, agente: data.agente ?? null,
    },
    update: { usuarioId: session.user.id, p256dh: data.keys.p256dh, auth: data.keys.auth, agente: data.agente ?? null },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = parseOrError(quitarPushSchema, await request.json().catch(() => null));
  if (error) return error;
  await prisma.suscripcionPush.deleteMany({
    where: { tenantId: session.user.tenantId, usuarioId: session.user.id, endpoint: data.endpoint },
  });
  return NextResponse.json({ ok: true });
}
