/**
 * Aviso interno de vencimiento de licencia.
 *
 * Cada tenant puede tener una fecha de vencimiento (`licenciaVenceEn`) y un día
 * de aviso (`licenciaAvisoEn`), ambos editables en /admin-evoluteca/clientes.
 * Llegado el día del aviso, el cron diario de notificaciones le escribe a
 * EVOLUTECA (no al cliente) para decidir si se renueva o no. Se envía una sola
 * vez: `licenciaAvisadaEn` lo marca, y se limpia si se cambia alguna fecha.
 *
 * Vencer no suspende nada: suspender sigue siendo un botón del panel.
 *
 * Destino: AVISOS_EVOLUTECA_A; si no existe, el mismo buzón de los respaldos
 * (RESPALDO_EMAIL / GMAIL_USER). Sin destino no se envía ni se marca nada.
 */
import type { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatoDia } from "@/lib/fecha-bogota";
import { escapeHtml } from "@/lib/html";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";

export function destinoAvisosEvoluteca(): string | null {
  return (process.env.AVISOS_EVOLUTECA_A || process.env.RESPALDO_EMAIL || process.env.GMAIL_USER)?.trim() || null;
}

const LARGA: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

export async function enviarAvisosLicencia(
  resend: Resend,
  ahora: Date = new Date(),
): Promise<{ enviados: number; errores: string[] }> {
  const destino = destinoAvisosEvoluteca();
  if (!destino) return { enviados: 0, errores: [] };

  const pendientes = await prisma.tenant.findMany({
    where: { licenciaAvisoEn: { lte: ahora }, licenciaAvisadaEn: null },
    select: { id: true, nombre: true, slug: true, plan: true, activo: true, licenciaVenceEn: true },
  });

  let enviados = 0;
  const errores: string[] = [];
  for (const t of pendientes) {
    const vence = t.licenciaVenceEn ? formatoDia(t.licenciaVenceEn, LARGA) : "sin fecha definida";
    const nombre = escapeHtml(t.nombre);
    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="margin:0 0 12px;font-size:18px">¿Renovamos la licencia de ${nombre}?</h2>
      <p style="font-size:14px;line-height:1.5">La licencia de <strong>${nombre}</strong> vence el <strong>${escapeHtml(vence)}</strong>.</p>
      <p style="font-size:13px;color:#475569">Plan: ${escapeHtml(t.plan)} · Estado: ${t.activo ? "activo" : "suspendido"} · ${escapeHtml(t.slug)}</p>
      <p style="font-size:13px;color:#475569">Vencer no corta el acceso. Si se renueva, actualice la fecha de vencimiento; si no, suspenda la cuenta desde el panel.</p>
      <a href="${BASE_URL}/admin-evoluteca/clientes" style="display:inline-block;margin-top:12px;background:#1e3a8a;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Abrir panel de clientes →</a>
    </div>`;
    const { error } = await resend.emails.send({
      from: "Evoluteca CRM <noreply@evoluteca.com>",
      to: destino,
      subject: `Licencia de ${t.nombre} vence el ${vence}: ¿renovamos?`,
      html,
    });
    if (error) {
      errores.push(`licencia ${t.slug}: ${error.message}`);
      continue;
    }
    await prisma.tenant.update({ where: { id: t.id }, data: { licenciaAvisadaEn: ahora } });
    enviados++;
  }
  return { enviados, errores };
}
