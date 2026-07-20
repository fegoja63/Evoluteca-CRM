/**
 * Rutas de detalle (/[id]): el cliente B apuntando a datos del cliente A.
 *
 * Estas son las que mas duelen si fallan. Un GET /api/cotizaciones/[id] que no
 * acote por tenant no filtra un nombre suelto: entrega el documento comercial
 * completo de otro cliente, con precios y condiciones.
 *
 * Cada ruta necesita un id real de su tipo de entidad, asi que aqui si hace
 * falta una tabla escrita a mano. La prueba "no queda ninguna ruta /[id] sin
 * cubrir" del final impide que esa tabla se quede atras cuando se agregue una
 * ruta nueva.
 *
 * Ojo con el control de la segunda mitad: sin el, una ruta que respondiera 404
 * SIEMPRE (por estar rota) pasaria por perfectamente aislada.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { descubrirRutas, cargarHandlers, type MetodoHttp } from "./descubrir";
import { RUTAS_SIN_SESION, RUTAS_NO_INVOCADAS } from "./excepciones";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { huellaDelCliente } from "../huella";

/** Que id del cliente A se le pasa a cada ruta. */
const PARAMS_DEL_CLIENTE_A: Record<string, Record<string, string>> = {
  "/api/actividades/[id]": { id: A.actividad },
  "/api/adjuntos/[id]": { id: A.adjunto },
  "/api/contactos/[id]": { id: A.contacto },
  "/api/cotizaciones/[id]": { id: A.cotizacion },
  "/api/cotizaciones/[id]/duplicar": { id: A.cotizacion },
  "/api/cotizaciones/[id]/enviar-email": { id: A.cotizacion },
  "/api/cotizaciones/[id]/pdf": { id: A.cotizacion },
  "/api/cotizaciones/[id]/token": { id: A.cotizacion },
  "/api/empresas/[id]": { id: A.empresa },
  "/api/espectadores/[id]": { id: A.espectador },
  "/api/etapas-pipeline/[id]": { id: A.etapaPipeline },
  "/api/expedientes/[id]": { id: A.expediente },
  "/api/expedientes/[id]/bitacora": { id: A.expediente },
  "/api/expedientes/[id]/horas": { id: A.expediente },
  "/api/expedientes/[id]/terminos": { id: A.expediente },
  "/api/expedientes/horas/[registroId]": { registroId: A.registroHoras },
  "/api/expedientes/terminos/[terminoId]": { terminoId: A.terminoExpediente },
  "/api/funciones/[id]": { id: A.funcion },
  "/api/funciones/[id]/asistencias": { id: A.funcion },
  "/api/funciones/[id]/asistencias/importar": { id: A.funcion },
  "/api/funciones/[id]/nps": { id: A.funcion },
  "/api/funciones/asistencias/[asistenciaId]": { asistenciaId: A.asistencia },
  "/api/funciones/asistencias/[asistenciaId]/marcar-nps-enviado": { asistenciaId: A.asistencia },
  "/api/ia/resumen-cliente/[id]": { id: A.empresa },
  "/api/oportunidades/[id]": { id: A.oportunidadDelComercial },
  "/api/papelera/[tipo]/[id]": { tipo: "empresa", id: A.empresa },
  "/api/plantillas-cotizacion/[id]": { id: A.plantilla },
  "/api/productos/[id]": { id: A.producto },
  "/api/salones/[id]": { id: A.salon },
  "/api/timeline/[empresaId]": { empresaId: A.empresa },
  "/api/usuarios/[id]": { id: A.comercial },
};

/**
 * Rutas con parametro que NO apuntan a un dato de un cliente, con su motivo.
 * El parametro es el nombre de un modulo o un token, no un id de tenant.
 */
const PARAMETRO_NO_ES_DE_CLIENTE: Record<string, string> = {
  "/api/exportar/[modulo]": "El parametro es el nombre del modulo a exportar, no un id.",
  "/api/importar/[modulo]": "El parametro es el nombre del modulo a importar, no un id.",
  "/api/plantilla/[modulo]": "El parametro es el nombre del modulo cuya plantilla se descarga.",
};

const HUELLAS_DE_A = [
  A.tenantId, A.admin, A.gerente, A.comercial, A.empresa, A.contacto,
  A.oportunidadDelComercial, A.oportunidadAjena, A.actividad, A.adjunto,
  A.cotizacion, A.expediente, A.funcion, A.espectador, A.producto, A.salon,
  A.plantilla, "Cliente A",
];

const rutas = descubrirRutas();

const conParametro = rutas.filter(
  (r) =>
    r.params.length > 0 &&
    !(r.ruta in RUTAS_SIN_SESION) &&
    !(r.ruta in RUTAS_NO_INVOCADAS) &&
    !(r.ruta in PARAMETRO_NO_ES_DE_CLIENTE)
);

const casos = (
  await Promise.all(
    conParametro
      .filter((r) => r.ruta in PARAMS_DEL_CLIENTE_A)
      .map(async (r) => ({ ...r, handlers: await cargarHandlers(r.archivo) }))
  )
).flatMap((r) =>
  (Object.keys(r.handlers) as MetodoHttp[]).map((metodo) => ({
    ...r,
    metodo,
    nombre: `${metodo} ${r.ruta}`,
  }))
);

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
});

describe("el cliente B no alcanza el detalle de nada del cliente A", () => {
  it.each(casos)("$nombre", async ({ handlers, metodo, ruta }) => {
    comoUsuario(B, "ADMINISTRADOR");

    const esLectura = metodo === "GET";
    const antes = esLectura ? null : await huellaDelCliente(A.tenantId);

    const { status, respuesta } = await llamar(handlers[metodo] as never, {
      metodo,
      params: PARAMS_DEL_CLIENTE_A[ruta],
    });

    // No se exige un codigo concreto. Varias rutas acotan bien con updateMany
    // y devuelven 200 con { count: 0 }: es seguro aunque no sea un 404. Lo que
    // no se acepta es un 500, porque entonces no se sabe que habria hecho.
    expect(status, "La ruta se cayo en vez de denegar").not.toBe(500);

    // 1. No devolvio ni un dato del cliente A.
    const texto = await respuesta.clone().text();
    const filtradas = HUELLAS_DE_A.filter((h) => texto.includes(h));
    expect(filtradas, `La respuesta contiene datos del cliente A: ${filtradas.join(", ")}`).toEqual([]);

    // 2. Y no cambio nada suyo. Esto es lo que de verdad importa en escrituras:
    //    cubre tambien el borrado a la papelera, que no altera ningun total.
    if (!esLectura) {
      const despues = await huellaDelCliente(A.tenantId);
      expect(despues, "Una peticion del cliente B modifico datos del cliente A").toBe(antes);
    }
  });
});

describe("control: el dueno si alcanza sus propios datos", () => {
  // Sin esto, una ruta rota que respondiera 404 a todo el mundo pasaria la
  // prueba de arriba con honores. Aqui se comprueba que el 404 anterior era
  // por aislamiento y no porque la ruta no funcione.
  const lecturas = casos.filter((c) => c.metodo === "GET");

  it.each(lecturas)("$nombre responde al cliente A", async ({ handlers, metodo, ruta }) => {
    comoUsuario(A, "ADMINISTRADOR");

    const { status } = await llamar(handlers[metodo] as never, {
      metodo,
      params: PARAMS_DEL_CLIENTE_A[ruta],
    });

    expect(status, "El dueno tampoco puede leer su propio dato: la ruta esta rota").not.toBe(404);
  });
});

describe("la tabla de rutas de detalle no se queda atras", () => {
  it.each(conParametro)("$ruta esta cubierta por la tabla", ({ ruta }) => {
    expect(
      ruta in PARAMS_DEL_CLIENTE_A,
      `Ruta nueva sin datos de prueba. Agregala a PARAMS_DEL_CLIENTE_A (o a ` +
        `PARAMETRO_NO_ES_DE_CLIENTE si su parametro no identifica a un cliente).`
    ).toBe(true);
  });

  it.each(Object.keys(PARAMETRO_NO_ES_DE_CLIENTE))("%s sigue existiendo", (ruta) => {
    expect(rutas.some((r) => r.ruta === ruta)).toBe(true);
  });
});
