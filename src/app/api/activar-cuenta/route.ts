import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VERSION_TERMINOS = "1.0";

// Activación de cuenta en el primer ingreso:
//  - Cambia la clave temporal (que puso quien dio de alta al usuario) por una
//    que solo el usuario conoce.
//  - Si el usuario es el TITULAR y su empresa aún no ha aceptado el Acuerdo de
//    Licencia, registra la aceptación a nivel de TENANT (una sola vez, en nombre
//    de la empresa). Los demás usuarios nunca ven el contrato.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, tenantId: true, esTitular: true, debeCambiarPassword: true },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: usuario.tenantId },
    select: { terminosAceptadosEn: true },
  });

  const necesitaPassword = usuario.debeCambiarPassword;
  const necesitaTerminos = usuario.esTitular && !tenant?.terminosAceptadosEn;

  const { nuevaPassword, acepto } = await request.json().catch(() => ({}));

  if (necesitaPassword) {
    if (typeof nuevaPassword !== "string" || nuevaPassword.length < 8) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }
  }
  if (necesitaTerminos && acepto !== true) {
    return NextResponse.json({ error: "Debes aceptar el Acuerdo de Licencia para continuar" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (necesitaPassword) {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          passwordHash: await bcrypt.hash(nuevaPassword, 12),
          debeCambiarPassword: false,
        },
      });
    }
    if (necesitaTerminos) {
      await tx.tenant.update({
        where: { id: usuario.tenantId },
        data: {
          terminosAceptadosEn: new Date(),
          terminosVersion: VERSION_TERMINOS,
          terminosAceptadosPor: usuario.id,
        },
      });
      // Se conserva también en el usuario titular por trazabilidad (quién y cuándo).
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { aceptoTerminosEn: new Date(), versionTerminos: VERSION_TERMINOS },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
