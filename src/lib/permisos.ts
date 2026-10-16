export function puedeEliminar(rol: string | undefined) {
  return rol === "ADMINISTRADOR" || rol === "GERENTE";
}

export function esComercial(rol: string | undefined) {
  return rol === "COMERCIAL";
}

/** Devuelve `{ creadoBy: userId }` si el usuario es COMERCIAL, `{}` si no. */
export function filtroOwner(rol: string | undefined, userId: string) {
  return esComercial(rol) ? { creadoBy: userId } : {};
}

/**
 * Igual que `filtroOwner` pero para actividades: un COMERCIAL ve las que creó
 * O las que le fueron asignadas como responsable. Admin/Gerente ven todo.
 */
export function filtroOwnerActividad(rol: string | undefined, userId: string) {
  return esComercial(rol)
    ? { OR: [{ creadoBy: userId }, { responsableId: userId }] }
    : {};
}

/**
 * Las actividades que son tarea DE este usuario, sea cual sea su rol: las que
 * tiene como responsable, o las que creó sin responsable. Una tarea que el
 * usuario creó pero asignó a otro ya es del otro. Se usa en los avisos
 * personales ("tienes N vencidas"), donde un gerente no debe recibir las
 * tareas de su equipo como si fueran suyas.
 */
export function filtroActividadPropia(userId: string) {
  return { OR: [{ responsableId: userId }, { responsableId: null, creadoBy: userId }] };
}

/**
 * Alcance de las vistas personales (Bandeja Hoy, Inicio). Por defecto: el
 * Administrador ve las del equipo (controla toda la actividad) y el Gerente
 * las suyas; ambos pueden cambiar con ?alcance=mias | ?alcance=equipo. Un
 * COMERCIAL siempre ve solo lo suyo.
 */
export type Alcance = "mias" | "equipo";

export function alcanceDe(rol: string | undefined, valor: string | string[] | undefined): Alcance {
  if (esComercial(rol)) return "mias";
  if (valor === "mias" || valor === "equipo") return valor;
  return rol === "ADMINISTRADOR" ? "equipo" : "mias";
}

/** Filtro de actividades según el alcance: las propias, o las que el rol puede ver. */
export function filtroActividadAlcance(rol: string | undefined, userId: string, alcance: Alcance) {
  return alcance === "equipo" ? filtroOwnerActividad(rol, userId) : filtroActividadPropia(userId);
}

/** Verifica si un módulo opcional (Tenant.modulos) está activo. */
export function moduloActivo(modulos: unknown, key: string): boolean {
  if (!modulos || typeof modulos !== "object") return false;
  return (modulos as Record<string, unknown>)[key] === true;
}
