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
