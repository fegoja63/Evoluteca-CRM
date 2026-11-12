/**
 * Envío de un correo al cliente a nombre de un vendedor y su registro en la
 * ficha (CorreoRegistrado). Lo usan la tarjeta "Correos" de las fichas y las
 * secuencias de seguimiento.
 *
 * Reply-To: si hay buzón de ingest (INGEST_EMAIL_BASE), la respuesta del
 * cliente va a `base+<token>@…`; el cron de correos entrantes lee ese token,
 * la cuelga de la misma ficha y se la reenvía al vendedor. Sin buzón de ingest,
 * la respuesta va directo al correo del vendedor.
 */
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/html";
import { generarTokenHilo, construirReplyTo } from "@/lib/correo-inbound";

const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

export type CorreoAlCliente = {
  tenantId: string;
  remitente: { id: string; nombre: string | null; email: string };
  para: string;
  asunto: string;
  cuerpo: string;
  empresaId?: string | null;
  contactoId?: string | null;
  oportunidadId?: string | null;
};

export type ResultadoEnvio =
  | { ok: true; registro: Awaited<ReturnType<typeof prisma.correoRegistrado.create>> }
  | { ok: false; status: 502 | 503; error: string };

export async function enviarCorreoAlCliente(c: CorreoAlCliente): Promise<ResultadoEnvio> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, status: 503, error: "El envío de correos no está configurado (falta RESEND_API_KEY)." };
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { logoUrl: true } });
  const html = plantillaCorreo(c.cuerpo, tenant?.logoUrl ?? null);

  const tokenHilo = process.env.INGEST_EMAIL_BASE ? generarTokenHilo() : null;
  const replyTo = (tokenHilo && construirReplyTo(process.env.INGEST_EMAIL_BASE!, tokenHilo)) || c.remitente.email;

  // Sale desde el remitente corporativo verificado en Resend, con el nombre del vendedor.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: enviado, error } = await resend.emails.send({
    from: `${c.remitente.nombre ?? "Evoluteca CRM"} · Evoluteca CRM <noreply@evoluteca.com>`,
    replyTo,
    to: c.para,
    subject: c.asunto,
    html,
    text: c.cuerpo,
  });
  if (error) {
    console.error("enviarCorreoAlCliente resend:", JSON.stringify(error));
    return { ok: false, status: 502, error: "No se pudo enviar el correo. Inténtalo de nuevo." };
  }

  const registro = await prisma.correoRegistrado.create({
    data: {
      direccion: "ENVIADO",
      de: c.remitente.email,
      para: c.para,
      asunto: c.asunto,
      cuerpo: c.cuerpo,
      proveedorMessageId: enviado?.id ?? null,
      tokenHilo,
      creadoBy: c.remitente.id,
      tenantId: c.tenantId,
      empresaId: c.empresaId || null,
      contactoId: c.contactoId || null,
      oportunidadId: c.oportunidadId || null,
    },
  });
  return { ok: true, registro };
}

function plantillaCorreo(cuerpoTexto: string, logoUrl: string | null): string {
  const cuerpoHtml = escapeHtml(cuerpoTexto).replace(/\n/g, "<br>");
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <div style="padding:16px 0;border-bottom:1px solid #e2e8f0">
      <img src="${logoUrl || LOGO_FGJ}" alt="Logo" style="height:40px;width:auto;object-fit:contain" />
    </div>
    <div style="padding:20px 0;font-size:15px;line-height:1.6;color:#334155">${cuerpoHtml}</div>
  </div>`;
}
