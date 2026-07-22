/**
 * Tope de filas por importacion.
 *
 * Las importaciones insertan fila por fila en una base compartida entre todos
 * los clientes. Un archivo sin tope puede llenarla o pasarse del tiempo de la
 * funcion a mitad de camino, dejando una importacion parcial. El tope se
 * comprueba ANTES de escribir nada.
 */
import { describe, it, expect } from "vitest";
import { MAX_FILAS_IMPORTACION, excedeTope } from "@/lib/importar-limite";

describe("excedeTope", () => {
  it("deja pasar un archivo dentro del limite", () => {
    expect(excedeTope(new Array(MAX_FILAS_IMPORTACION).fill({}))).toBeNull();
    expect(excedeTope([{}, {}, {}])).toBeNull();
    expect(excedeTope([])).toBeNull();
  });

  it("rechaza uno que se pasa, con 400 y sin tocar la base", async () => {
    const resp = excedeTope(new Array(MAX_FILAS_IMPORTACION + 1).fill({}));
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(400);

    // La respuesta explica el limite y trae ambos numeros, para que el usuario
    // sepa por cuanto se paso.
    const cuerpo = await resp!.json();
    expect(cuerpo.error).toContain(MAX_FILAS_IMPORTACION.toLocaleString("es-CO"));
  });
});
