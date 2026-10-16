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

/** Verifica si un módulo opcional (Tenant.modulos) está activo. */
export function moduloActivo(modulos: unknown, key: string): boolean {
  if (!modulos || typeof modulos !== "object") return false;
  return (modulos as Record<string, unknown>)[key] === true;
}
