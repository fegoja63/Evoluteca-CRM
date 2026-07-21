import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { parseOrError } from "@/lib/validations/helpers";

/**
 * Por Resend y con el dominio propio, no por Gmail.
 *
 * Antes salía por Gmail SMTP diciendo ser de Evoluteca, y los servidores de
 * correo de los clientes lo rechazaban como spam ("550 This message was
 * classified as SPAM"). Es decir: la recuperación de contraseña llevaba
 * tiempo sin entregar, en silencio, porque esta ruta siempre responde ok
 * para no revelar si un correo existe.
 *
 * El cliente se construye dentro del handler y no al cargar el módulo: su
 * constructor lanza si falta la clave, y Next evalúa los módulos durante el
 * build, donde esa variable no existe. Eso tumbaba la compilación entera.
 */
function clienteResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = parseOrError(forgotPasswordSchema, body);
  if (error) return error;
  const { email } = data;

  // Máximo 3 solicitudes cada 15 minutos por correo y por IP — evita que se
  // use este endpoint para bombardear de emails a un usuario ajeno.
  const permitidoEmail = await permitirYRegistrar(`forgot:email:${email.toLowerCase()}`, 3, 15 * 60 * 1000);
  const permitidoIp = await permitirYRegistrar(`forgot:ip:${obtenerIp(req)}`, 10, 15 * 60 * 1000);
  if (!permitidoEmail || !permitidoIp) {
    // Misma respuesta que "usuario no encontrado" — no revela si el límite
    // se alcanzó por email o por IP, ni si el correo existe.
    return NextResponse.json({ ok: true });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });

  // Always return success to avoid email enumeration
  if (!usuario) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  const resend = clienteResend();
  if (!resend) {
    console.error("[forgot-password] RESEND_API_KEY no configurada: no se envió nada");
    return NextResponse.json({ ok: true });
  }

  const { error: errorEnvio } = await resend.emails.send({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    to: email,
    subject: "Recupera tu contraseña — Evoluteca CRM",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a8a;margin-bottom:8px">Recuperar contraseña</h2>
        <p style="color:#475569;margin-bottom:24px">Hola ${usuario.nombre},<br/>Recibimos una solicitud para restablecer tu contraseña en Evoluteca CRM.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">
          Restablecer contraseña
        </a>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  });

  // Al usuario se le responde ok pase lo que pase (no revelar si el correo
  // existe), pero el fallo tiene que quedar en los logs del servidor: si no,
  // nadie se entera de que la recuperacion de contraseñas dejó de entregar.
  if (errorEnvio) {
    console.error("[forgot-password] Resend rechazó el envío:", errorEnvio.message);
  }

  return NextResponse.json({ ok: true });
}
