/**
 * Enlace para agendar reuniones (/agendar/<token>): el cliente elige una hora
 * libre del vendedor y la reunión queda creada en su Agenda del CRM.
 *
 * - El horario lo define cada usuario en Mi perfil (AgendaConfig). Todas las
 *   horas son de Bogotá (UTC-5 fijo).
 * - "Ocupado" = reuniones, llamadas y visitas pendientes del usuario en la
 *   Agenda (las tareas y correos no bloquean). Cuando se conecte Google
 *   Calendar, sus eventos se sumarán aquí.
 * - La reserva vuelve a calcular los horarios en el servidor: solo se acepta
 *   una hora que esté libre en ese momento.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { medianocheBogota, diaSemanaBogota } from "@/lib/fecha-bogota";

export const DURACIONES = [15, 30, 45, 60, 90] as const;

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

export const agendaConfigSchema = z.object({
  dias: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un día").max(7),
  desde: hora,
  hasta: hora,
  duracion: z.number().int().refine(n => (DURACIONES as readonly number[]).includes(n), "Duración inválida"),
  anticipacionHoras: z.number().int().min(0).max(72),
  diasAdelante: z.number().int().min(1).max(30),
}).refine(c => minutos(c.desde) + c.duracion <= minutos(c.hasta), { message: "El horario no alcanza para una reunión", path: ["hasta"] });

export type AgendaConfig = z.infer<typeof agendaConfigSchema>;

export const AGENDA_POR_DEFECTO: AgendaConfig = {
  dias: [1, 2, 3, 4, 5],
  desde: "09:00",
  hasta: "17:00",
  duracion: 30,
  anticipacionHoras: 4,
  diasAdelante: 14,
};

/** Configuración guardada (o la de fábrica si falta o está dañada). */
export function configDe(json: unknown): AgendaConfig {
  const r = agendaConfigSchema.safeParse(json);
  return r.success ? r.data : AGENDA_POR_DEFECTO;
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type Intervalo = { inicio: Date; fin: Date };
export type DiaConHorarios = { fecha: Date; horarios: Date[] };

/** Horas libres por día (solo los días que tienen alguna). Función pura. */
export function calcularHorarios(config: AgendaConfig, ocupados: Intervalo[], ahora: Date): DiaConHorarios[] {
  const minimo = ahora.getTime() + config.anticipacionHoras * 3600_000;
  const durMs = config.duracion * 60_000;
  const desde = minutos(config.desde);
  const hasta = minutos(config.hasta);
  const dias: DiaConHorarios[] = [];

  for (let d = 0; d < config.diasAdelante; d++) {
    const medianoche = medianocheBogota(d, ahora);
    if (!config.dias.includes(diaSemanaBogota(medianoche))) continue;
    const horarios: Date[] = [];
    for (let m = desde; m + config.duracion <= hasta; m += config.duracion) {
      const inicio = medianoche.getTime() + m * 60_000;
      const fin = inicio + durMs;
      if (inicio < minimo) continue;
      if (ocupados.some(o => inicio < o.fin.getTime() && fin > o.inicio.getTime())) continue;
      horarios.push(new Date(inicio));
    }
    if (horarios.length) dias.push({ fecha: medianoche, horarios });
  }
  return dias;
}

// Cuánto ocupa cada tipo de actividad en la agenda (la Agenda no guarda la hora
// de fin). Las reuniones ocupan la duración que el vendedor eligió para su enlace.
const OCUPA_MIN: Record<string, number> = { VISITA_COMERCIAL: 60, VISITA_TECNICA: 60, LLAMADA: 30 };

/** Reuniones, llamadas y visitas pendientes del usuario entre dos instantes. */
export async function ocupadosDelUsuario(
  tenantId: string, usuarioId: string, desde: Date, hasta: Date, duracionReunion = 60,
): Promise<Intervalo[]> {
  const acts = await prisma.actividad.findMany({
    where: {
      tenantId,
      completada: false,
      estado: { not: "COMPLETADA" },
      tipo: { in: ["REUNION", "LLAMADA", "VISITA_COMERCIAL", "VISITA_TECNICA"] },
      fecha: { gte: new Date(desde.getTime() - 2 * 3600_000), lt: hasta },
      OR: [{ responsableId: usuarioId }, { responsableId: null, creadoBy: usuarioId }],
    },
    select: { fecha: true, tipo: true },
  });
  const minutosDe = (tipo: string) => (tipo === "REUNION" ? duracionReunion : OCUPA_MIN[tipo] ?? 30);
  return acts.map(a => ({ inicio: a.fecha, fin: new Date(a.fecha.getTime() + minutosDe(a.tipo) * 60_000) }));
}

/** El usuario dueño de un enlace activo, con lo que la página pública necesita. */
export async function usuarioDelEnlace(token: string) {
  if (!/^[0-9a-f]{24,64}$/.test(token)) return null;
  return prisma.usuario.findFirst({
    where: { tokenAgenda: token, activo: true, tenant: { activo: true } },
    select: {
      id: true, nombre: true, email: true, tenantId: true, agendaConfig: true,
      tenant: { select: { nombre: true, logoUrl: true, colorMarca: true, emailsActivos: true } },
    },
  });
}

/** Horas libres del dueño del enlace a partir de ahora. */
export async function horariosDelEnlace(u: { id: string; tenantId: string; agendaConfig: unknown }, ahora = new Date()) {
  const config = configDe(u.agendaConfig);
  const hasta = medianocheBogota(config.diasAdelante, ahora);
  const ocupados = await ocupadosDelUsuario(u.tenantId, u.id, ahora, hasta, config.duracion);
  return { config, dias: calcularHorarios(config, ocupados, ahora) };
}
