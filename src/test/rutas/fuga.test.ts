/**
 * Barrido de fuga de datos entre clientes.
 *
 * La idea es una sola, y no necesita saber nada de cada ruta en particular:
 *
 *   Si quien pregunta es el cliente B, en la respuesta no puede aparecer
 *   NI UN identificador del cliente A.
 *
 * Eso permite barrer las rutas de listado sin escribir datos de ejemplo para
 * cada una. No sustituye a las pruebas especificas (ver oportunidades.test.ts,
 * que ademas comprueba contra la base que no se escribio nada), pero cubre de
 * un golpe toda la superficie de lectura.
 *
 * Se barren las rutas GET sin parametros dinamicos: las de detalle necesitan
 * un id real de cada tipo de entidad y se cubren aparte.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { descubrirRutas, cargarHandlers } from "./descubrir";
import { RUTAS_SIN_SESION, RUTAS_NO_INVOCADAS } from "./excepciones";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";

/** Todo lo que identifica al cliente A y jamas debe salir en una respuesta a B. */
const HUELLAS_DE_A = [
  A.tenantId,
  A.admin,
  A.gerente,
  A.comercial,
  A.empresa,
  A.contacto,
  A.oportunidadDelComercial,
  A.oportunidadAjena,
  "Cliente A",
];

/**
 * Rutas cuya respuesta no es texto legible (Excel, PDF, Word).
 *
 * Se les comprueba igual que no revienten y respondan, pero buscar cadenas
 * dentro de un .xlsx (que es un zip) daria un "no encontrado" enganoso. Su
 * aislamiento hay que probarlo con datos, no con este barrido — queda
 * anotado aqui para que la laguna sea visible y no silenciosa.
 */
const RESPUESTA_BINARIA = /^\/api\/(exportar|manual|plantilla)\//;

const rutas = descubrirRutas();

const candidatas = await Promise.all(
  rutas
    .filter(
      (r) =>
        r.params.length === 0 &&
        !(r.ruta in RUTAS_SIN_SESION) &&
        !(r.ruta in RUTAS_NO_INVOCADAS)
    )
    .map(async (r) => ({ ...r, handlers: await cargarHandlers(r.archivo) }))
);

const casos = candidatas
  .filter((r) => typeof r.handlers.GET === "function")
  .map((r) => ({ ...r, nombre: `GET ${r.ruta}` }));

beforeAll(async () => {
  await sembrar();
  comoUsuario(B, "ADMINISTRADOR");
});

describe("el cliente B nunca recibe datos del cliente A", () => {
  it("hay rutas que barrer", () => {
    expect(casos.length).toBeGreaterThan(10);
  });

  it.each(casos)("$nombre", async ({ handlers, ruta }) => {
    const { status, respuesta } = await llamar(handlers.GET as never, { metodo: "GET" });

    // Un 500 no es una fuga, pero tampoco es un aprobado: significa que no se
    // sabe que habria devuelto la ruta.
    expect(status).not.toBe(500);

    if (RESPUESTA_BINARIA.test(ruta)) return;

    const texto = await respuesta.clone().text();
    const filtradas = HUELLAS_DE_A.filter((huella) => texto.includes(huella));

    expect(
      filtradas,
      `La respuesta a un usuario del cliente B contiene datos del cliente A: ${filtradas.join(", ")}`
    ).toEqual([]);
  });
});
