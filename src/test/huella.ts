/**
 * Una "huella" del estado completo de un cliente, para comprobar que no
 * cambio nada.
 *
 * Nace de un falso positivo util: varias rutas acotan bien con
 * `updateMany({ where: { id, tenantId } })`, tocan 0 filas y devuelven 200
 * con { count: 0 }. Exigirles un 404 era exigirles una forma, no seguridad.
 *
 * Lo que de verdad importa no es el codigo de respuesta sino el efecto: tras
 * una peticion del cliente B apuntando a datos del cliente A, absolutamente
 * nada de A puede haber cambiado. Eso es lo que mide esta huella.
 *
 * Va en UNA sola sentencia SQL a proposito. La primera version hacia un count
 * de Prisma por modelo (unos 40) y, multiplicado por cada prueba de escritura,
 * dejaba el barrido de rutas de detalle en mas de nueve minutos.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma-vigilado";

const MODELOS = Prisma.dmmf.datamodel.models.filter((m) =>
  m.fields.some((f) => f.name === "tenantId")
);

/** Nombre real de la tabla (@@map en el esquema), no el del modelo. */
const tabla = (modelo: (typeof MODELOS)[number]) => modelo.dbName ?? modelo.name;

/**
 * Se firma el CONTENIDO de cada tabla, no solo cuantas filas tiene.
 *
 * La primera version contaba filas y se le escapo un sabotaje real: marcar un
 * producto ajeno como inactivo no crea ni borra nada, asi que ningun contador
 * se movia y la prueba pasaba tan tranquila. Con md5 sobre las filas enteras,
 * cualquier cambio en cualquier columna mueve la firma.
 *
 * `t::text` serializa la fila completa; el ORDER BY por id la hace estable
 * entre ejecuciones.
 */
const TROZOS = MODELOS.map(
  (m) =>
    `SELECT '${m.name}' AS clave, ` +
    `COALESCE(md5(string_agg(t::text, '|' ORDER BY t."id")), 'vacia') AS firma ` +
    `FROM "${tabla(m)}" t WHERE t."tenantId" = $1`
);

const CONSULTA = TROZOS.join(" UNION ALL ") + " ORDER BY clave";

export async function huellaDelCliente(tenantId: string): Promise<string> {
  const filas = await prisma.$queryRawUnsafe<Array<{ clave: string; firma: string }>>(
    CONSULTA,
    tenantId
  );

  return filas.map((f) => `${f.clave}=${f.firma}`).join(" ");
}
