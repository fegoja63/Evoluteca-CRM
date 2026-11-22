import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturarLeadSchema } from "@/lib/validations/leads";
import { parseOrError } from "@/lib/validations/helpers";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";
import { crearLead } from "@/lib/crear-lead";

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

  const { empresaId, contactoId, oportunidadId } = await crearLead(tenant.id, parsed);

  return NextResponse.json({ ok: true, empresaId, contactoId, oportunidadId }, { status: 201 });
}
