import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrError } from "@/lib/validations/helpers";
import { enviarCorreoSchema } from "@/lib/validations/correos";
import { escapeHtml } from "@/lib/html";
import { generarTokenHilo, construirReplyTo } from "@/lib/correo-inbound";

export const dynamic = "force-dynamic";

const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

// Lista los correos registrados de un contacto / empresa / oportunidad. El
// scope por tenant es obligatorio; los filtros afinan a la ficha desde la que
// se pide.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contactoId = searchParams.get("contactoId") || undefined;
  const empresaId = searchParams.get("empresaId") || undefined;
  const oportunidadId = searchParams.get("oportunidadId") || undefined;

  const correos = await prisma.correoRegistrado.findMany({
    where: { tenantId: session.user.tenantId, contactoId, empresaId, oportunidadId },
    orderBy: { fecha: "desc" },
    take: 100,
  });

  return NextResponse.json(correos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.user.email) return NextResponse.json({ error: "Tu usuario no tiene email para enviar" }, { status: 400 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(enviarCorreoSchema, body);
  if (error) return error;
  const { para, asunto, cuerpo, empresaId, contactoId, oportunidadId } = parsed;

  const tenantId = session.user.tenantId;

  // Las entidades vinculadas deben ser del mismo tenant (evita colgar un correo
  // de datos de otra organización pasando un id arbitrario). Se valida ANTES de
  // cualquier efecto (envío), tanto por seguridad como para que el aislamiento
  // sea comprobable aunque el envío no esté configurado.
  if (empresaId) {
    const e = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!e) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const c = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!c) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }
  if (oportunidadId) {
    const o = await prisma.oportunidad.findFirst({ where: { id: oportunidadId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!o) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "El envío de correos no está configurado (falta RESEND_API_KEY)." }, { status: 503 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { logoUrl: true } });
  const remitenteNombre = session.user.name ?? "Evoluteca CRM";
  const html = plantillaCorreo(cuerpo, tenant?.logoUrl ?? null);

  // Reply-To: si hay buzón de ingest configurado (INGEST_EMAIL_BASE), la
  // respuesta del cliente se dirige a `base+<token>@gmail.com`; el cron de
  // entrada lee ese token para vincular la respuesta a esta misma ficha y
  // reenviarla al vendedor. Sin buzón de ingest, se cae al correo real del
  // vendedor (comportamiento de la PR 1: las respuestas le llegan directo).
  const tokenHilo = process.env.INGEST_EMAIL_BASE ? generarTokenHilo() : null;
  const replyTo =
    (tokenHilo && construirReplyTo(process.env.INGEST_EMAIL_BASE!, tokenHilo)) || session.user.email;

  // Se envía desde el remitente corporativo verificado en Resend, con el nombre
  // del vendedor visible.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: enviado, error: errEnvio } = await resend.emails.send({
    from: `${remitenteNombre} · Evoluteca CRM <noreply@evoluteca.com>`,
    replyTo,
    to: para,
    subject: asunto,
    html,
    text: cuerpo,
  });

  if (errEnvio) {
    console.error("correos/enviar resend:", JSON.stringify(errEnvio));
    return NextResponse.json({ error: "No se pudo enviar el correo. Inténtalo de nuevo." }, { status: 502 });
  }

  const registro = await prisma.correoRegistrado.create({
    data: {
      direccion: "ENVIADO",
      de: session.user.email,
      para,
      asunto,
      cuerpo,
      proveedorMessageId: enviado?.id ?? null,
      tokenHilo,
      creadoBy: session.user.id,
      tenantId,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      oportunidadId: oportunidadId || null,
    },
  });

  return NextResponse.json(registro, { status: 201 });
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
