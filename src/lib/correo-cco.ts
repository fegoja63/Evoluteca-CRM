/**
 * "CCO inteligente": el vendedor pone en copia oculta su dirección personal del
 * CRM (`<buzón>+cco-<token>@…`) al escribirle a un cliente desde su propio
 * correo (Gmail, Outlook, el celular…) y el correo queda registrado solo en la
 * ficha del contacto, sin que el CRM lea su buzón.
 *
 * El cron de correos entrantes recibe esa copia en el buzón de ingest y llama a
 * registrarCorreoCco. Reglas:
 *  - El token identifica al usuario (y con él, la cuenta). Revocable en Mi perfil.
 *  - Solo se registra si el dueño del token participa: es el remitente (correo
 *    ENVIADO) o está entre los destinatarios (RECIBIDO, p. ej. "responder a
 *    todos" con el CCO). Así un token filtrado no sirve para meter correos de
 *    terceros en la cuenta.
 *  - Se registra en cada contacto de la cuenta cuyo correo aparezca entre los
 *    participantes (máx. MAX_CONTACTOS), ligado a su negocio abierto más reciente.
 *  - No se duplica si el mismo mensaje ya quedó registrado en ese contacto.
 */
import { prisma } from "@/lib/prisma";
import { construirReplyTo } from "@/lib/correo-inbound";

export const PREFIJO_CCO = "cco-";
const MAX_CONTACTOS = 10;
const MAX_CUERPO = 50_000;

/** Dirección CCO del usuario a partir del buzón de ingest y su token. */
export function direccionCco(ingestBase: string, token: string): string | null {
  return construirReplyTo(ingestBase, `${PREFIJO_CCO}${token}`);
}

/** Si el token de destino es de CCO, devuelve el token del usuario; si no, null. */
export function tokenDeCco(tokenDestino: string | null): string | null {
  if (!tokenDestino?.startsWith(PREFIJO_CCO)) return null;
  const t = tokenDestino.slice(PREFIJO_CCO.length);
  return /^[0-9a-f]{16,64}$/.test(t) ? t : null;
}

const normalizar = (e: string) => e.trim().toLowerCase();

/** ¿La dirección es del buzón de ingest (con o sin sub-dirección)? */
function esDelIngest(direccion: string, ingestBase: string): boolean {
  const d = normalizar(direccion);
  const base = normalizar(ingestBase);
  const [localBase, dominioBase] = base.split("@");
  const [local, dominio] = d.split("@");
  if (!local || !dominio || dominio !== dominioBase) return false;
  return local === localBase || local.startsWith(`${localBase}+`);
}

export type CorreoCco = {
  messageId?: string | null;
  de: string;
  /** To + Cc del mensaje (sin importar mayúsculas). */
  destinatarios: string[];
  asunto: string;
  cuerpo: string;
  fecha?: Date | null;
};

export type ResultadoCco =
  | { estado: "sin-usuario" | "remitente-no-autorizado" | "sin-contacto"; registrados: 0 }
  | { estado: "registrado" | "duplicado"; registrados: number };

export async function registrarCorreoCco(token: string, correo: CorreoCco, ingestBase: string): Promise<ResultadoCco> {
  const usuario = await prisma.usuario.findFirst({
    where: { tokenCco: token, activo: true },
    select: { id: true, email: true, tenantId: true },
  });
  if (!usuario) return { estado: "sin-usuario", registrados: 0 };

  const dueno = normalizar(usuario.email);
  const de = normalizar(correo.de);
  const destinatarios = correo.destinatarios.map(normalizar).filter(d => d.includes("@"));
  const enviadoPorDueno = de === dueno;
  if (!enviadoPorDueno && !destinatarios.includes(dueno)) {
    return { estado: "remitente-no-autorizado", registrados: 0 };
  }

  const participantes = [...new Set([de, ...destinatarios])]
    .filter(d => d !== dueno && !esDelIngest(d, ingestBase));
  if (participantes.length === 0) return { estado: "sin-contacto", registrados: 0 };

  const contactos = await prisma.contacto.findMany({
    where: {
      tenantId: usuario.tenantId,
      eliminadoEn: null,
      OR: participantes.map(email => ({ email: { equals: email, mode: "insensitive" as const } })),
    },
    select: { id: true, email: true, empresaId: true },
    take: MAX_CONTACTOS,
  });
  if (contactos.length === 0) return { estado: "sin-contacto", registrados: 0 };

  const cuerpo = (correo.cuerpo || "(sin contenido)").slice(0, MAX_CUERPO);
  const asunto = correo.asunto.trim().slice(0, 500) || "(sin asunto)";
  let registrados = 0;

  for (const c of contactos) {
    if (correo.messageId) {
      const ya = await prisma.correoRegistrado.findFirst({
        where: { tenantId: usuario.tenantId, contactoId: c.id, proveedorMessageId: correo.messageId },
        select: { id: true },
      });
      if (ya) continue;
    }
    // Negocio abierto más reciente del contacto; si no tiene, el de su empresa.
    const abiertas = { tenantId: usuario.tenantId, eliminadoEn: null, etapa: { notIn: ["GANADA" as const, "PERDIDA" as const] } };
    const oportunidad =
      await prisma.oportunidad.findFirst({ where: { ...abiertas, contactoId: c.id }, orderBy: { creadoEn: "desc" }, select: { id: true } })
      ?? (c.empresaId
        ? await prisma.oportunidad.findFirst({ where: { ...abiertas, empresaId: c.empresaId }, orderBy: { creadoEn: "desc" }, select: { id: true } })
        : null);

    await prisma.correoRegistrado.create({
      data: {
        direccion: enviadoPorDueno ? "ENVIADO" : "RECIBIDO",
        de: correo.de,
        para: enviadoPorDueno ? (c.email ?? destinatarios[0] ?? "") : usuario.email,
        asunto,
        cuerpo,
        proveedorMessageId: correo.messageId ?? null,
        fecha: correo.fecha ?? new Date(),
        creadoBy: enviadoPorDueno ? usuario.id : null,
        tenantId: usuario.tenantId,
        contactoId: c.id,
        empresaId: c.empresaId,
        oportunidadId: oportunidad?.id ?? null,
      },
    });
    registrados++;
  }
  return { estado: registrados > 0 ? "registrado" : "duplicado", registrados };
}
