/** Probabilidad por etapa en la configuración de etapas del pipeline. */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { GET as listar, PATCH as guardar } from "@/app/api/etapas-pipeline/route";

beforeAll(async () => {
  await sembrar();
});
beforeEach(async () => {
  await sembrarSiHizoFalta();
});

type Etapa = { id: string; key: string; nombre: string; orden: number; probabilidad: number };

describe("probabilidad de las etapas", () => {
  it("el listado trae la probabilidad resuelta (la de fábrica si no hay configurada)", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(listar);
    expect(status).toBe(200);
    const prospecto = (cuerpo as Etapa[]).find(e => e.key === "PROSPECTO");
    expect(prospecto?.probabilidad).toBe(10);
  });

  it("el Administrador la cambia y queda guardada", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(guardar, {
      body: { etapas: [{ id: A.etapaPipeline, nombre: "Prospecto", orden: 1, probabilidad: 15 }] },
    });
    expect(status).toBe(200);
    expect((cuerpo as Etapa[]).find(e => e.id === A.etapaPipeline)?.probabilidad).toBe(15);
  });

  it("rechaza valores fuera de 0–100", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(guardar, {
      body: { etapas: [{ id: A.etapaPipeline, nombre: "Prospecto", orden: 1, probabilidad: 150 }] },
    });
    expect(status).toBe(400);
  });

  it("un comercial no puede cambiarla", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(guardar, {
      body: { etapas: [{ id: A.etapaPipeline, nombre: "Prospecto", orden: 1, probabilidad: 90 }] },
    });
    expect(status).toBe(403);
  });
});
