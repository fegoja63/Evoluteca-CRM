/**
 * Crea un lead entrante (cliente + contacto + oportunidad en Prospecto) sin
 * sesión de usuario. Lo usan la captura externa (/api/publico/leads) y el chat
 * de la página web (lib/agente-web.ts).
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { capturarLeadSchema } from "@/lib/validations/leads";
import { probabilidadPara } from "@/lib/probabilidad-etapa";
import { dispararAutomatizaciones } from "@/lib/automatizaciones-motor";

export type DatosLead = z.infer<typeof capturarLeadSchema>;

/**
 * Asignación automática por carga: reparte los leads entrantes entre los
 * vendedores activos del tenant, priorizando a quien tenga menos oportunidades
 * asignadas en este momento — evita que un lead externo quede "huérfano"
 * (sin dueño) hasta que un administrador lo reasigne a mano.
 */
export async function vendedorConMenosCarga(tenantId: string): Promise<string | null> {
  const vendedores = await prisma.usuario.findMany({
    where: { tenantId, rol: "COMERCIAL", activo: true },
    select: { id: true },
    orderBy: { creadoEn: "asc" },
  });
  if (vendedores.length === 0) return null;
  const conteos = await prisma.oportunidad.groupBy({
    by: ["creadoBy"],
    where: { tenantId, creadoBy: { in: vendedores.map(v => v.id) } },
    _count: { _all: true },
  });
  const conteoPorVendedor = new Map(vendedores.map(v => [v.id, 0]));
  for (const c of conteos) {
    if (c.creadoBy) conteoPorVendedor.set(c.creadoBy, c._count._all);
  }
  return vendedores.reduce(
    (minId, v) => (conteoPorVendedor.get(v.id) ?? 0) < (conteoPorVendedor.get(minId) ?? 0) ? v.id : minId,
    vendedores[0].id,
  );
}

/**
 * `creadoBy` undefined = asignación por carga; null = sin dueño; un id = ese
 * usuario (el llamador ya verificó que es del tenant).
 */
export async function crearLead(tenantId: string, datos: DatosLead, opciones: { creadoBy?: string | null } = {}) {
  // Evita duplicar la misma empresa si el mismo formulario se envía dos
  // veces (ej. doble clic) — reutiliza la empresa existente por email exacto.
  let empresaId: string;
  const empresaExistente = datos.empresaEmail
    ? await prisma.empresa.findFirst({ where: { tenantId, email: datos.empresaEmail, eliminadoEn: null } })
    : null;

  if (empresaExistente) {
    empresaId = empresaExistente.id;
  } else {
    const empresa = await prisma.empresa.create({
      data: {
        nombre: datos.empresaNombre.trim(),
        email: datos.empresaEmail?.trim() || null,
        telefono: datos.empresaTelefono?.trim() || null,
        sector: datos.empresaSector?.trim() || null,
        tenantId,
      },
    });
    empresaId = empresa.id;
  }

  let contactoId: string | null = null;
  if (datos.contactoNombre?.trim()) {
    const contacto = await prisma.contacto.create({
      data: {
        nombre: datos.contactoNombre.trim(),
        email: datos.contactoEmail?.trim() || null,
        telefono: datos.contactoTelefono?.trim() || null,
        cargo: datos.contactoCargo?.trim() || null,
        empresaId,
        tenantId,
      },
    });
    contactoId = contacto.id;
  }

  const creadoBy = opciones.creadoBy !== undefined ? opciones.creadoBy : await vendedorConMenosCarga(tenantId);

  const oportunidad = await prisma.oportunidad.create({
    data: {
      titulo: datos.oportunidadTitulo?.trim() || `Lead — ${datos.empresaNombre.trim()}`,
      valor: datos.oportunidadValor ?? null,
      etapa: "PROSPECTO",
      probabilidad: await probabilidadPara(prisma, tenantId, "PROSPECTO"),
      origenLead: datos.origenLead?.trim() || "Captura externa",
      notas: datos.notas?.trim() || null,
      empresaId,
      contactoId,
      tenantId,
      creadoBy,
    },
  });

  // Un lead entrante es una oportunidad creada: dispara sus automatizaciones
  // (p. ej. asignar la primera tarea de contacto al vendedor). Best-effort.
  // actorId null: el evento no lo dispara un usuario con sesión sino la API.
  await dispararAutomatizaciones({
    evento: "OPORTUNIDAD_CREADA",
    tenantId,
    oportunidad: {
      id: oportunidad.id,
      titulo: oportunidad.titulo,
      empresaId: oportunidad.empresaId,
      contactoId: oportunidad.contactoId,
      creadoBy: oportunidad.creadoBy,
    },
    actorId: null,
  });

  return { empresaId, contactoId, oportunidadId: oportunidad.id, creadoBy };
}
