import { NextResponse } from "next/server";

/**
 * Tope de filas por importacion.
 *
 * Las rutas de importar leen un Excel que sube el usuario e insertan fila por
 * fila. Sin tope, un archivo de decenas de miles de filas puede:
 *
 *   - llenar la base, que aqui es un recurso COMPARTIDO entre todos los
 *     clientes (adjuntos, filas, todo en el mismo Neon de 0.5 GB del plan
 *     gratuito); y
 *   - pasarse del tiempo maximo de la funcion a mitad de camino, dejando una
 *     importacion parcial sin que nadie lo note.
 *
 * 10.000 esta muy por encima de cualquier importacion real de una sola vez
 * (el alta de un cliente nuevo rara vez supera unos miles de registros) y muy
 * por debajo de lo que agotaria el almacenamiento o el tiempo de ejecucion.
 */
export const MAX_FILAS_IMPORTACION = 10_000;

/**
 * Devuelve una respuesta 400 si `filas` se pasa del tope, o null si esta bien.
 * Se comprueba ANTES de escribir nada: mejor rechazar entero que dejar una
 * importacion a medias.
 */
export function excedeTope(filas: unknown[]): NextResponse | null {
  if (filas.length > MAX_FILAS_IMPORTACION) {
    return NextResponse.json(
      {
        error:
          `El archivo tiene ${filas.length.toLocaleString("es-CO")} filas y el maximo por ` +
          `importacion es ${MAX_FILAS_IMPORTACION.toLocaleString("es-CO")}. ` +
          `Divide el archivo en partes mas pequenas.`,
      },
      { status: 400 }
    );
  }
  return null;
}
