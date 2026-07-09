import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

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

  await transporter.sendMail({
    from: `"Evoluteca CRM" <${process.env.GMAIL_USER}>`,
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

  return NextResponse.json({ ok: true });
}
