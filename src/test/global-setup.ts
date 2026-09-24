/**
 * Corre UNA vez por `vitest run`, antes de cualquier archivo de prueba.
 *
 * 1. Comprueba que el cliente de Prisma corresponda al esquema de ESTA carpeta.
 * 2. Toma el candado de la base de pruebas (ver candado.ts) y lo suelta al final.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Prisma } from "@prisma/client";
// Carga .env.test y aborta si no apunta a la rama de pruebas. Es el mismo
// archivo que vitest corre en cada worker; aqui hace falta tambien, porque el
// globalSetup vive en otro proceso.
import "./setup";
import { tomarCandado } from "./candado";

/** Modelos y campos tal como estan escritos en prisma/schema.prisma. */
function modelosDelEsquema(texto: string): Map<string, Set<string>> {
  const modelos = new Map<string, Set<string>>();
  let actual: Set<string> | null = null;

  for (const cruda of texto.split("\n")) {
    const linea = cruda.trim();
    const inicio = /^model\s+(\w+)\s*\{/.exec(linea);
    if (inicio) {
      actual = new Set();
      modelos.set(inicio[1], actual);
      continue;
    }
    if (!actual) continue;
    if (linea.startsWith("}")) {
      actual = null;
      continue;
    }
    const campo = /^(\w+)\s/.exec(linea);
    if (campo) actual.add(campo[1]);
  }
  return modelos;
}

/**
 * Un worktree sin node_modules propio resuelve @prisma/client en la carpeta
 * principal, generado con el esquema que haya ALLI — incluso uno sin
 * commitear. Si no coincide con el de esta carpeta, las pruebas fallan a
 * mitad con "relation X does not exist" o "column Y does not exist", que
 * parecen bugs del codigo. Mejor detenerse antes y decir por que.
 */
function verificarClientePrisma() {
  const ruta = path.resolve(process.cwd(), "prisma/schema.prisma");
  const esquema = modelosDelEsquema(fs.readFileSync(ruta, "utf8"));
  const cliente = new Map(
    Prisma.dmmf.datamodel.models.map((m) => [m.name, new Set(m.fields.map((f) => f.name))])
  );

  const diferencias: string[] = [];
  for (const [modelo, campos] of esquema) {
    const delCliente = cliente.get(modelo);
    if (!delCliente) {
      diferencias.push(`falta el modelo ${modelo}`);
      continue;
    }
    for (const c of campos) if (!delCliente.has(c)) diferencias.push(`falta ${modelo}.${c}`);
    for (const c of delCliente) if (!campos.has(c)) diferencias.push(`sobra ${modelo}.${c}`);
  }
  for (const modelo of cliente.keys()) if (!esquema.has(modelo)) diferencias.push(`sobra el modelo ${modelo}`);

  if (diferencias.length === 0) return;

  const origen = createRequire(path.resolve(process.cwd(), "package.json")).resolve("@prisma/client");
  throw new Error(
    "El cliente de Prisma no corresponde a prisma/schema.prisma de esta carpeta.\n" +
      `  Cliente usado: ${origen}\n` +
      `  Diferencias (${diferencias.length}): ${diferencias.slice(0, 8).join(", ")}${diferencias.length > 8 ? ", ..." : ""}\n\n` +
      "Si esta carpeta es un worktree sin node_modules propio, instalalo aqui: npm ci\n" +
      "Si es la carpeta principal: npx prisma generate"
  );
}

export default async function globalSetup() {
  verificarClientePrisma();

  const quien = `vitest ${path.basename(process.cwd())} pid ${process.pid}`;
  return tomarCandado(quien);
}
