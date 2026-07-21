import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { enviarEmailCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";
import { numeroCotizacion } from "@/lib/cotizaciones";

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
      tenant:   { select: { logoUrl: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const logoUrl = cot.tenant.logoUrl || "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

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

  const pdfUrl = `${process.env.NEXTAUTH_URL}/api/cotizaciones/${cot.id}/pdf`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:#1e3a8a;padding:24px 28px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <h2 style="color:white;margin:0;font-size:20px">Evoluteca CRM</h2>
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
          <a href="${pdfUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
            ⬇ Descargar PDF
          </a>
        </div>

        <p style="margin-top:24px;font-size:11px;color:#94a3b8;text-align:center">
          Enviado desde Evoluteca CRM · ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })}
        </p>
      </div>
    </div>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "Evoluteca CRM <noreply@evoluteca.com>",
    to: emailDestino ?? cot.contacto?.email ?? session.user.email ?? "felipegomezjaramillo@gmail.com",
    subject: `📄 Cotización ${numero} — ${cliente}`,
    html,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Cambiar estado a ENVIADA si era BORRADOR
  if (cot.estado === "BORRADOR") {
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: "ENVIADA" } });
  }

  return NextResponse.json({ ok: true });
}
