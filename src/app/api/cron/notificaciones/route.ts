import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { EtapaOportunidad } from "@prisma/client";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";

const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

function header(_titulo: string, subtitulo: string) {
  return `<div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
    <div>
      <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">${subtitulo}</p>
    </div>
    <img src="${LOGO_FGJ}" alt="Felipe Gómez Jaramillo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
  </div>`;
}

function wrapper(inner: string) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">${inner}</div>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">${label} →</a>`;
}

function footer() {
  return `<p style="margin-top:20px;font-size:11px;color:#94a3b8">Este recordatorio se envía automáticamente cada mañana.</p>`;
}

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
  const hace14 = new Date(ahora.getTime() - 14 * 86_400_000);
  const en7dias = new Date(ahora.getTime() + 7 * 86_400_000);

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, email: true, tenantId: true, rol: true },
  });

  let enviados = 0;
  const errores: string[] = [];

  // Cache de emailsActivos por tenant
  const tenantCache: Record<string, boolean> = {};

  for (const u of usuarios) {
    if (tenantCache[u.tenantId] === undefined) {
      const t = await prisma.tenant.findUnique({ where: { id: u.tenantId }, select: { emailsActivos: true } });
      tenantCache[u.tenantId] = t?.emailsActivos ?? true;
    }
    if (!tenantCache[u.tenantId]) continue;

    const ownerWhere = u.rol === "COMERCIAL" ? { creadoBy: u.id } : {};
    const emails: { subject: string; html: string }[] = [];

    // ── 1. Actividades vencidas ──────────────────────────────────────────────
    const vencidas = await prisma.actividad.findMany({
      where: { tenantId: u.tenantId, completada: false, fecha: { lt: ahora }, ...ownerWhere },
      orderBy: { fecha: "asc" },
      take: 20,
      select: { titulo: true, tipo: true, fecha: true, empresa: { select: { nombre: true } } },
    });

    if (vencidas.length > 0) {
      const filas = vencidas.map(a => {
        const dias = Math.floor((ahora.getTime() - new Date(a.fecha).getTime()) / 86_400_000);
        const color = dias >= 7 ? "#dc2626" : dias >= 2 ? "#d97706" : "#64748b";
        return `<div style="background:white;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1e293b">${a.titulo}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">${a.tipo}${a.empresa ? ` · ${a.empresa.nombre}` : ""} · <span style="color:${color};font-weight:600">${dias === 0 ? "Hoy" : `${dias}d de atraso`}</span></p>
        </div>`;
      }).join("");

      emails.push({
        subject: `⏰ ${vencidas.length} actividad(es) vencida(s) — Evoluteca CRM`,
        html: wrapper(`${header("", "Actividades vencidas pendientes")}
          <div style="background:#fef9f0;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <p style="font-size:14px;color:#64748b;margin-bottom:16px">Hola <strong>${u.nombre}</strong>, tienes <strong>${vencidas.length}</strong> actividad(es) vencida(s):</p>
            ${filas}
            ${btn(`${BASE_URL}/dashboard/agenda`, "Ir a la Agenda")}
            ${footer()}
          </div>`),
      });
    }

    // ── 2. Negocios estancados (+14 días sin actividad) ──────────────────────
    const etapasActivas: EtapaOportunidad[] = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];
    const opActivas = await prisma.oportunidad.findMany({
      where: { tenantId: u.tenantId, etapa: { in: etapasActivas }, ...ownerWhere },
      include: {
        empresa: { select: { nombre: true } },
        actividades: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
      },
    });

    const estancados = opActivas.filter(o => {
      const ultima = o.actividades[0];
      return !ultima || new Date(ultima.fecha) < hace14;
    });

    if (estancados.length > 0) {
      const filas = estancados.map(o => {
        const ultima = o.actividades[0];
        const dias = ultima
          ? Math.floor((ahora.getTime() - new Date(ultima.fecha).getTime()) / 86_400_000)
          : null;
        return `<div style="background:white;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1e293b">${o.titulo}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">${o.empresa?.nombre ?? ""} · ${o.etapa} · <span style="color:#d97706;font-weight:600">${dias === null ? "Sin actividad registrada" : `${dias} días sin actividad`}</span></p>
        </div>`;
      }).join("");

      emails.push({
        subject: `⚠️ ${estancados.length} negocio(s) estancado(s) — Evoluteca CRM`,
        html: wrapper(`${header("", "Negocios sin actividad +14 días")}
          <div style="background:#fffbeb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <p style="font-size:14px;color:#64748b;margin-bottom:16px">Hola <strong>${u.nombre}</strong>, estos negocios llevan más de 14 días sin actividad:</p>
            ${filas}
            ${btn(`${BASE_URL}/dashboard/pipeline`, "Ver Pipeline")}
            ${footer()}
          </div>`),
      });
    }

    // ── 3. Cierres próximos (≤7 días) ────────────────────────────────────────
    const cierranProximo = await prisma.oportunidad.findMany({
      where: {
        tenantId: u.tenantId,
        etapa: { in: etapasActivas },
        fechaCierre: { gte: ahora, lte: en7dias },
        ...ownerWhere,
      },
      orderBy: { fechaCierre: "asc" },
      include: { empresa: { select: { nombre: true } } },
    });

    if (cierranProximo.length > 0) {
      const fmt = (v: number | null) =>
        v ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v) : "—";

      const filas = cierranProximo.map(o => {
        const dias = Math.ceil((new Date(o.fechaCierre!).getTime() - ahora.getTime()) / 86_400_000);
        const color = dias <= 2 ? "#dc2626" : "#2563eb";
        return `<div style="background:white;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1e293b">${o.titulo}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">${o.empresa?.nombre ?? ""} · ${fmt(Number(o.valor))} · <span style="color:${color};font-weight:600">${dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `en ${dias} días`}</span></p>
        </div>`;
      }).join("");

      emails.push({
        subject: `📅 ${cierranProximo.length} cierre(s) próximo(s) esta semana — Evoluteca CRM`,
        html: wrapper(`${header("", "Cierres estimados en los próximos 7 días")}
          <div style="background:#eff6ff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <p style="font-size:14px;color:#64748b;margin-bottom:16px">Hola <strong>${u.nombre}</strong>, estos negocios tienen fecha de cierre esta semana:</p>
            ${filas}
            ${btn(`${BASE_URL}/dashboard/pipeline`, "Ver Pipeline")}
            ${footer()}
          </div>`),
      });
    }

    // ── Enviar emails ─────────────────────────────────────────────────────────
    for (const mail of emails) {
      const { error } = await resend.emails.send({
        from: "Evoluteca CRM <noreply@evoluteca.com>",
        to: u.email,
        subject: `[${u.nombre}] ${mail.subject}`,
        html: mail.html,
      });
      if (error) errores.push(`${u.email} (${mail.subject}): ${error.message}`);
      else enviados++;
    }
  }

  return NextResponse.json({ enviados, errores, usuarios: usuarios.length });
}
