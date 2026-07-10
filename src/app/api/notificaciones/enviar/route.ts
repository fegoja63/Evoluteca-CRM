import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { enviarNotificacionSchema } from "@/lib/validations/notificaciones";
import { parseOrError } from "@/lib/validations/helpers";
import { escapeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

// Los datos vienen de un objeto suelto (distinto según "tipo"), no de un
// schema fijo, así que se escapan al vuelo antes de interpolar en el HTML
// del correo en vez de validarlos campo por campo.
const esc = (v: unknown) => escapeHtml(String(v ?? ""));

export async function POST(req: Request) {
  try {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { data: parsedBody, error: errorValidacion } = parseOrError(enviarNotificacionSchema, body);
  if (errorValidacion) return errorValidacion;
  const { tipo, datos } = parsedBody;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  let subject = "";
  let html = "";

  if (tipo === "RECORDATORIO_ACTIVIDAD") {
    subject = `⏰ Recordatorio: ${esc(datos.titulo)}`;
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Recordatorio de actividad</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h3 style="margin:0 0 8px;color:#1e293b">${esc(datos.titulo)}</h3>
          <p style="margin:0 0 16px;color:#64748b;font-size:14px">Tipo: <strong>${esc(datos.tipo)}</strong> · Fecha: <strong>${esc(datos.fecha)}</strong></p>
          ${datos.notas ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;color:#475569">${esc(datos.notas)}</div>` : ""}
          <a href="${process.env.NEXTAUTH_URL}/dashboard/agenda" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver en el CRM →</a>
        </div>
      </div>`;
  } else if (tipo === "COTIZACION_ENVIADA") {
    subject = `📄 Cotización #${esc(datos.numero)} — ${esc(datos.cliente)}`;
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Nueva cotización enviada</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="font-size:14px;color:#64748b">Se ha marcado como <strong>Enviada</strong> la cotización:</p>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#2563eb">Cotización #${esc(datos.numero)}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#475569">Cliente: <strong>${esc(datos.cliente)}</strong></p>
            <p style="margin:0;font-size:13px;color:#475569">Total: <strong>${esc(datos.total)}</strong></p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/cotizaciones-formales/${encodeURIComponent(String(datos.id ?? ""))}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver cotización →</a>
        </div>
      </div>`;
  } else if (tipo === "RESUMEN_DIARIO") {
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const actividadesPendientes = await prisma.actividad.findMany({
      where: { tenantId: session.user.tenantId, completada: false, fecha: { lte: mañana } },
      orderBy: { fecha: "asc" }, take: 10,
      select: { titulo: true, tipo: true, fecha: true, empresa: { select: { nombre: true } } },
    });
    subject = `📊 Resumen diario — ${new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}`;
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Resumen de actividades pendientes</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          ${actividadesPendientes.length === 0
            ? `<p style="color:#10b981;font-weight:600">✅ ¡Sin actividades pendientes! Todo al día.</p>`
            : `<p style="font-size:14px;color:#64748b;margin-bottom:12px">Tienes <strong>${actividadesPendientes.length}</strong> actividad(es) pendientes:</p>
               ${actividadesPendientes.map(a => `
                 <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px">
                   <p style="margin:0 0 4px;font-weight:600;font-size:13px">${a.titulo}</p>
                   <p style="margin:0;font-size:12px;color:#94a3b8">${a.tipo} · ${a.empresa?.nombre ?? ""} · ${new Date(a.fecha).toLocaleDateString("es-CO")}</p>
                 </div>`).join("")}`}
          <a href="${process.env.NEXTAUTH_URL}/dashboard/agenda" style="display:inline-block;margin-top:12px;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ir a la Agenda →</a>
        </div>
      </div>`;
  }

  if (!session.user.email) return NextResponse.json({ error: "Tu usuario no tiene email" }, { status: 400 });

  // Siempre se envía al correo del propio usuario autenticado -- ningún
  // llamador legítimo de este endpoint pasaba un destinatario distinto, y
  // permitir uno arbitrario hubiera dejado enviar correo con el remitente
  // corporativo a cualquier dirección.
  const { error } = await resend.emails.send({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    replyTo: "felipegomezjaramillo@gmail.com",
    to: session.user.email,
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message, detail: error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notificaciones/enviar crash:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
