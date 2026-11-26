/**
 * Reunión semanal: metas de actividad y compromisos por vendedor. Permisos
 * (el comercial solo lo suyo, las metas solo administrador/gerente), aislamiento
 * entre empresas y el conteo de lo hecho con lo que ya registra el CRM.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";
import { GET, PUT } from "@/app/api/compromisos/route";
import { PUT as putMeta } from "@/app/api/metas-actividad/route";
import { GET as resumenSemanal } from "@/app/api/cron/resumen-semanal/route";
import { lunesDe, moverSemana, rangoSemana, type Conteo } from "@/lib/actividad-semanal";

type Vendedor = {
  id: string; meta: Conteo | null; compromiso: (Conteo & { nota: string | null }) | null; real: Conteo;
  anterior: { cumplimiento: { cumplidos: number; total: number; pct: number } | null };
};
type Respuesta = { semana: string; editable: boolean; puedeEditarMetas: boolean; vendedores: Vendedor[] };

const deUsuario = (cuerpo: unknown, id: string) => (cuerpo as Respuesta).vendedores.find(v => v.id === id)!;

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.compromisoSemanal.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
  await prisma.metaActividad.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
});

describe("compromisos semanales", () => {
  it("el comercial registra el suyo y solo se ve a sí mismo", async () => {
    comoUsuario(A, "COMERCIAL");
    const put = await llamar(PUT, { metodo: "PUT", body: { userId: A.comercial, llamadas: 15, propuestas: 3, nota: "Cerrar la renovación" } });
    expect(put.status).toBe(200);

    const { status, cuerpo } = await llamar(GET);
    expect(status).toBe(200);
    const r = cuerpo as Respuesta;
    expect(r.semana).toBe(lunesDe());
    expect(r.puedeEditarMetas).toBe(false);
    expect(r.vendedores.map(v => v.id)).toEqual([A.comercial]);
    expect(r.vendedores[0].compromiso).toMatchObject({ llamadas: 15, propuestas: 3, contactos: 0, nota: "Cerrar la renovación" });
  });

  it("el comercial no puede registrar el compromiso de otro", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(PUT, { metodo: "PUT", body: { userId: A.gerente, llamadas: 5 } });
    expect(status).toBe(403);
  });

  it("el administrador no puede tocar usuarios de otra empresa", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(PUT, { metodo: "PUT", body: { userId: B.comercial, llamadas: 5 } });
    expect(status).toBe(404);
    expect(await prisma.compromisoSemanal.count({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } })).toBe(0);
  });

  it("no deja reescribir semanas pasadas", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(PUT, { metodo: "PUT", body: { userId: A.comercial, semana: moverSemana(lunesDe(), -1), llamadas: 5 } });
    expect(status).toBe(400);
  });

  it("todo en cero retira el compromiso", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(PUT, { metodo: "PUT", body: { userId: A.comercial, llamadas: 5 } });
    await llamar(PUT, { metodo: "PUT", body: { userId: A.comercial, llamadas: 0 } });
    expect(await prisma.compromisoSemanal.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });
});

describe("metas de actividad", () => {
  it("solo el administrador o el gerente las fijan", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(putMeta, { metodo: "PUT", body: { userId: A.comercial, llamadas: 20 } })).status).toBe(403);

    comoUsuario(A, "GERENTE");
    expect((await llamar(putMeta, { metodo: "PUT", body: { userId: A.comercial, llamadas: 20, contactos: 30 } })).status).toBe(200);
    const { cuerpo } = await llamar(GET);
    expect(deUsuario(cuerpo, A.comercial).meta).toMatchObject({ llamadas: 20, contactos: 30, propuestas: 0 });
  });

  it("no se fijan para usuarios de otra empresa", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(putMeta, { metodo: "PUT", body: { userId: B.comercial, llamadas: 20 } })).status).toBe(404);
  });
});

describe("lo hecho en la semana", () => {
  it("cuenta contactos, negocios, llamadas y reuniones hechas y propuestas, solo de su empresa", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const antes = deUsuario((await llamar(GET)).cuerpo, A.comercial).real;

    const ahora = new Date();
    for (const t of [A, B]) {
      await prisma.contacto.create({ data: { tenantId: t.tenantId, nombre: "Nuevo", creadoBy: t.comercial } });
      // Importado o llegado solo: no es prospección del vendedor.
      await prisma.contacto.create({ data: { tenantId: t.tenantId, nombre: "Del chat" } });
      await prisma.oportunidad.create({ data: { tenantId: t.tenantId, titulo: "Nuevo negocio", empresaId: t.empresa, creadoBy: t.comercial } });
      await prisma.actividad.createMany({
        data: [
          { tenantId: t.tenantId, tipo: "LLAMADA", titulo: "Hecha", fecha: ahora, completada: true, responsableId: t.comercial },
          { tenantId: t.tenantId, tipo: "VISITA_COMERCIAL", titulo: "Hecha", fecha: ahora, completada: true, creadoBy: t.comercial },
          // Pendiente: todavía no cuenta.
          { tenantId: t.tenantId, tipo: "REUNION", titulo: "Pendiente", fecha: ahora, completada: false, responsableId: t.comercial },
          // De otro responsable aunque la haya creado el comercial.
          { tenantId: t.tenantId, tipo: "LLAMADA", titulo: "Ajena", fecha: ahora, completada: true, creadoBy: t.comercial, responsableId: t.admin },
        ],
      });
      await prisma.cotizacion.createMany({
        data: [
          { tenantId: t.tenantId, estado: "ENVIADA", creadoBy: t.comercial },
          { tenantId: t.tenantId, estado: "BORRADOR", creadoBy: t.comercial },
        ],
      });
    }

    const despues = deUsuario((await llamar(GET)).cuerpo, A.comercial).real;
    expect({
      contactos: despues.contactos - antes.contactos,
      negocios: despues.negocios - antes.negocios,
      llamadas: despues.llamadas - antes.llamadas,
      reuniones: despues.reuniones - antes.reuniones,
      propuestas: despues.propuestas - antes.propuestas,
    }).toEqual({ contactos: 1, negocios: 1, llamadas: 1, reuniones: 1, propuestas: 1 });
  });

  it("compara lo prometido la semana pasada con lo hecho, y lo lleva al correo del lunes", async () => {
    const pasada = moverSemana(lunesDe(), -1);
    const enPasada = new Date(rangoSemana(pasada).desde.getTime() + 86_400_000);
    await prisma.compromisoSemanal.create({ data: { tenantId: A.tenantId, userId: A.comercial, semana: pasada, llamadas: 2, propuestas: 1, nota: "Visitar <Norte>" } });
    await prisma.actividad.create({
      data: { tenantId: A.tenantId, tipo: "LLAMADA", titulo: "Hecha", fecha: enPasada, completada: true, responsableId: A.comercial },
    });
    await prisma.cotizacion.create({ data: { tenantId: A.tenantId, estado: "ENVIADA", creadoBy: A.comercial, creadoEn: enPasada } });

    comoUsuario(A, "ADMINISTRADOR");
    const c = deUsuario((await llamar(GET)).cuerpo, A.comercial).anterior.cumplimiento!;
    // Las llamadas sembradas de otras pruebas pueden sumar; las propuestas sí se cumplieron.
    expect(c.total).toBe(2);
    expect(c.cumplidos).toBeGreaterThanOrEqual(1);

    const html = await (await llamar(resumenSemanal, {})).respuesta.text();
    expect(html).toContain("¿Cumplimos lo que prometimos?");
    expect(html).toContain("Visitar &lt;Norte");
  });
});
