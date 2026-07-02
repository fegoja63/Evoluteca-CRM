import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Email de prueba</p>
        </div>
        <img src="${LOGO_FGJ}" alt="Felipe Gómez Jaramillo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
      </div>
      <div style="background:#f0fdf4;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="font-size:14px;color:#64748b;margin-bottom:16px">
          ✅ Si ves este email, la configuración de Resend funciona correctamente.
        </p>
        <p style="font-size:13px;color:#1e293b">
          El logo de Felipe Gómez Jaramillo debería aparecer en la esquina superior derecha del header azul.
        </p>
        <p style="margin-top:20px;font-size:11px;color:#94a3b8">
          Enviado desde Evoluteca CRM · ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}
        </p>
      </div>
    </div>`;

  const { error } = await resend.emails.send({
    from: "Evoluteca CRM <onboarding@resend.dev>",
    to: "familiagomezpadilla@gmail.com",
    subject: "✅ Prueba de email — Evoluteca CRM",
    html,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true, mensaje: "Email enviado a familiagomezpadilla@gmail.com" });
}
