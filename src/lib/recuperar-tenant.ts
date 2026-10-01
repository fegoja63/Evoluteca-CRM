/**
 * Recupera los datos comerciales de UN tenant desde un respaldo, sin tocar nada
 * de lo que hay hoy.
 *
 * Existe porque "Borrar todos los datos del CRM" (Configuración) borra
 * definitivamente, y restaurar un respaldo entero no sirve: pisaría a todos los
 * demás clientes con datos viejos. Aquí solo se AGREGA lo que falta de un
 * tenant: lo que ya existe (mismo id, o mismo valor único) se deja como está,
 * y nunca se borra ni se actualiza nada.
 *
 * Qué se recupera: lo que borra ese botón (empresas, contactos, oportunidades,
 * actividades, cotizaciones, línea de tiempo, expedientes, funciones,
 * espectadores, NPS) y todo lo que cuelga de ellos en cascada (cambios de
 * etapa, adjuntos, minutas, correos, ítems...). La configuración (productos,
 * metas, etapas, usuarios...) no se toca: no se borró, y reinsertarla
 * revertiría cambios hechos a propósito después del respaldo.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/** Lo que borra /api/configuracion/limpiar. */
const RAICES = [
  "Empresa", "Contacto", "Oportunidad", "Actividad", "Cotizacion", "ItemCotizacion",
  "EventoTimeline", "Expediente", "Espectador", "Funcion", "NpsRespuesta",
];

/** Nunca se recuperan, aunque cuelguen de algo recuperado. */
const EXCLUIDOS = new Set(["Tenant", "Usuario", "RegistroAuditoria", "UsoIA", "RateLimit", "ErrorLog"]);

type Fila = Record<string, unknown>;
type Modelo = Prisma.DMMF.Model;

export type ResultadoModelo = {
  enRespaldo: number;   // filas del tenant en el respaldo
  yaExisten: number;    // de esas, cuántas ya están en el destino (por id)
  insertadas: number;   // cuántas se insertaron (0 en simulación)
  fallidas: { id: unknown; error: string }[];
};

export type ResultadoRecuperacion = {
  tenantId: string;
  aplicado: boolean;
  modelos: Record<string, ResultadoModelo>;
};

const acceso = (nombre: string) => nombre.charAt(0).toLowerCase() + nombre.slice(1);

/** Los JSON guardan fechas como texto; Prisma exige Date. Igual que restaurar-db.ts. */
function convertirFila(modelo: Modelo, fila: Fila): Fila {
  const out: Fila = {};
  for (const campo of modelo.fields) {
    if (campo.kind === "object" || !(campo.name in fila)) continue;
    const v = fila[campo.name];
    out[campo.name] = campo.type === "DateTime" && typeof v === "string" ? new Date(v) : v;
  }
  return out;
}

/** Relaciones en cascada de un modelo hacia otro: [campo FK, modelo padre]. */
function cascadas(modelo: Modelo): [string, string][] {
  return modelo.fields
    .filter(f => f.kind === "object" && f.relationFromFields?.length === 1 && f.relationOnDelete === "Cascade")
    .map(f => [f.relationFromFields![0], f.type] as [string, string]);
}

/** Modelos a recuperar: las raíces más todo lo que cuelga de ellas en cascada. */
function modelosARecuperar(modelos: readonly Modelo[]): Modelo[] {
  const incluidos = new Set(RAICES);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const m of modelos) {
      if (incluidos.has(m.name) || EXCLUIDOS.has(m.name)) continue;
      if (cascadas(m).some(([, padre]) => incluidos.has(padre))) {
        incluidos.add(m.name);
        cambio = true;
      }
    }
  }
  return modelos.filter(m => incluidos.has(m.name));
}

export async function recuperarTenant(
  prisma: PrismaClient,
  carpeta: string,
  tenantId: string,
  opciones: { aplicar: boolean },
): Promise<ResultadoRecuperacion> {
  const modelos = modelosARecuperar(Prisma.dmmf.datamodel.models);
  const nombres = new Set(modelos.map(m => m.name));

  // 1. Filas del tenant en el respaldo. Las que tienen tenantId se filtran por
  //    él; las demás, por pertenecer a un padre ya incluido (iterando hasta
  //    que no se agregue nada, sin depender del orden de los modelos).
  const filasDe = new Map<string, Fila[]>();
  const idsDe = new Map<string, Set<unknown>>();
  const leer = (nombre: string): Fila[] => {
    const archivo = path.join(carpeta, `${nombre}.json`);
    return fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, "utf8")) : [];
  };
  const crudo = new Map(modelos.map(m => [m.name, leer(m.name)]));

  for (const m of modelos) {
    if (m.fields.some(f => f.name === "tenantId")) {
      const filas = crudo.get(m.name)!.filter(f => f.tenantId === tenantId);
      filasDe.set(m.name, filas);
      idsDe.set(m.name, new Set(filas.map(f => f.id)));
    }
  }
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const m of modelos) {
      if (m.fields.some(f => f.name === "tenantId")) continue;
      const rels = cascadas(m).filter(([, padre]) => nombres.has(padre));
      const filas = crudo.get(m.name)!.filter(f =>
        rels.some(([fk, padre]) => idsDe.get(padre)?.has(f[fk])),
      );
      if (filas.length !== (filasDe.get(m.name)?.length ?? -1)) {
        filasDe.set(m.name, filas);
        idsDe.set(m.name, new Set(filas.map(f => f.id)));
        cambio = true;
      }
    }
  }

  // 2. Cuántas ya existen en el destino (por id).
  const resultado: ResultadoRecuperacion = { tenantId, aplicado: opciones.aplicar, modelos: {} };
  const faltantes = new Map<string, Fila[]>();
  for (const m of modelos) {
    const filas = filasDe.get(m.name) ?? [];
    if (filas.length === 0) continue;
    // @ts-expect-error acceso dinámico por nombre de modelo
    const delegado = prisma[acceso(m.name)];
    const existentes = new Set<unknown>();
    const ids = filas.map(f => f.id);
    for (let i = 0; i < ids.length; i += 1000) {
      const lote = await delegado.findMany({ where: { id: { in: ids.slice(i, i + 1000) } }, select: { id: true } });
      for (const e of lote as { id: unknown }[]) existentes.add(e.id);
    }
    const faltan = filas.filter(f => !existentes.has(f.id)).map(f => convertirFila(m, f));
    resultado.modelos[m.name] = { enRespaldo: filas.length, yaExisten: existentes.size, insertadas: 0, fallidas: [] };
    if (faltan.length) faltantes.set(m.name, faltan);
  }

  if (!opciones.aplicar) return resultado;

  // 3. Insertar por pasadas (como restaurar-db.ts): lo que falla por llave
  //    foránea se reintenta cuando ya esté su padre. skipDuplicates hace que
  //    nada existente se pise.
  let avanzo = true;
  while (faltantes.size > 0 && avanzo) {
    avanzo = false;
    for (const [nombre, filas] of [...faltantes]) {
      // @ts-expect-error acceso dinámico por nombre de modelo
      const delegado = prisma[acceso(nombre)];
      try {
        const { count } = await delegado.createMany({ data: filas, skipDuplicates: true });
        resultado.modelos[nombre].insertadas += count;
        faltantes.delete(nombre);
        avanzo = true;
      } catch {
        /* probablemente falta un padre: siguiente pasada */
      }
    }
  }

  // 4. Lo que siga atorado (p. ej. apunta a un usuario o salón que ya no
  //    existe) se intenta fila por fila, para recuperar todo lo posible y
  //    reportar exactamente qué no entró.
  const ultimoError = new Map<unknown, string>();
  avanzo = true;
  while (faltantes.size > 0 && avanzo) {
    avanzo = false;
    for (const [nombre, filas] of [...faltantes]) {
      // @ts-expect-error acceso dinámico por nombre de modelo
      const delegado = prisma[acceso(nombre)];
      const quedan: Fila[] = [];
      for (const fila of filas) {
        try {
          const { count } = await delegado.createMany({ data: [fila], skipDuplicates: true });
          resultado.modelos[nombre].insertadas += count;
          avanzo = true;
        } catch (e) {
          ultimoError.set(fila.id, (e instanceof Error ? e.message : String(e)).trim().split("\n").pop()!.slice(0, 200));
          quedan.push(fila);
        }
      }
      if (quedan.length) faltantes.set(nombre, quedan);
      else faltantes.delete(nombre);
    }
  }
  for (const [nombre, filas] of faltantes) {
    resultado.modelos[nombre].fallidas = filas.map(f => ({ id: f.id, error: ultimoError.get(f.id) ?? "" }));
  }

  return resultado;
}
