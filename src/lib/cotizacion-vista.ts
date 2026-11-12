/**
 * "El cliente abrió la cotización": registro de aperturas del enlace público y
 * aviso al vendedor la primera vez.
 *
 * La vista la registra la página pública con un POST desde el navegador (no al
 * servir la página), así no cuentan los robots que arman la vista previa del
 * enlace en WhatsApp o en el correo: esos no ejecutan JavaScript.
 *
 * No cuenta:
 *  - quien tiene sesión en el mismo tenant (el vendedor revisando su enlace),
 *  - las recargas dentro de VENTANA_VISITA_MS desde la última vista (una misma
 *    visita del cliente cuenta una vez).
 */
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/html";
import { registrarErrorServidor } from "@/lib/registrar-error-servidor";
import { formatoFechaHora } from "@/lib/fecha-bogota";
import { numeroCotizacion } from "@/lib/cotizaciones";
import { enviarPush } from "@/lib/push";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";
const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

export const VENTANA_VISITA_MS = 30 * 60 * 1000;

/** ¿Esta apertura es una visita nueva (y no una recarga de la misma)? */
export function esVisitaNueva(vistaUltimaEn: Date | null, ahora: Date): boolean {
  return !vistaUltimaEn || ahora.getTime() - vistaUltimaEn.getTime() >= VENTANA_VISITA_MS;
}

export type ResultadoVista = "no-encontrada" | "propia" | "contada" | "recarga";

/**
 * Registra una apertura del enlace público. `tenantIdSesion` es el tenant de
 * quien abre, si tiene sesión (para no contar al propio equipo).
 */
export async function registrarVistaCotizacion(
  token: string,
  tenantIdSesion: string | null,
  ahora = new Date(),
): Promise<ResultadoVista> {
  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: token, eliminadoEn: null },
    select: { id: true, tenantId: true, vistaUltimaEn: true },
  });
  if (!cot) return "no-encontrada";
  if (tenantIdSesion && tenantIdSesion === cot.tenantId) return "propia";

  const nueva = esVisitaNueva(cot.vistaUltimaEn, ahora);
  await prisma.cotizacion.update({
    where: { id: cot.id, tenantId: cot.tenantId },
    data: { vistaUltimaEn: ahora, ...(nueva ? { vistas: { increment: 1 } } : {}) },
  });
  if (!nueva) return "recarga";

  // La primera vista se "reclama" con una escritura condicional: si llegan dos
  // aperturas a la vez, solo una encuentra vistaPrimeraEn vacía y avisa.
  const primera = await prisma.cotizacion.updateMany({
    where: { id: cot.id, tenantId: cot.tenantId, vistaPrimeraEn: null },
    data: { vistaPrimeraEn: ahora },
  });
  if (primera.count === 1) await avisarPrimeraVista(cot.id, cot.tenantId, ahora);
  return "contada";
}

/**
 * Aviso (push al celular y correo) al dueño del negocio —o, si la cotización
 * no tiene negocio con dueño, a los administradores— la primera vez que el
 * cliente abre la cotización. Best-effort: nunca lanza.
 */
async function avisarPrimeraVista(cotizacionId: string, tenantId: string, cuando: Date): Promise<void> {
  try {
    const cot = await prisma.cotizacion.findFirst({
      where: { id: cotizacionId, tenantId },
      select: {
        numero: true, numeroManual: true, estado: true,
        tenant: { select: { emailsActivos: true, logoUrl: true } },
        empresa: { select: { nombre: true } },
        contacto: { select: { nombre: true } },
        oportunidad: { select: { titulo: true, creadoBy: true } },
      },
    });
    if (!cot?.tenant.emailsActivos) return;
    // Si ya está aceptada o rechazada, el aviso no aporta nada.
    if (cot.estado === "ACEPTADA" || cot.estado === "RECHAZADA") return;

    const duenoId = cot.oportunidad?.creadoBy ?? null;
    const destinatarios = await prisma.usuario.findMany({
      where: duenoId
        ? { id: duenoId, tenantId, activo: true }
        : { tenantId, activo: true, rol: "ADMINISTRADOR" },
      select: { id: true, nombre: true, email: true },
    });

    const numero = numeroCotizacion(cot);
    const quien = cot.contacto?.nombre ?? cot.empresa?.nombre ?? "Tu cliente";
    await enviarPush(tenantId, destinatarios.map(d => d.id), {
      titulo: `👀 ${quien} abrió la cotización ${numero}`,
      cuerpo: cot.oportunidad?.titulo ? `${cot.oportunidad.titulo} · buen momento para llamar.` : "Buen momento para llamar y resolver dudas.",
      url: `/dashboard/cotizaciones-formales/${cotizacionId}`,
      etiqueta: `cot-vista-${cotizacionId}`,
    });

    if (!process.env.RESEND_API_KEY) return;
    const conCorreo = destinatarios.filter(d => d.email);
    if (conCorreo.length === 0) return;
    const esc = (v: unknown) => escapeHtml(String(v ?? ""));
    const cliente = cot.empresa?.nombre ? ` (${cot.empresa.nombre})` : "";
    const hora = formatoFechaHora(cuando, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    const subject = `👀 ${quien} abrió la cotización ${numero}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const d of conCorreo) {
      const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
          <div>
            <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
            <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Tu cliente abrió la cotización</p>
          </div>
          <img src="${cot.tenant.logoUrl || LOGO_FGJ}" alt="Logo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="font-size:14px;color:#475569;margin:0 0 16px">
            Hola <strong>${esc(d.nombre)}</strong>, <strong>${esc(quien)}${esc(cliente)}</strong> acaba de abrir la cotización <strong>${esc(numero)}</strong>${cot.oportunidad?.titulo ? ` del negocio <strong>${esc(cot.oportunidad.titulo)}</strong>` : ""}.
          </p>
          <p style="font-size:13px;color:#64748b;margin:0 0 16px">${esc(hora)}. Es buen momento para llamar y resolver dudas mientras la tiene fresca.</p>
          <a href="${BASE_URL}/dashboard/cotizaciones-formales/${cotizacionId}" style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver la cotización →</a>
        </div>
      </div>`;
      const { error } = await resend.emails.send({
        from: "Evoluteca CRM <noreply@evoluteca.com>",
        to: d.email!,
        subject,
        html,
      });
      if (error) {
        await registrarErrorServidor({
          mensaje: `No se pudo enviar el aviso de cotización abierta: ${error.message}`,
          stack: JSON.stringify(error),
          tipo: "email",
          tenantId,
          usuarioEmail: d.email,
        });
      }
    }
  } catch (e) {
    await registrarErrorServidor({
      mensaje: `Excepción enviando aviso de cotización abierta: ${e instanceof Error ? e.message : String(e)}`,
      stack: e instanceof Error ? e.stack : null,
      tipo: "email",
      tenantId,
    });
  }
}
