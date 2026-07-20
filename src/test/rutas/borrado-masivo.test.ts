/**
 * Regresion: un id que falta no puede convertirse en un borrado masivo.
 *
 * Prisma ignora los campos `undefined` de un where. Eso significa que
 *
 *   deleteMany({ where: { id: idQueVieneDelCuerpo, tenantId } })
 *
 * con el cuerpo vacio se convierte en "borra TODO lo de este tenant", y
 * responde 200 como si nada hubiera pasado. No es una fuga entre clientes
 * — el tenantId sigue puesto — pero si perdida de datos silenciosa dentro
 * del propio cliente.
 *
 * Aparecio en el barrido de rutas de detalle, cuando una peticion sin cuerpo
 * dejo la linea de tiempo en cero. Las dos rutas que tomaban el id del cuerpo
 * (y no de la URL) tenian el defecto; el resto lo toma de params, que siempre
 * viene.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { DELETE as borrarEventoTimeline } from "@/app/api/timeline/[empresaId]/route";
import { DELETE as borrarEventoBitacora } from "@/app/api/expedientes/[id]/bitacora/route";

beforeEach(async () => {
  await sembrar();
  comoUsuario(B, "ADMINISTRADOR");
});

describe("DELETE /api/timeline/[empresaId]", () => {
  it("sin eventoId rechaza en vez de vaciar la linea de tiempo", async () => {
    const antes = await prisma.eventoTimeline.count({ where: { tenantId: B.tenantId } });
    expect(antes).toBeGreaterThan(0);

    const { status } = await llamar(borrarEventoTimeline, {
      metodo: "DELETE",
      params: { empresaId: B.empresa },
      body: {},
    });

    expect(status).toBe(400);
    expect(await prisma.eventoTimeline.count({ where: { tenantId: B.tenantId } })).toBe(antes);
  });

  it("con un eventoId de verdad si borra ese evento", async () => {
    // El control que evita "arreglarlo" rompiendo la funcion.
    const { status } = await llamar(borrarEventoTimeline, {
      metodo: "DELETE",
      params: { empresaId: B.empresa },
      body: { eventoId: B.eventoTimeline },
    });

    expect(status).toBe(200);
    expect(
      await prisma.eventoTimeline.count({ where: { id: B.eventoTimeline, tenantId: B.tenantId } })
    ).toBe(0);
  });
});

describe("DELETE /api/expedientes/[id]/bitacora", () => {
  it("sin eventoId rechaza en vez de vaciar la bitacora del expediente", async () => {
    const antes = await prisma.eventoExpediente.count({ where: { tenantId: B.tenantId } });
    expect(antes).toBeGreaterThan(0);

    const { status } = await llamar(borrarEventoBitacora, {
      metodo: "DELETE",
      params: { id: B.expediente },
      body: {},
    });

    // 400 si el modulo Expedientes esta activo; 403 si no lo esta. En ambos
    // casos lo que importa es que no borro nada.
    expect([400, 403]).toContain(status);
    expect(await prisma.eventoExpediente.count({ where: { tenantId: B.tenantId } })).toBe(antes);
  });
});
