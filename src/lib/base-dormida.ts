/**
 * Base dormida: clientes sin negocio en curso y sin movimiento en X días.
 * La IA le redacta a cada uno un mensaje según lo que pasó con él (qué compró,
 * por qué se perdió, de qué se habló) y el vendedor los revisa y los envía en
 * lote: por correo (sale solo) o por WhatsApp (queda la tarea en su Bandeja
 * Hoy con el mensaje listo, igual que en las secuencias).
 *
 * "Movimiento" = la última actividad ya ocurrida, correo, negocio creado o
 * cerrado. Al enviar, el correo o la tarea cuentan como movimiento: el cliente
 * sale de la lista y no se le vuelve a escribir enseguida.
 *
 * Este archivo es puro (lo importa también la pantalla); la carga desde la
 * base está en base-dormida-carga.ts.
 */
import { z } from "zod";

export const DIAS_OPCIONES = [60, 90, 180, 365] as const;
export const DIAS_POR_DEFECTO = 90;
export const MAX_LOTE = 10;

export function diasValidos(v: unknown): number {
  const n = Number(v);
  return (DIAS_OPCIONES as readonly number[]).includes(n) ? n : DIAS_POR_DEFECTO;
}

/** Días completos entre una fecha y ahora. */
export function diasDesde(fecha: Date, ahora: Date): number {
  return Math.max(0, Math.floor((ahora.getTime() - fecha.getTime()) / 86_400_000));
}

/** La fecha más reciente de las que haya (null si ninguna). */
export function ultimoMovimiento(fechas: (Date | null | undefined)[]): Date | null {
  const validas = fechas.filter((f): f is Date => f instanceof Date);
  return validas.length ? new Date(Math.max(...validas.map(f => f.getTime()))) : null;
}

export type ClienteDormido = {
  empresaId: string;
  nombre: string;
  diasQuieto: number;
  /** Último negocio con este cliente, para darle contexto al vendedor. */
  ultimoNegocio: { titulo: string; etapa: string; valor: number | null } | null;
  compro: boolean;
  contacto: { id: string; nombre: string; email: string | null; telefono: string | null } | null;
};

// ── Lo que devuelve la IA ───────────────────────────────────────────────────

export const borradoresSchema = z.object({
  mensajes: z.array(z.object({
    empresaId: z.string(),
    gancho: z.string(),
    asunto: z.string(),
    correo: z.string(),
    whatsapp: z.string(),
  })),
});
export type Borrador = z.infer<typeof borradoresSchema>["mensajes"][number];

/** Solo los clientes pedidos, una vez cada uno, recortados. */
export function limpiarBorradores(b: z.infer<typeof borradoresSchema>, pedidos: string[]): Borrador[] {
  const vistos = new Set<string>();
  return b.mensajes
    .filter(m => pedidos.includes(m.empresaId) && !vistos.has(m.empresaId) && vistos.add(m.empresaId))
    .map(m => ({
      empresaId: m.empresaId,
      gancho: m.gancho.trim().slice(0, 300),
      asunto: m.asunto.trim().slice(0, 200),
      correo: m.correo.trim().slice(0, 3000),
      whatsapp: m.whatsapp.trim().slice(0, 1000),
    }));
}

// ── Envío ───────────────────────────────────────────────────────────────────

export const envioSchema = z.object({
  items: z.array(z.object({
    empresaId: z.string().min(1),
    contactoId: z.string().min(1),
    canal: z.enum(["EMAIL", "WHATSAPP"]),
    asunto: z.string().trim().max(200).default(""),
    cuerpo: z.string().trim().min(1, "Cada mensaje necesita texto").max(5000),
  }).refine(i => i.canal !== "EMAIL" || i.asunto.length > 0, { message: "Cada correo necesita asunto", path: ["asunto"] }))
    .min(1, "Elija al menos un mensaje").max(MAX_LOTE, `Máximo ${MAX_LOTE} por envío`),
});
