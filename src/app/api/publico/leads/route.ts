import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarLeadSchema } from "@/lib/validations/leads";
import { parseOrError } from "@/lib/validations/helpers";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";

// Endpoint público para que formularios externos (landing pages, WhatsApp
// Business, Meta Ads, etc.) creen leads directo en el CRM sin necesitar una
// sesión de usuario — autenticado por una clave por tenant (Tenant.apiKeyLeads,
// generada desde Configuración) enviada en el header "x-api-key".
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Falta el header x-api-key" }, { status: 401 });
  }

  // Limita por IP y por clave para que una clave filtrada no permita un
  // volumen ilimitado de leads falsos, y para que probar claves al azar
  // tampoco sea viable.
  const ip = obtenerIp(request);
  const permitidoIp = await permitirYRegistrar(`leads:ip:${ip}`, 30, 60 * 1000);
  if (!permitidoIp) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { apiKeyLeads: apiKey }, select: { id: true, activo: true } });
  if (!tenant || !tenant.activo) {
    return NextResponse.json({ error: "Clave inválida" }, { status: 401 });
  }

  const permitidoKey = await permitirYRegistrar(`leads:key:${tenant.id}`, 60, 10 * 60 * 1000);
  if (!permitidoKey) {
    return NextResponse.json({ error: "Demasiadas solicitudes para esta clave. Espera unos minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const { data: parsed, error } = parseOrError(capturarLeadSchema, body);
  if (error) return error;

  const tenantId = tenant.id;

  // Evita duplicar la misma empresa si el mismo formulario se envía dos
  // veces (ej. doble clic) — reutiliza la empresa existente por email exacto.
  let empresaId: string;
  const empresaExistente = parsed.empresaEmail
    ? await prisma.empresa.findFirst({ where: { tenantId, email: parsed.empresaEmail, eliminadoEn: null } })
    : null;

  if (empresaExistente) {
    empresaId = empresaExistente.id;
  } else {
    const empresa = await prisma.empresa.create({
      data: {
        nombre: parsed.empresaNombre.trim(),
        email: parsed.empresaEmail?.trim() || null,
        telefono: parsed.empresaTelefono?.trim() || null,
        sector: parsed.empresaSector?.trim() || null,
        tenantId,
      },
    });
    empresaId = empresa.id;
  }

  let contactoId: string | null = null;
  if (parsed.contactoNombre?.trim()) {
    const contacto = await prisma.contacto.create({
      data: {
        nombre: parsed.contactoNombre.trim(),
        email: parsed.contactoEmail?.trim() || null,
        telefono: parsed.contactoTelefono?.trim() || null,
        cargo: parsed.contactoCargo?.trim() || null,
        empresaId,
        tenantId,
      },
    });
    contactoId = contacto.id;
  }

  // Asignación automática por carga: reparte los leads entrantes entre los
  // vendedores activos del tenant, priorizando a quien tenga menos oportunidades
  // asignadas en este momento — evita que un lead externo quede "huérfano"
  // (sin dueño) hasta que un administrador lo reasigne a mano.
  const vendedores = await prisma.usuario.findMany({
    where: { tenantId, rol: "COMERCIAL", activo: true },
    select: { id: true },
    orderBy: { creadoEn: "asc" },
  });
  let vendedorAsignado: string | null = null;
  if (vendedores.length > 0) {
    const conteos = await prisma.oportunidad.groupBy({
      by: ["creadoBy"],
      where: { tenantId, creadoBy: { in: vendedores.map(v => v.id) } },
      _count: { _all: true },
    });
    const conteoPorVendedor = new Map(vendedores.map(v => [v.id, 0]));
    for (const c of conteos) {
      if (c.creadoBy) conteoPorVendedor.set(c.creadoBy, c._count._all);
    }
    vendedorAsignado = vendedores.reduce(
      (minId, v) => (conteoPorVendedor.get(v.id) ?? 0) < (conteoPorVendedor.get(minId) ?? 0) ? v.id : minId,
      vendedores[0].id,
    );
  }

  const oportunidad = await prisma.oportunidad.create({
    data: {
      titulo: parsed.oportunidadTitulo?.trim() || `Lead — ${parsed.empresaNombre.trim()}`,
      valor: parsed.oportunidadValor ?? null,
      etapa: "PROSPECTO",
      origenLead: parsed.origenLead?.trim() || "Captura externa",
      notas: parsed.notas?.trim() || null,
      empresaId,
      contactoId,
      tenantId,
      creadoBy: vendedorAsignado,
    },
  });

  return NextResponse.json({ ok: true, empresaId, contactoId, oportunidadId: oportunidad.id }, { status: 201 });
}
