// Lógica pura de automatizaciones: sin Prisma ni React, para poder probarla
// sola y compartirla entre cliente y servidor.

export const EVENTOS = ["OPORTUNIDAD_CAMBIA_ETAPA", "OPORTUNIDAD_CREADA"] as const;
export type EventoAutomatizacion = (typeof EVENTOS)[number];

export const ACCIONES = ["CREAR_TAREA", "ENVIAR_CORREO"] as const;
export type AccionAutomatizacion = (typeof ACCIONES)[number];

export const EVENTO_LABEL: Record<EventoAutomatizacion, string> = {
  OPORTUNIDAD_CAMBIA_ETAPA: "Una oportunidad cambia de etapa",
  OPORTUNIDAD_CREADA: "Se crea una oportunidad",
};

export const ACCION_LABEL: Record<AccionAutomatizacion, string> = {
  CREAR_TAREA: "Crear una tarea de seguimiento",
  ENVIAR_CORREO: "Enviar un correo",
};

// Tipos de actividad que tiene sentido crear desde una automatización (se dejan
// fuera las visitas, que son propias de los verticales de teatro/salones).
export const TIPOS_TAREA = ["TAREA", "LLAMADA", "REUNION", "EMAIL"] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];

export const TIPO_TAREA_LABEL: Record<TipoTarea, string> = {
  TAREA: "Tarea",
  LLAMADA: "Llamada",
  REUNION: "Reunión",
  EMAIL: "Email",
};

// Valor centinela para "el dueño (vendedor) de la oportunidad". Cualquier otro
// valor de `responsable` es el id de un usuario concreto.
export const RESPONSABLE_DUENO = "DUENO";

export const DESTINATARIOS = ["DUENO", "GERENTES"] as const;
export type Destinatario = (typeof DESTINATARIOS)[number];

export const DESTINATARIO_LABEL: Record<Destinatario, string> = {
  DUENO: "El dueño del negocio",
  GERENTES: "Los gerentes y administradores",
};

export type ConfigCrearTarea = {
  titulo: string;
  tipo: TipoTarea;
  diasPlazo: number;
  responsable: string; // "DUENO" o un userId
};

export type ConfigEnviarCorreo = {
  destinatario: Destinatario;
  asunto: string;
  cuerpo: string;
};

// Reemplaza los marcadores {oportunidad} y {cliente} en un texto de plantilla.
export function aplicarPlantilla(texto: string, ctx: { oportunidad?: string; cliente?: string }): string {
  return texto
    .replace(/\{oportunidad\}/gi, ctx.oportunidad ?? "")
    .replace(/\{cliente\}/gi, ctx.cliente ?? "");
}

export type ResultadoConfig =
  | { ok: true; accion: "CREAR_TAREA"; config: ConfigCrearTarea }
  | { ok: true; accion: "ENVIAR_CORREO"; config: ConfigEnviarCorreo }
  | { ok: false; error: string };

// Valida y normaliza la configuración de una acción según su tipo. La
// pertenencia del userId de `responsable` al tenant NO se valida aquí (es pura);
// lo hace la ruta de la API.
export function validarConfigAccion(accion: string, raw: unknown): ResultadoConfig {
  const c = (raw ?? {}) as Record<string, unknown>;

  if (accion === "CREAR_TAREA") {
    const titulo = String(c.titulo ?? "").trim();
    if (!titulo) return { ok: false, error: "La tarea necesita un título." };
    if (titulo.length > 200) return { ok: false, error: "El título de la tarea es demasiado largo (máx. 200)." };

    const tipo = String(c.tipo ?? "TAREA") as TipoTarea;
    if (!TIPOS_TAREA.includes(tipo)) return { ok: false, error: "Tipo de tarea inválido." };

    const diasPlazo = Number(c.diasPlazo ?? 0);
    if (!Number.isInteger(diasPlazo) || diasPlazo < 0 || diasPlazo > 365) {
      return { ok: false, error: "El plazo debe ser un número entero de días entre 0 y 365." };
    }

    const responsable = String(c.responsable ?? RESPONSABLE_DUENO).trim();
    if (!responsable) return { ok: false, error: "Falta el responsable de la tarea." };

    return { ok: true, accion: "CREAR_TAREA", config: { titulo, tipo, diasPlazo, responsable } };
  }

  if (accion === "ENVIAR_CORREO") {
    const destinatario = String(c.destinatario ?? "") as Destinatario;
    if (!DESTINATARIOS.includes(destinatario)) return { ok: false, error: "Destinatario inválido." };

    const asunto = String(c.asunto ?? "").trim();
    if (!asunto) return { ok: false, error: "El correo necesita un asunto." };
    if (asunto.length > 200) return { ok: false, error: "El asunto es demasiado largo (máx. 200)." };

    const cuerpo = String(c.cuerpo ?? "").trim();
    if (!cuerpo) return { ok: false, error: "El correo necesita un cuerpo." };
    if (cuerpo.length > 5000) return { ok: false, error: "El cuerpo es demasiado largo (máx. 5000)." };

    return { ok: true, accion: "ENVIAR_CORREO", config: { destinatario, asunto, cuerpo } };
  }

  return { ok: false, error: "Acción inválida." };
}
