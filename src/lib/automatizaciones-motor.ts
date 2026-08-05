import { Resend } from "resend";
import type { Automatizacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/html";
import { notificarTareaAsignada } from "@/lib/notificar-tarea";
import {
  aplicarPlantilla,
  validarConfigAccion,
  RESPONSABLE_DUENO,
  type EventoAutomatizacion,
} from "@/lib/automatizaciones";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";
const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

// Contexto mínimo de la oportunidad que dispara las reglas.
type OportunidadCtx = {
  id: string;
  titulo: string;
  empresaId: string | null;
  contactoId: string | null;
  creadoBy: string | null;
};

type Params = {
  evento: EventoAutomatizacion;
  tenantId: string;
  oportunidad: OportunidadCtx;
  etapaNueva?: string; // solo para OPORTUNIDAD_CAMBIA_ETAPA
  actorId?: string | null; // quién disparó el evento (para no auto-notificarse)
};

/**
 * Ejecuta las automatizaciones activas que coincidan con un evento. Es
 * "best-effort": envuelve todo en try/catch y NUNCA lanza, para no tumbar la
 * operación (crear/mover una oportunidad) que la disparó. Cada regla se ejecuta
 * de forma aislada: si una falla, las demás siguen.
 */
export async function dispararAutomatizaciones(params: Params): Promise<void> {
  try {
    const reglas = await prisma.automatizacion.findMany({
      where: { tenantId: params.tenantId, evento: params.evento, activa: true },
      orderBy: { orden: "asc" },
    });
    if (reglas.length === 0) return;

    // El filtro por etapa destino solo aplica al evento de cambio de etapa.
    const aplicables = reglas.filter(
      r =>
        params.evento !== "OPORTUNIDAD_CAMBIA_ETAPA" ||
        !r.etapaDestino ||
        r.etapaDestino === params.etapaNueva
    );
    if (aplicables.length === 0) return;

    // Nombre del cliente para las plantillas ({cliente}) — una sola consulta.
    let clienteNombre = "";
    if (params.oportunidad.empresaId) {
      const emp = await prisma.empresa.findFirst({
        where: { id: params.oportunidad.empresaId, tenantId: params.tenantId },
        select: { nombre: true },
      });
      clienteNombre = emp?.nombre ?? "";
    }
    const ctx = { oportunidad: params.oportunidad.titulo, cliente: clienteNombre };

    for (const regla of aplicables) {
      try {
        if (regla.accion === "CREAR_TAREA") {
          await ejecutarCrearTarea(regla, params, ctx);
        } else if (regla.accion === "ENVIAR_CORREO") {
          await ejecutarEnviarCorreo(regla, params, ctx);
        }
        await prisma.automatizacion.update({
          where: { id: regla.id },
          data: { vecesEjecutada: { increment: 1 }, ultimaEjecucion: new Date() },
        });
      } catch (e) {
        console.error("automatizacion", regla.id, e instanceof Error ? e.message : String(e));
      }
    }
  } catch (e) {
    console.error("dispararAutomatizaciones:", e instanceof Error ? e.message : String(e));
  }
}

async function ejecutarCrearTarea(
  regla: Automatizacion,
  params: Params,
  ctx: { oportunidad: string; cliente: string }
): Promise<void> {
  const v = validarConfigAccion("CREAR_TAREA", regla.config);
  if (!v.ok || v.accion !== "CREAR_TAREA") return;
  const cfg = v.config;

  // Responsable: el dueño del negocio, o un usuario concreto (revalidado en el
  // tenant y activo). Si no se resuelve, la tarea queda sin responsable.
  let responsableId: string | null = null;
  if (cfg.responsable === RESPONSABLE_DUENO) {
    responsableId = params.oportunidad.creadoBy ?? null;
  } else {
    const u = await prisma.usuario.findFirst({
      where: { id: cfg.responsable, tenantId: params.tenantId, activo: true },
      select: { id: true },
    });
    responsableId = u?.id ?? null;
  }

  const fecha = new Date(Date.now() + cfg.diasPlazo * 86_400_000);
  const titulo = aplicarPlantilla(cfg.titulo, ctx).trim().slice(0, 200) || "Tarea automática";

  const actividad = await prisma.actividad.create({
    data: {
      tipo: cfg.tipo,
      titulo,
      fecha,
      estado: "PENDIENTE",
      completada: false,
      responsableId,
      oportunidadId: params.oportunidad.id,
      empresaId: params.oportunidad.empresaId,
      contactoId: params.oportunidad.contactoId,
      tenantId: params.tenantId,
      notas: `Creada automáticamente por la regla "${regla.nombre}".`,
    },
  });

  // Avisa al responsable, salvo que sea quien disparó el evento (best-effort).
  if (responsableId) {
    await notificarTareaAsignada({
      responsableId,
      asignadorId: params.actorId ?? "",
      asignadorNombre: "Evoluteca CRM (automatización)",
      tenantId: params.tenantId,
      actividad: { titulo: actividad.titulo, tipo: actividad.tipo, fecha: actividad.fecha, notas: actividad.notas },
    });
  }
}

async function ejecutarEnviarCorreo(
  regla: Automatizacion,
  params: Params,
  ctx: { oportunidad: string; cliente: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const v = validarConfigAccion("ENVIAR_CORREO", regla.config);
  if (!v.ok || v.accion !== "ENVIAR_CORREO") return;
  const cfg = v.config;

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { emailsActivos: true, logoUrl: true },
  });
  if (!tenant?.emailsActivos) return;

  // Resuelve los destinatarios.
  let correos: string[] = [];
  if (cfg.destinatario === "DUENO") {
    if (params.oportunidad.creadoBy) {
      const u = await prisma.usuario.findFirst({
        where: { id: params.oportunidad.creadoBy, tenantId: params.tenantId, activo: true },
        select: { email: true },
      });
      if (u?.email) correos = [u.email];
    }
  } else {
    const us = await prisma.usuario.findMany({
      where: { tenantId: params.tenantId, activo: true, rol: { in: ["GERENTE", "ADMINISTRADOR"] } },
      select: { email: true },
    });
    correos = us.map(u => u.email).filter((e): e is string => !!e);
  }
  if (correos.length === 0) return;

  const asunto = aplicarPlantilla(cfg.asunto, ctx).trim().slice(0, 200) || "Aviso de Evoluteca CRM";
  const cuerpoTexto = aplicarPlantilla(cfg.cuerpo, ctx);
  const html = plantillaCorreo(cuerpoTexto, tenant.logoUrl, params.oportunidad.id);

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Se envía un correo por destinatario (no se exponen las direcciones entre sí).
  for (const to of correos) {
    await resend.emails.send({
      from: "Evoluteca CRM <noreply@evoluteca.com>",
      to,
      subject: asunto,
      html,
    });
  }
}

function plantillaCorreo(cuerpoTexto: string, logoUrl: string | null, oportunidadId: string): string {
  const cuerpoHtml = escapeHtml(cuerpoTexto).replace(/\n/g, "<br>");
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
    <div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
      <div>
        <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Aviso automático</p>
      </div>
      <img src="${logoUrl || LOGO_FGJ}" alt="Logo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
    </div>
    <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
      <div style="font-size:14px;color:#334155;line-height:1.6">${cuerpoHtml}</div>
      <a href="${BASE_URL}/dashboard/pipeline/${oportunidadId}" style="display:inline-block;margin-top:16px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Ver la oportunidad →</a>
      <p style="margin-top:20px;font-size:11px;color:#94a3b8">Este correo lo envió una automatización configurada en tu CRM.</p>
    </div>
  </div>`;
}
