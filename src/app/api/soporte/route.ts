import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

const SOPORTE_EMAIL = "felipe.gomez@evoluteca.com";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email no configurado" }, { status: 503 });

  const body = await req.json();
  const { tipo, descripcion } = body;

  if (!tipo || !descripcion?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const usuario = session.user.nombre ?? session.user.email ?? "Usuario";
  const tenant  = session.user.tenantNombre ?? session.user.tenantId ?? "";

  const TIPOS: Record<string, string> = {
    error:      "🐛 Error / Bug",
    mejora:     "💡 Sugerencia de mejora",
    duda:       "❓ Duda o consulta",
    otro:       "📌 Otro",
  };

  const tipoLabel = TIPOS[tipo] ?? tipo;

  await resend.emails.send({
    from:    "Evoluteca CRM <noreply@evoluteca.com>",
    to:      SOPORTE_EMAIL,
    replyTo: session.user.email ?? undefined,
    subject: `[Soporte CRM] ${tipoLabel} — ${tenant}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Reporte de soporte — Evoluteca CRM</h1>
        </div>
        <div style="background:#f8fafc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:0">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;width:140px">Tipo</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b">${tipoLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b">Reportado por</td>
              <td style="padding:8px 0;font-size:14px;color:#1e293b">${usuario} (${session.user.email})</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b">Empresa / Tenant</td>
              <td style="padding:8px 0;font-size:14px;color:#1e293b">${tenant}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b">Fecha</td>
              <td style="padding:8px 0;font-size:14px;color:#1e293b">${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
            </tr>
          </table>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Descripción</p>
            <p style="margin:0;font-size:14px;color:#1e293b;white-space:pre-wrap">${descripcion.replace(/</g, "&lt;")}</p>
          </div>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
