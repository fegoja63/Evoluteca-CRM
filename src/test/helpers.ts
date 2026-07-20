/**
 * Utilidades para invocar rutas de API desde las pruebas.
 *
 * En el App Router de Next un `route.ts` exporta funciones normales (GET,
 * POST...). No hace falta levantar un servidor: se importan y se llaman. Eso
 * hace que estas pruebas cuesten milisegundos, no segundos.
 */
import type { RolUsuario } from "@prisma/client";
import { usarSesion, type SesionPrueba } from "./auth-falso";
import { A, B } from "./sembrar";

type Molde = typeof A | typeof B;

/** Construye la sesion de un rol concreto dentro de un tenant concreto. */
export function sesionDe(molde: Molde, rol: RolUsuario): SesionPrueba {
  const id =
    rol === "ADMINISTRADOR" ? molde.admin : rol === "GERENTE" ? molde.gerente : molde.comercial;

  return {
    user: {
      id,
      name: id,
      email: `${id}@${molde.tenantId}.test`,
      rol,
      tenantId: molde.tenantId,
      tenantNombre: molde.tenantId,
      aceptoTerminosEn: new Date().toISOString(),
    },
  };
}

/** Deja "conectado" a ese rol de ese tenant para las llamadas que siguen. */
export function comoUsuario(molde: Molde, rol: RolUsuario) {
  usarSesion(sesionDe(molde, rol));
}

/** Deja la sesion vacia: simula a alguien que no ha iniciado sesion. */
export function sinSesion() {
  usarSesion(null);
}

type Handler = (peticion: Request, contexto: { params: Record<string, string> }) => Promise<Response>;

type Opciones = {
  params?: Record<string, string>;
  /** Se serializa como JSON en el cuerpo. */
  body?: unknown;
  /** Se agrega como query string: { todas: "1" } -> ?todas=1 */
  query?: Record<string, string>;
};

/**
 * Invoca un handler de ruta y devuelve el estado y el cuerpo ya parseado.
 *
 * `cuerpo` queda en null si la respuesta no trae JSON — asi una prueba que
 * espera 404 no revienta al intentar parsear una respuesta vacia.
 */
export async function llamar(handler: Handler, opciones: Opciones = {}) {
  const { params = {}, body, query } = opciones;

  const url = new URL("http://pruebas.local/api");
  for (const [clave, valor] of Object.entries(query ?? {})) {
    url.searchParams.set(clave, valor);
  }

  const peticion = new Request(url, {
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });

  const respuesta = await handler(peticion, { params });

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.clone().json();
  } catch {
    // Respuesta sin JSON (204, un PDF, un error de infraestructura). Se deja null.
  }

  return { status: respuesta.status, cuerpo, respuesta };
}
