/**
 * Sesion simulada — solo existe durante las pruebas.
 *
 * vitest.config.ts redirige "@/lib/auth" a este archivo, asi que cuando una
 * ruta llama a `auth()` recibe la sesion que la prueba haya puesto, sin
 * cookies, sin JWT y sin servidor.
 *
 * Ojo con lo que esto implica: aqui NO se prueba el login. Se prueba que,
 * DADA una sesion valida de cierto tenant y cierto rol, la ruta muestre
 * exactamente lo que corresponde. El login real vive en src/lib/auth.ts y se
 * prueba aparte.
 */
import type { RolUsuario } from "@prisma/client";

export type SesionPrueba = {
  user: {
    id: string;
    name: string;
    email: string;
    rol: RolUsuario;
    tenantId: string;
    tenantNombre: string;
    aceptoTerminosEn: string | null;
  };
} | null;

let sesionActual: SesionPrueba = null;

/** Lo que ven las rutas. Misma firma que el `auth()` de NextAuth. */
export async function auth(): Promise<SesionPrueba> {
  return sesionActual;
}

/** Cambia quien esta "conectado". `null` simula a un visitante sin sesion. */
export function usarSesion(sesion: SesionPrueba) {
  sesionActual = sesion;
}

// NextAuth exporta esto ademas de `auth`. Ninguna ruta de API deberia usarlos,
// pero si algun import los pide, que falle con un mensaje claro y no con un
// "undefined is not a function" a media prueba.
const noDisponible = (nombre: string) => () => {
  throw new Error(`${nombre}() no esta disponible en pruebas: la sesion se simula con usarSesion().`);
};

export const handlers = { GET: noDisponible("handlers.GET"), POST: noDisponible("handlers.POST") };
export const signIn = noDisponible("signIn");
export const signOut = noDisponible("signOut");
