/**
 * Adjuntos: el limite de tamano tiene que medir el archivo, no creerle al
 * cliente.
 *
 * Aqui los archivos se guardan DENTRO de la base de datos como base64. Un
 * limite que no se aplica no es un limite: basta con que alguien declare un
 * tamano pequeno y mande uno grande para que el CRM deje de funcionar para
 * TODOS los clientes, no solo para el suyo.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { POST as subir } from "@/app/api/adjuntos/route";

/** Un data URI con `bytes` de contenido real. */
function archivoDe(bytes: number) {
  return "data:text/plain;base64," + Buffer.alloc(bytes, 0x41).toString("base64");
}

const CINCO_MB = 5 * 1024 * 1024;

beforeEach(async () => {
  await sembrar();
  comoUsuario(A, "COMERCIAL");
});

describe("el limite de 5 MB", () => {
  it("acepta un archivo pequeno", async () => {
    const { status } = await llamar(subir, {
      metodo: "POST",
      body: { nombre: "nota.txt", tipo: "text/plain", tamano: 1000, datos: archivoDe(1000), empresaId: A.empresa },
    });
    expect(status).toBe(201);
  });

  it("rechaza uno grande AUNQUE declare un tamano pequeno", async () => {
    // El ataque exacto: mentir en `tamano`. Antes pasaba la validacion.
    const { status } = await llamar(subir, {
      metodo: "POST",
      body: {
        nombre: "enorme.txt",
        tipo: "text/plain",
        tamano: 100, // mentira
        datos: archivoDe(CINCO_MB + 50_000),
        empresaId: A.empresa,
      },
    });

    expect(status).toBe(400);
    expect(await prisma.adjunto.count({ where: { tenantId: A.tenantId, nombre: "enorme.txt" } })).toBe(0);
  });

  it("guarda el tamano MEDIDO, no el que declaro el cliente", async () => {
    await llamar(subir, {
      metodo: "POST",
      body: { nombre: "medido.txt", tipo: "text/plain", tamano: 999999, datos: archivoDe(2048), empresaId: A.empresa },
    });

    const a = await prisma.adjunto.findFirst({
      where: { tenantId: A.tenantId, nombre: "medido.txt" },
      select: { tamano: true },
    });
    // Si se guardara el declarado, cualquier cuenta de almacenamiento partiria
    // de un numero que controla quien sube el archivo.
    expect(a?.tamano).toBe(2048);
  });

  it("rechaza un dato que no tiene forma de archivo", async () => {
    const { status } = await llamar(subir, {
      metodo: "POST",
      body: { nombre: "raro.txt", tipo: "text/plain", tamano: 10, datos: "data:text/plain;base64", empresaId: A.empresa },
    });
    expect(status).toBe(400);
  });
});

describe("aislamiento", () => {
  it("no se puede colgar un adjunto de una empresa de otro cliente", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(subir, {
      metodo: "POST",
      body: { nombre: "intruso.txt", tipo: "text/plain", tamano: 10, datos: archivoDe(10), empresaId: A.empresa },
    });

    expect(status).toBe(404);
    expect(await prisma.adjunto.count({ where: { tenantId: A.tenantId, nombre: "intruso.txt" } })).toBe(0);
    expect(await prisma.adjunto.count({ where: { tenantId: B.tenantId, nombre: "intruso.txt" } })).toBe(0);
  });
});
