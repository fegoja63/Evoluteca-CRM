import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esComercial } from "@/lib/permisos";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { parseOrError } from "@/lib/validations/helpers";
import { enviarCorreoAlCliente } from "@/lib/enviar-correo";
import { enlaceWhatsApp } from "@/lib/secuencias";
import { envioSchema } from "@/lib/base-dormida";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Envía los mensajes de reactivación que el vendedor revisó (ver
// lib/base-dormida.ts). Correo: sale a nombre del vendedor y la respuesta
// vuelve al CRM. WhatsApp: queda la tarea de hoy en su Bandeja Hoy con el
// mensaje y el botón "Enviar WhatsApp". Cada uno se valida por separado.

type Resultado = { empresaId: string; ok: boolean; error?: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const usuario = session.user;

  const { data, error } = parseOrError(envioSchema, await req.json().catch(() => null));
  if (error) return error;

  const permitido = await permitirYRegistrar(`base-dormida-enviar:${usuario.id}`, 5, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados envíos seguidos. Espere un momento." }, { status: 429 });

  const [remitente, tenant] = await Promise.all([
    prisma.usuario.findFirst({ where: { id: usuario.id, tenantId }, select: { id: true, nombre: true, email: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { emailsActivos: true } }),
  ]);
  if (!remitente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const resultados: Resultado[] = [];
  for (const it of data.items) {
    // El contacto tiene que ser de ese cliente, de esta cuenta y (para el comercial) de un cliente suyo.
    const contacto = await prisma.contacto.findFirst({
      where: {
        id: it.contactoId, tenantId, eliminadoEn: null, empresaId: it.empresaId,
        empresa: { eliminadoEn: null, ...(esComercial(usuario.rol) ? { creadoBy: usuario.id } : {}) },
      },
      select: { id: true, nombre: true, email: true, telefono: true, empresa: { select: { telefono: true } } },
    });
    if (!contacto) { resultados.push({ empresaId: it.empresaId, ok: false, error: "Contacto no encontrado" }); continue; }

    if (it.canal === "EMAIL") {
      if (!contacto.email) { resultados.push({ empresaId: it.empresaId, ok: false, error: "El contacto no tiene correo" }); continue; }
      if (!tenant?.emailsActivos) { resultados.push({ empresaId: it.empresaId, ok: false, error: "Los correos están desactivados en Configuración" }); continue; }
      const r = await enviarCorreoAlCliente({
        tenantId, remitente, para: contacto.email, asunto: it.asunto, cuerpo: it.cuerpo,
        contactoId: contacto.id, empresaId: it.empresaId,
      });
      resultados.push(r.ok ? { empresaId: it.empresaId, ok: true } : { empresaId: it.empresaId, ok: false, error: r.error });
      continue;
    }

    const wa = enlaceWhatsApp(contacto.telefono || contacto.empresa?.telefono, it.cuerpo);
    if (!wa) { resultados.push({ empresaId: it.empresaId, ok: false, error: "El contacto no tiene celular" }); continue; }
    await prisma.actividad.create({
      data: {
        tenantId, tipo: "TAREA",
        titulo: `WhatsApp a ${contacto.nombre} (reactivar)`.slice(0, 200),
        fecha: new Date(),
        notas: `Reactivar cliente dormido.\n\nMensaje para enviar:\n${it.cuerpo}\n\nAbrir WhatsApp: ${wa}`,
        creadoBy: usuario.id, responsableId: usuario.id,
        contactoId: contacto.id, empresaId: it.empresaId,
      },
    });
    resultados.push({ empresaId: it.empresaId, ok: true });
  }

  return NextResponse.json({ resultados, enviados: resultados.filter(r => r.ok).length });
}
