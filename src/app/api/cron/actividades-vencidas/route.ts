import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const ahora = new Date();

  // Obtener todos los usuarios activos con actividades vencidas sin completar
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, email: true, tenantId: true, rol: true },
  });

  let enviados = 0;
  const errores: string[] = [];

  for (const usuario of usuarios) {
    const ownerWhere = usuario.rol === "COMERCIAL" ? { creadoBy: usuario.id } : {};

    const vencidas = await prisma.actividad.findMany({
      where: {
        tenantId: usuario.tenantId,
        completada: false,
        fecha: { lt: ahora },
        ...ownerWhere,
      },
      orderBy: { fecha: "asc" },
      take: 20,
      select: {
        titulo: true,
        tipo: true,
        fecha: true,
        notas: true,
        empresa: { select: { nombre: true } },
      },
    });

    if (vencidas.length === 0) continue;

    const filasHtml = vencidas.map(a => {
      const diasAtraso = Math.floor((ahora.getTime() - new Date(a.fecha).getTime()) / 86_400_000);
      const color = diasAtraso >= 7 ? "#dc2626" : diasAtraso >= 2 ? "#d97706" : "#64748b";
      return `
        <div style="background:white;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1e293b">${a.titulo}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">
            ${a.tipo}${a.empresa ? ` · ${a.empresa.nombre}` : ""} ·
            <span style="color:${color};font-weight:600">${diasAtraso === 0 ? "Hoy" : `${diasAtraso}d de atraso`}</span>
          </p>
        </div>`;
    }).join("");

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Actividades vencidas pendientes</p>
        </div>
        <div style="background:#fef9f0;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="font-size:14px;color:#64748b;margin-bottom:16px">
            Hola <strong>${usuario.nombre}</strong>, tienes <strong>${vencidas.length}</strong> actividad(es) vencida(s) sin completar:
          </p>
          ${filasHtml}
          <a href="${process.env.NEXTAUTH_URL}/dashboard/agenda"
            style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
            Ir a la Agenda →
          </a>
          <p style="margin-top:20px;font-size:11px;color:#94a3b8">
            Este recordatorio se envía automáticamente cada mañana cuando tienes actividades sin completar.
          </p>
        </div>
      </div>`;

    const { error } = await resend.emails.send({
      from: "Evoluteca CRM <onboarding@resend.dev>",
      replyTo: "familiagomezpadilla@gmail.com",
      to: usuario.email,
      subject: `⏰ Tienes ${vencidas.length} actividad(es) vencida(s) — Evoluteca CRM`,
      html,
    });

    if (error) errores.push(`${usuario.email}: ${error.message}`);
    else enviados++;
  }

  return NextResponse.json({ enviados, errores });
}
