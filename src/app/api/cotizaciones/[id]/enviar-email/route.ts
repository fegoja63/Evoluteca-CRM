import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const emailDestino: string | undefined = body?.email?.trim() || undefined;

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
      items:    true,
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const subtotal = cot.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
  const pctImpuesto = Number(cot.impuestoPorcentaje ?? 0);
  const valorImpuesto = subtotal * (pctImpuesto / 100);
  const total = subtotal + valorImpuesto;
  const numero = `#${String(cot.numero).padStart(4, "0")}`;
  const cliente = cot.empresa?.nombre ?? "Cliente";
  const contacto = cot.contacto?.nombre ?? "";

  const filasItems = cot.items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b">${i.descripcion}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center">${i.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:right">${fmt(Number(i.precioUnit))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#1e293b;text-align:right">${fmt(i.cantidad * Number(i.precioUnit))}</td>
    </tr>`).join("");

  const pdfUrl = `${process.env.NEXTAUTH_URL}/api/cotizaciones/${cot.id}/pdf`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:#1e3a8a;padding:24px 28px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <h2 style="color:white;margin:0;font-size:20px">Evoluteca CRM</h2>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Cotización ${numero}</p>
        </div>
        <img src="https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" alt="Felipe Gómez Jaramillo"
          style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
      </div>
      <div style="background:white;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:14px;margin-bottom:4px">Estimado/a <strong>${contacto || cliente}</strong>,</p>
        <p style="font-size:13px;color:#64748b;margin-bottom:24px">
          A continuación encontrará el detalle de la cotización <strong>${numero}</strong> emitida para <strong>${cliente}</strong>.
        </p>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">Descripción</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">P. Unitario</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filasItems}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">Subtotal</td>
              <td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(subtotal)}</td>
            </tr>
            ${pctImpuesto > 0 ? `
            <tr>
              <td colspan="3" style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${cot.impuestoNombre ?? "Impuesto"} (${pctImpuesto}%)</td>
              <td style="padding:6px 12px;font-size:12px;color:#64748b;text-align:right">${fmt(valorImpuesto)}</td>
            </tr>` : ""}
            <tr style="background:#f8fafc">
              <td colspan="3" style="padding:12px;font-size:13px;font-weight:700;color:#1e293b">TOTAL</td>
              <td style="padding:12px;font-size:15px;font-weight:700;color:#1e3a8a;text-align:right">${fmt(total)}</td>
            </tr>
          </tfoot>
        </table>

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
