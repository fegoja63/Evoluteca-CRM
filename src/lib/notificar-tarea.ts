import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/html";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";
const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

// Etiqueta legible del tipo. Se define aquí (en vez de reusar tipos-actividad)
// para no arrastrar la librería de iconos de React a una ruta de servidor.
const TIPO_LABEL: Record<string, string> = {
  LLAMADA: "Llamada",
  REUNION: "Reunión",
  TAREA: "Tarea",
  EMAIL: "Email",
  VISITA_COMERCIAL: "Visita comercial",
  VISITA_TECNICA: "Visita técnica",
};

type Params = {
  responsableId: string;
  asignadorId: string;
  asignadorNombre: string;
  tenantId: string;
  actividad: { titulo: string; tipo: string; fecha: Date; notas?: string | null };
};

/**
 * Envía un correo al responsable cuando se le asigna una tarea (fase 2 de la
 * asignación de tareas). Es "best-effort": nunca lanza — si algo falla, se
 * registra y sigue, para no tumbar la creación/edición de la actividad.
 *
 * No envía correo si:
 *  - te asignas la tarea a ti mismo (responsable === asignador),
 *  - no hay RESEND_API_KEY configurada,
 *  - el tenant tiene los correos desactivados (Tenant.emailsActivos = false),
 *  - el responsable no existe/está inactivo o no tiene email.
 */
export async function notificarTareaAsignada(p: Params): Promise<void> {
  try {
    if (!p.responsableId || p.responsableId === p.asignadorId) return;
    if (!process.env.RESEND_API_KEY) return;

    const [tenant, responsable] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: p.tenantId }, select: { emailsActivos: true, logoUrl: true } }),
      prisma.usuario.findFirst({
        where: { id: p.responsableId, tenantId: p.tenantId, activo: true },
        select: { nombre: true, email: true },
      }),
    ]);
    if (!tenant?.emailsActivos) return;
    if (!responsable?.email) return;

    const esc = (v: unknown) => escapeHtml(String(v ?? ""));
    const tipoLabel = TIPO_LABEL[p.actividad.tipo] ?? p.actividad.tipo;
    const fechaFmt = new Date(p.actividad.fecha).toLocaleString("es-CO", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });

    const subject = `📋 Nueva tarea asignada: ${esc(p.actividad.titulo)}`;
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
          <div>
            <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
            <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Te asignaron una tarea</p>
          </div>
          <img src="${tenant.logoUrl || LOGO_FGJ}" alt="Logo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="font-size:14px;color:#64748b;margin:0 0 16px">
            Hola <strong>${esc(responsable.nombre)}</strong>, <strong>${esc(p.asignadorNombre)}</strong> te asignó una tarea:
          </p>
          <div style="background:white;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:8px;padding:16px;margin-bottom:8px">
            <p style="margin:0 0 6px;font-weight:700;font-size:15px;color:#1e293b">${esc(p.actividad.titulo)}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8">${esc(tipoLabel)} · ${esc(fechaFmt)}</p>
            ${p.actividad.notas ? `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;font-size:13px;color:#475569">${esc(p.actividad.notas)}</div>` : ""}
          </div>
          <a href="${BASE_URL}/dashboard/agenda?filtro=asignadas" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver la tarea →</a>
        </div>
      </div>`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Evoluteca CRM <noreply@evoluteca.com>",
      to: responsable.email,
      subject,
      html,
    });
    if (error) console.error("notificarTareaAsignada resend:", JSON.stringify(error));
  } catch (e) {
    console.error("notificarTareaAsignada:", e instanceof Error ? e.message : String(e));
  }
}
