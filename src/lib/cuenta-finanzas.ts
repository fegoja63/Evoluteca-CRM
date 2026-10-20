/**
 * Cuenta "solo Finanzas": una empresa que compró el Gerente Financiero sin el
 * CRM (`Tenant.soloFinanzas`, lo cambia solo Evoluteca desde el panel interno).
 *
 * Para esas cuentas el menú se reduce a Finanzas y lo administrativo, y el
 * layout del dashboard redirige cualquier otra pantalla a `/dashboard/finanzas`.
 * Los datos del CRM siguen aislados por tenant como siempre: esto ordena lo que
 * el cliente ve, no reemplaza el aislamiento.
 */

export const INICIO_FINANZAS = "/dashboard/finanzas";

// Pantallas que una cuenta solo Finanzas sí usa: el módulo y lo administrativo.
const PERMITIDAS_SOLO_FINANZAS = [
  INICIO_FINANZAS,
  "/dashboard/equipo",
  "/dashboard/configuracion",
  "/dashboard/perfil",
  "/dashboard/ayuda",
  "/dashboard/terminos",
];

/** ¿Puede una cuenta solo Finanzas abrir esta ruta del dashboard? */
export function rutaPermitidaSoloFinanzas(pathname: string): boolean {
  return PERMITIDAS_SOLO_FINANZAS.some(r => pathname === r || pathname.startsWith(`${r}/`));
}
