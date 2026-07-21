/**
 * Utilidades para invocar rutas de API desde las pruebas.
 *
 * En el App Router de Next un `route.ts` exporta funciones normales (GET,
 * POST...). No hace falta levantar un servidor: se importan y se llaman. Eso
 * hace que estas pruebas cuesten milisegundos, no segundos.
 */
import { NextRequest } from "next/server";
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

/**
 * Firma de un handler de ruta.
 *
 * El contexto va sin tipar a proposito: cada route.ts declara sus propios
 * params ({ id: string }, { tipo: string; id: string }...), y con un
 * Record<string, string> generico TypeScript los rechaza por contravarianza.
 * Tiparlo aqui obligaria a poner un `as never` en cada llamada de cada
 * prueba, que es peor: esconde errores de verdad ademas de este.
 */
// La peticion tampoco se tipa: `llamar` construye un NextRequest (que ES un
// Request), pero cada route.ts declara el que le conviene y TypeScript no
// acepta que uno valga por el otro en la posicion de parametro.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (peticion: any, contexto: any) => Promise<Response>;

type Opciones = {
  params?: Record<string, string>;
  /** Se serializa como JSON en el cuerpo. */
  body?: unknown;
  /** Se agrega como query string: { todas: "1" } -> ?todas=1 */
  query?: Record<string, string>;
  /**
   * Metodo HTTP. Por defecto se deduce del cuerpo (GET sin cuerpo, POST con).
   * El barrido si lo necesita explicito, porque invoca PATCH y DELETE.
   */
  metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
};

/**
 * Invoca un handler de ruta y devuelve el estado y el cuerpo ya parseado.
 *
 * `cuerpo` queda en null si la respuesta no trae JSON — asi una prueba que
 * espera 404 no revienta al intentar parsear una respuesta vacia.
 */
export async function llamar(handler: Handler, opciones: Opciones = {}) {
  const { params = {}, body, query } = opciones;
  const metodo = opciones.metodo ?? (body === undefined ? "GET" : "POST");

  const url = new URL("http://pruebas.local/api");
  for (const [clave, valor] of Object.entries(query ?? {})) {
    url.searchParams.set(clave, valor);
  }

  // GET no admite cuerpo (construir el Request lanza). DELETE si, y hay rutas
  // que lo usan. Al resto se les manda "{}" cuando no se dio nada, porque casi
  // todos los handlers arrancan con request.json().
  const admiteCuerpo = metodo !== "GET";
  const cuerpoEnviado = admiteCuerpo ? JSON.stringify(body ?? {}) : undefined;

  // NextRequest y no Request a secas: varias rutas usan req.nextUrl, que solo
  // existe en el tipo de Next. Ademas es lo que reciben en produccion.
  const peticion = new NextRequest(url, {
    method: metodo,
    ...(cuerpoEnviado === undefined
      ? {}
      : { body: cuerpoEnviado, headers: { "content-type": "application/json" } }),
  });

  // Los params van como PROMESA, que es como se los entrega Next 16.
  //
  // Antes se pasaba el objeto pelado y funcionaba igual, porque `await` sobre
  // un objeto normal lo devuelve tal cual. Pero eso hacia las pruebas ciegas
  // justo a lo que importaba en la migracion: una ruta que siguiera leyendo
  // `params.id` de forma sincrona habria pasado las pruebas y fallado en
  // produccion, donde recibe una promesa y `params.id` seria undefined.
  const respuesta = await handler(peticion, { params: Promise.resolve(params) });

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.clone().json();
  } catch {
    // Respuesta sin JSON (204, un PDF, un error de infraestructura). Se deja null.
  }

  return { status: respuesta.status, cuerpo, respuesta };
}
