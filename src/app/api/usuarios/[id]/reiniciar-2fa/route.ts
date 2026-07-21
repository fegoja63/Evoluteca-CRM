import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operacionAuditoria } from "@/lib/auditoria";
import { tieneDosFactores } from "@/lib/dos-factores";

/**
 * Un administrador INICIA el rescate del segundo factor de un usuario.
 *
 * Sirve para el caso real: alguien activa la verificación en dos pasos, pierde
 * el teléfono y también sus códigos de respaldo. Sin esto quedaría fuera de su
 * cuenta para siempre, porque a propósito nadie puede desactivarle el segundo
 * factor a otro.
 *
 * La pieza que mantiene esa garantía: aquí NO se desactiva nada. Solo se manda
 * un enlace al correo del PROPIO usuario, y es él quien confirma. Un
 * administrador comprometido no puede quedarse con la cuenta de otro: tendría
 * que controlar además su buzón.
 */

const VIGENCIA_MS = 60 * 60 * 1000; // 1 hora, igual que el reseteo de contraseña

/**
 * Se envía por Resend desde noreply@evoluteca.com, no por Gmail.
 *
 * La primera versión usaba Gmail SMTP (copiando el patrón de
 * forgot-password) y el servidor de correo del destinatario lo rechazó con
 * "550 This message was classified as SPAM": un mensaje que dice venir de
 * Evoluteca pero sale de una cuenta de Gmail es justo lo que un filtro
 * antispam debe frenar. El resto de la aplicación ya usaba Resend con el
 * dominio propio, que sí entrega.
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json(
      { error: "Solo un administrador puede iniciar el rescate" },
      { status: 403 }
    );
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true, nombre: true, email: true, totpSecret: true, totpActivadoEn: true },
  });
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!tieneDosFactores(usuario)) {
    return NextResponse.json(
      { error: "Este usuario no tiene la verificación en dos pasos activa" },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");

  // El token se guarda y se audita en la misma transacción: si el registro
  // falla, tampoco queda un token vivo que nadie sepa que existe.
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: { reset2faToken: token, reset2faExpiry: new Date(Date.now() + VIGENCIA_MS) },
    }),
    operacionAuditoria({
      tenantId: session.user.tenantId,
      usuario: session.user,
      accion: "CAMBIAR_CONFIGURACION",
      entidad: "Usuario",
      entidadId: usuario.id,
      descripcion: `Inició el rescate de la verificación en dos pasos de ${usuario.email} (pendiente de que el usuario lo confirme por correo)`,
      peticion: request,
    }),
  ]);

  const enlace = `${process.env.NEXTAUTH_URL}/reiniciar-2fa?token=${token}`;

  if (!resend) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
  }

  const { error: errorEnvio } = await resend.emails.send({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    to: usuario.email,
    subject: "Desactivar la verificación en dos pasos — Evoluteca CRM",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a8a;margin-bottom:8px">Desactivar verificación en dos pasos</h2>
        <p style="color:#475569;margin-bottom:8px">Hola ${usuario.nombre},</p>
        <p style="color:#475569;margin-bottom:24px">
          ${session.user.name ?? "Un administrador"} solicitó desactivar tu verificación en dos pasos,
          normalmente porque perdiste el acceso a tu aplicación de códigos.
        </p>
        <a href="${enlace}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">
          Confirmar y desactivar
        </a>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">
          El enlace expira en 1 hora. <b>Si tú no perdiste el acceso, ignora este correo</b> y tu
          verificación seguirá activa: nadie puede desactivarla sin este enlace.
        </p>
      </div>`,
  });

  // Se comprueba el resultado: Resend no lanza excepción cuando rechaza, y
  // decirle al administrador "enlace enviado" cuando no salió lo dejaría
  // esperando un correo que no va a llegar.
  if (errorEnvio) {
    return NextResponse.json(
      { error: `No se pudo enviar el correo: ${errorEnvio.message}` },
      { status: 502 }
    );
  }

  // No se devuelve el token ni el enlace: el único camino es el buzón del
  // usuario. Si el administrador pudiera verlo, volveríamos al problema.
  return NextResponse.json({
    ok: true,
    mensaje: `Se envió un enlace a ${usuario.email}. Debe confirmarlo desde su correo en la próxima hora.`,
  });
}
