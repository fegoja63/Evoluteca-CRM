import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { enviarEmailCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";
import { numeroCotizacion } from "@/lib/cotizaciones";
import { randomBytes } from "crypto";
import { generarTokenHilo, construirReplyTo } from "@/lib/correo-inbound";
import { baseUrlDesdePeticion } from "@/lib/base-url";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { data: parsedBody, error: errorValidacion } = parseOrError(enviarEmailCotizacionSchema, body);
  if (errorValidacion) return errorValidacion;
  const emailDestino: string | undefined = parsedBody.email?.trim() || undefined;

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
      items:    true,
      lineasAhorro: { orderBy: { id: "asc" } },
      tenant:   { select: { logoUrl: true, nombre: true, email: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const logoUrl = cot.tenant.logoUrl || "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";
  // El correo debe verse enviado por la empresa del usuario (p. ej. Teatro
  // Belarte), no por "Evoluteca CRM". Se limpian caracteres que romperían el
  // encabezado From del correo.
  const tenantNombre = (cot.tenant.nombre ?? "").replace(/["<>\r\n]/g, "").trim() || "Evoluteca CRM";

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const subtotal = cot.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
  const pctImpuesto = Number(cot.impuestoPorcentaje ?? 0);
  const valorImpuesto = subtotal * (pctImpuesto / 100);
  const pctImpuesto2 = Number(cot.impuesto2Porcentaje ?? 0);
  const valorImpuesto2 = subtotal * (pctImpuesto2 / 100);
  const total = subtotal + valorImpuesto + valorImpuesto2;
  const numero = numeroCotizacion(cot);
  const cliente = cot.empresa?.nombre ?? "Cliente";
  const contacto = cot.contacto?.nombre ?? "";

  const filasItems = cot.items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b">${i.descripcion}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center">${i.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:right">${fmt(Number(i.precioUnit))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#1e293b;text-align:right">${fmt(i.cantidad * Number(i.precioUnit))}</td>
    </tr>`).join("");

  // Modalidad de cobro: fee fijo (ítems) vs honorarios (success fee / fee mensual).
  const esFijo = !cot.modalidad || cot.modalidad === "FEE_FIJO";
  const ahorroMes = (cot.lineasAhorro ?? []).reduce((a, l) => a + Number(l.ahorroEstimadoMensual), 0);
  const pctHon = Number(cot.porcentajeHonorarios ?? 0);
  const mesesHz = cot.horizonteMeses ?? 0;
  const feeMes = Number(cot.feeMensual ?? 0);
  const valorContrato = cot.modalidad === "SUCCESS_FEE" ? ahorroMes * (pctHon / 100) * mesesHz
    : cot.modalidad === "FEE_MENSUAL" ? feeMes * mesesHz : total;

  const th = (t: string, align = "left") => `<th style="padding:10px 12px;text-align:${align};font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">${t}</th>`;
  const tablaFijo = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#f8fafc">${th("Descripción")}${th("Cant.","center")}${th("P. Unitario","right")}${th("Subtotal","right")}</tr></thead>
      <tbody>${filasItems}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">Subtotal</td><td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(subtotal)}</td></tr>
        ${pctImpuesto > 0 ? `<tr><td colspan="3" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${cot.impuestoNombre ?? "Impuesto"} (${pctImpuesto}%)</td><td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(valorImpuesto)}</td></tr>` : ""}
        ${pctImpuesto2 > 0 ? `<tr><td colspan="3" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${cot.impuesto2Nombre ?? "Impuesto"} (${pctImpuesto2}%)</td><td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(valorImpuesto2)}</td></tr>` : ""}
        <tr style="background:#f8fafc"><td colspan="3" style="padding:12px;font-size:13px;font-weight:700;color:#1e293b">TOTAL</td><td style="padding:12px;font-size:15px;font-weight:700;color:#1e3a8a;text-align:right">${fmt(total)}</td></tr>
      </tfoot>
    </table>`;
  const filasAhorro = (cot.lineasAhorro ?? []).map(l => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b">${l.area}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:right">${fmt(Number(l.gastoBaseMensual))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#047857;text-align:right">${fmt(Number(l.ahorroEstimadoMensual))}</td>
    </tr>`).join("");
  const tablaSuccess = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#f8fafc">${th("Área de gasto")}${th("Gasto base/mes","right")}${th("Ahorro/mes","right")}</tr></thead>
      <tbody>${filasAhorro}</tbody>
      <tfoot>
        <tr><td colspan="2" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">Ahorro mensual estimado</td><td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(ahorroMes)}</td></tr>
        <tr><td colspan="2" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">Honorarios</td><td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${pctHon}% × ${mesesHz} meses</td></tr>
        <tr style="background:#f8fafc"><td colspan="2" style="padding:12px;font-size:13px;font-weight:700;color:#1e293b">HONORARIO ESTIMADO</td><td style="padding:12px;font-size:15px;font-weight:700;color:#1e3a8a;text-align:right">${fmt(valorContrato)}</td></tr>
      </tfoot>
    </table>
    <p style="margin-top:8px;font-size:11px;color:#94a3b8">Estimación sobre el ahorro proyectado. El honorario real se cobra sobre el ahorro efectivamente verificado durante el horizonte del contrato.</p>`;
  const tablaMensual = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <tbody>
        <tr><td style="padding:10px 12px;font-size:13px;color:#1e293b">Fee mensual</td><td style="padding:10px 12px;font-size:13px;color:#64748b;text-align:right">${fmt(feeMes)}</td></tr>
        <tr><td style="padding:10px 12px;font-size:13px;color:#1e293b;border-top:1px solid #e2e8f0">Horizonte</td><td style="padding:10px 12px;font-size:13px;color:#64748b;text-align:right;border-top:1px solid #e2e8f0">${mesesHz} meses</td></tr>
        <tr style="background:#f8fafc"><td style="padding:12px;font-size:13px;font-weight:700;color:#1e293b">TOTAL DEL CONTRATO</td><td style="padding:12px;font-size:15px;font-weight:700;color:#1e3a8a;text-align:right">${fmt(valorContrato)}</td></tr>
      </tbody>
    </table>`;
  const tablaHtml = esFijo ? tablaFijo : (cot.modalidad === "SUCCESS_FEE" ? tablaSuccess : tablaMensual);

  // El cliente no tiene sesión: el PDF y el enlace para ver/responder la
  // cotización se autentican con el token público. Se genera y persiste si aún
  // no existe (misma lógica que el botón "Compartir enlace").
  let token = cot.tokenPublico;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { tokenPublico: token } });
  }
  const base = baseUrlDesdePeticion(req);
  const pdfUrl = `${base}/api/cotizaciones/${cot.id}/pdf?token=${token}`;
  const verUrl = `${base}/cotizacion/${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:#1e3a8a;padding:24px 28px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <h2 style="color:white;margin:0;font-size:20px">${tenantNombre}</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Cotización ${numero}</p>
        </div>
        <img src="${logoUrl}" alt="Logo"
          style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
      </div>
      <div style="background:white;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:14px;margin-bottom:4px">Estimado/a <strong>${contacto || cliente}</strong>,</p>
        <p style="font-size:13px;color:#64748b;margin-bottom:24px">
          A continuación encontrará el detalle de la cotización <strong>${numero}</strong> emitida para <strong>${cliente}</strong>.
        </p>

        ${tablaHtml}

        ${cot.notas ? `<div style="margin-top:16px;background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#64748b"><strong>Notas:</strong> ${cot.notas}</div>` : ""}
        ${cot.fechaValidez ? `<p style="margin-top:12px;font-size:12px;color:#94a3b8">Cotización válida hasta: <strong>${new Date(cot.fechaValidez).toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric", timeZone: "UTC" })}</strong></p>` : ""}

        <div style="margin-top:24px;text-align:center">
          <a href="${verUrl}" style="display:inline-block;background:#1e3a8a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:0 4px 8px">
            Ver y responder en línea
          </a>
          <a href="${pdfUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:0 4px 8px">
            ⬇ Descargar PDF
          </a>
        </div>

        <p style="margin-top:24px;font-size:10px;color:#cbd5e1;text-align:center">
          Enviado usando Evoluteca CRM · ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })}
        </p>
      </div>
    </div>`;

  const destinatario = emailDestino ?? cot.contacto?.email ?? session.user.email ?? "felipegomezjaramillo@gmail.com";

  // Responder-a y captura de respuestas:
  //  - Con buzón de ingest configurado (INGEST_EMAIL_BASE): la respuesta del
  //    cliente se dirige a `base+<token>@…`; el cron de entrada la vincula a esta
  //    cotización (su oportunidad/contacto) y le avisa al vendedor. Así la
  //    respuesta queda EN EL CRM.
  //  - Sin buzón de ingest: se cae al "Correo de la empresa" (Fase 1), y si
  //    tampoco está, a noreply.
  const tokenHilo = process.env.INGEST_EMAIL_BASE ? generarTokenHilo() : null;
  const replyTo =
    (tokenHilo && construirReplyTo(process.env.INGEST_EMAIL_BASE!, tokenHilo)) ||
    cot.tenant.email?.trim() ||
    undefined;

  // Versión de texto plano del correo. Un correo solo-HTML puntúa peor en los
  // filtros anti-spam; incluir el equivalente en texto mejora la entregabilidad.
  const totalMostrar = esFijo ? total : valorContrato;
  const validezTxt = cot.fechaValidez
    ? `\nVálida hasta: ${new Date(cot.fechaValidez).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}`
    : "";
  const texto = `Estimado/a ${contacto || cliente},

A continuación encontrará la cotización ${numero} emitida para ${cliente}.

Total: ${fmt(totalMostrar)}${validezTxt}

Ver y responder en línea: ${verUrl}
Descargar PDF: ${pdfUrl}

Enviado usando Evoluteca CRM (${tenantNombre}).`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: enviado, error } = await resend.emails.send({
    from: `${tenantNombre} <noreply@evoluteca.com>`,
    to: destinatario,
    ...(replyTo ? { replyTo } : {}),
    subject: `Cotización ${numero} — ${cliente}`,
    html,
    text: texto,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Registra el correo enviado (ficha "Correos") con el token de hilo, para que
  // la respuesta del cliente se capture y quede vinculada a esta cotización.
  await prisma.correoRegistrado.create({
    data: {
      direccion: "ENVIADO",
      de: session.user.email ?? "noreply@evoluteca.com",
      para: destinatario,
      asunto: `Cotización ${numero} — ${cliente}`,
      cuerpo: `Cotización ${numero} enviada por correo a ${cliente}.`,
      proveedorMessageId: enviado?.id ?? null,
      tokenHilo,
      creadoBy: session.user.id,
      tenantId: session.user.tenantId,
      empresaId: cot.empresaId,
      contactoId: cot.contactoId,
      oportunidadId: cot.oportunidadId,
    },
  });

  // Cambiar estado a ENVIADA si era BORRADOR
  if (cot.estado === "BORRADOR") {
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: "ENVIADA" } });
  }

  return NextResponse.json({ ok: true });
}
