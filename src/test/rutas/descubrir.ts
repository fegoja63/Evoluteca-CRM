/**
 * Encuentra TODAS las rutas de API recorriendo el disco.
 *
 * Se descubren en vez de listarse a mano a proposito: una ruta nueva queda
 * cubierta por el barrido sin que nadie tenga que acordarse de registrarla.
 * Un manifiesto escrito a mano se desactualiza el primer dia de vacaciones.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const METODOS_HTTP = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;
export type MetodoHttp = (typeof METODOS_HTTP)[number];

export type RutaDescubierta = {
  /** Como se ve en la URL: "/api/oportunidades/[id]" */
  ruta: string;
  /** Path absoluto del route.ts, para importarlo. */
  archivo: string;
  /** Nombres de los segmentos dinamicos: ["id"], ["tipo","id"]... */
  params: string[];
};

const RAIZ_API = path.resolve(process.cwd(), "src/app/api");

export function descubrirRutas(): RutaDescubierta[] {
  const encontradas: RutaDescubierta[] = [];

  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completo);
      } else if (entrada.name === "route.ts") {
        const relativo = path.relative(path.resolve(process.cwd(), "src/app"), path.dirname(completo));
        const ruta = "/" + relativo.split(path.sep).join("/");
        const params = [...ruta.matchAll(/\[(?:\.\.\.)?(\w+)\]/g)].map((m) => m[1]);
        encontradas.push({ ruta, archivo: completo, params });
      }
    }
  };

  recorrer(RAIZ_API);
  return encontradas.sort((a, b) => a.ruta.localeCompare(b.ruta));
}

/**
 * Importa el route.ts y devuelve los handlers HTTP que exporta.
 *
 * Se importa de verdad en vez de leer el archivo con expresiones regulares:
 * asi se detecta tambien un handler re-exportado desde otro modulo, y de paso
 * un route.ts que ni siquiera compila.
 */
export async function cargarHandlers(archivo: string) {
  const modulo = (await import(/* @vite-ignore */ pathToFileURL(archivo).href)) as Record<
    string,
    unknown
  >;

  const handlers: Partial<Record<MetodoHttp, Function>> = {};
  for (const metodo of METODOS_HTTP) {
    if (typeof modulo[metodo] === "function") handlers[metodo] = modulo[metodo] as Function;
  }
  return handlers;
}

/**
 * Valores de relleno para los segmentos dinamicos.
 *
 * El barrido sin sesion no necesita ids reales: la ruta debe responder 401
 * ANTES de mirarlos siquiera. Si alguna se cae con estos valores, es justamente
 * lo que interesa descubrir — significa que hace trabajo antes de autenticar.
 */
export function paramsDeRelleno(params: string[]): Record<string, string> {
  const relleno: Record<string, string> = {};
  for (const p of params) relleno[p] = "valor-de-prueba";
  return relleno;
}
