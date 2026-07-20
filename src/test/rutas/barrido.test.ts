/**
 * Barrido de TODAS las rutas de API.
 *
 * Las rutas se descubren del disco, no de una lista: agregar un route.ts nuevo
 * lo mete automaticamente en este barrido. Si esa ruta olvida autenticar, la
 * prueba se pone roja sin que nadie haya escrito una linea para cubrirla.
 *
 * Aqui se verifica lo que se puede verificar SIN datos de ejemplo por ruta:
 *
 *   1. Todo route.ts importa sin explotar.
 *   2. Sin sesion, toda ruta responde 401 (salvo las exentas, con motivo).
 *   3. Las exenciones declaradas corresponden a rutas que existen de verdad.
 *
 * El aislamiento por cliente en cada ruta concreta se prueba aparte, con datos
 * sembrados — ver oportunidades.test.ts, que es el molde.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  descubrirRutas,
  cargarHandlers,
  paramsDeRelleno,
  METODOS_HTTP,
  type MetodoHttp,
} from "./descubrir";
import { RUTAS_SIN_SESION, RUTAS_NO_INVOCADAS } from "./excepciones";
import { llamar, sinSesion } from "../helpers";

const rutas = descubrirRutas();

// Se cargan todas por adelantado para que un fallo de importacion se reporte
// como lo que es (una ruta rota) y no como un error suelto a mitad del barrido.
const cargadas = await Promise.all(
  rutas.map(async (r) => {
    try {
      return { ...r, handlers: await cargarHandlers(r.archivo), fallo: null as unknown };
    } catch (error) {
      return { ...r, handlers: {}, fallo: error };
    }
  })
);

const invocables = cargadas.filter((r) => !(r.ruta in RUTAS_NO_INVOCADAS));

describe("inventario", () => {
  it("hay rutas que barrer (si esto falla, el descubrimiento se rompio)", () => {
    expect(rutas.length).toBeGreaterThan(50);
  });

  it.each(cargadas)("$ruta importa sin errores", ({ fallo }) => {
    expect(fallo).toBeNull();
  });

  it.each(invocables)("$ruta exporta al menos un metodo HTTP", ({ handlers }) => {
    expect(Object.keys(handlers).length).toBeGreaterThan(0);
  });
});

describe("sin sesion, toda ruta responde 401", () => {
  beforeAll(() => sinSesion());

  const casos = invocables
    .filter((r) => !(r.ruta in RUTAS_SIN_SESION))
    .flatMap((r) =>
      (Object.keys(r.handlers) as MetodoHttp[]).map((metodo) => ({
        ...r,
        metodo,
        nombre: `${metodo} ${r.ruta}`,
      }))
    );

  it.each(casos)("$nombre", async ({ handlers, metodo, params }) => {
    const handler = handlers[metodo]!;

    const { status } = await llamar(handler as never, {
      metodo,
      params: paramsDeRelleno(params),
    });

    // 401 ("no se quien eres") es lo esperado. Se acepta tambien 403 porque
    // algunas rutas juntan "sin sesion" y "sin permiso" en una sola respuesta
    // — la diferencia es de forma, no de seguridad: en ambos casos se denego
    // antes de hacer nada.
    //
    // Lo que NO se acepta es un 2xx (paso sin credenciales) ni un 500 (se cayo
    // haciendo trabajo ANTES de comprobar quien llama, que es un fallo propio
    // y no queremos que pase por bueno).
    expect([401, 403]).toContain(status);
  });
});

describe("las exenciones no envejecen", () => {
  // Sin esto, una ruta renombrada dejaria su exencion huerfana en el archivo y
  // la ruta nueva entraria al barrido... o peor, alguien copiaria la exencion
  // vieja sin entender por que estaba.
  const declaradas = [...Object.keys(RUTAS_SIN_SESION), ...Object.keys(RUTAS_NO_INVOCADAS)];
  const existentes = new Set(rutas.map((r) => r.ruta));

  it.each(declaradas)("%s sigue existiendo en src/app/api", (ruta) => {
    expect(existentes.has(ruta)).toBe(true);
  });

  it.each(Object.entries(RUTAS_SIN_SESION))(
    "%s declara guardian y motivo",
    (_ruta, exencion) => {
      expect(exencion.guardian.trim().length).toBeGreaterThan(0);
      expect(exencion.motivo.trim().length).toBeGreaterThan(20);
    }
  );
});
