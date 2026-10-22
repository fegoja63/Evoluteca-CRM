/**
 * Mapa de decisores: quién participa en la decisión de compra de una
 * oportunidad, con qué papel y qué postura. En ventas B2B largas compran
 * varias personas; si el vendedor solo habla con una, el negocio se cae.
 */
import { z } from "zod";

export const ROLES_DECISION = ["DECIDE", "INFLUYE", "USA", "FRENA"] as const;
export const POSTURAS_DECISION = ["A_FAVOR", "NEUTRAL", "EN_CONTRA", "SIN_CONTACTAR"] as const;
export type RolDecision = (typeof ROLES_DECISION)[number];
export type PosturaDecision = (typeof POSTURAS_DECISION)[number];

export const ROL_LABEL: Record<RolDecision, { label: string; ayuda: string }> = {
  DECIDE: { label: "Decide", ayuda: "Aprueba la compra o firma" },
  INFLUYE: { label: "Influye", ayuda: "Recomienda o evalúa (compras, finanzas, técnico)" },
  USA: { label: "Usa", ayuda: "Va a usar lo que se venda" },
  FRENA: { label: "Frena", ayuda: "Se opone o puede bloquear la compra" },
};

export const POSTURA_LABEL: Record<PosturaDecision, string> = {
  A_FAVOR: "A favor",
  NEUTRAL: "Neutral",
  EN_CONTRA: "En contra",
  SIN_CONTACTAR: "Sin contactar",
};

export const AVISO_SIN_DECISOR = "No has identificado quién decide";

// Palabras del cargo que sugieren el papel. Es solo una sugerencia: el
// vendedor la cambia con un clic.
const CARGOS_DECIDE = /\b(gerente|director|directora|ceo|presidente|presidenta|rector|rectora|due[ñn]o|due[ñn]a|propietari[oa]|socio|socia|fundador|fundadora|vicepresidente|vp|alcalde|secretari[oa] general)\b/i;
const CARGOS_USA = /\b(coordinador|coordinadora|analista|asistente|auxiliar|operador|operadora|t[ée]cnico|t[ée]cnica|docente|profesor|profesora|usuario|usuaria|supervisor|supervisora)\b/i;

/** Papel sugerido según el cargo del contacto. */
export function sugerirRol(cargo: string | null | undefined): RolDecision {
  const c = cargo ?? "";
  if (CARGOS_DECIDE.test(c)) return "DECIDE";
  if (CARGOS_USA.test(c)) return "USA";
  return "INFLUYE";
}

/** True si el negocio sigue abierto y nadie del mapa está marcado como "Decide". */
export function faltaQuienDecide(participantes: { rol: string }[], etapa: string): boolean {
  if (etapa === "GANADA" || etapa === "PERDIDA") return false;
  return !participantes.some(p => p.rol === "DECIDE");
}

/** El mapa como texto, para darle contexto a la IA. */
export function mapaATexto(participantes: { rol: string; postura: string; contacto: { nombre: string; cargo: string | null } }[]): string {
  if (!participantes.length) return "Sin mapa de decisores registrado.";
  return participantes
    .map(p => `- ${p.contacto.nombre}${p.contacto.cargo ? ` (${p.contacto.cargo})` : ""}: ${ROL_LABEL[p.rol as RolDecision]?.label ?? p.rol}, ${POSTURA_LABEL[p.postura as PosturaDecision]?.toLowerCase() ?? p.postura}`)
    .join("\n");
}

export const crearParticipanteSchema = z.object({
  contactoId: z.string().min(1, "Elija un contacto"),
  rol: z.enum(ROLES_DECISION).optional(),
  postura: z.enum(POSTURAS_DECISION).optional(),
});

export const editarParticipanteSchema = z.object({
  rol: z.enum(ROLES_DECISION).optional(),
  postura: z.enum(POSTURAS_DECISION).optional(),
}).refine(d => d.rol || d.postura, "Nada que cambiar");
