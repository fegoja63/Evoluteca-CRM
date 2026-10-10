/**
 * Reportes no cuenta lo que está en la Papelera: el total de clientes y de
 * contactos (y la conversión contacto → oportunidad) debe coincidir con lo que
 * muestran las pantallas de Clientes y Contactos.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as reportes } from "@/app/api/reportes/route";

type Reporte = { totalEmpresas: number; totalContactos: number; conversion: { totalContactos: number; contactosConvertidos: number } };

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  comoUsuario(A, "ADMINISTRADOR");
});

describe("Reportes y la Papelera", () => {
  it("un cliente y un contacto en la Papelera no suman en los totales", async () => {
    const antes = (await llamar(reportes)).cuerpo as Reporte;

    const enPapelera = new Date();
    await prisma.empresa.create({ data: { id: "emp-a-papelera", tenantId: A.tenantId, nombre: "Cliente borrado", creadoBy: A.admin, eliminadoEn: enPapelera } });
    await prisma.contacto.create({ data: { id: "con-a-papelera", tenantId: A.tenantId, nombre: "Contacto borrado", eliminadoEn: enPapelera } });

    const despues = (await llamar(reportes)).cuerpo as Reporte;
    expect(despues.totalEmpresas).toBe(antes.totalEmpresas);
    expect(despues.totalContactos).toBe(antes.totalContactos);
    expect(despues.conversion.totalContactos).toBe(antes.conversion.totalContactos);
  });

  it("un contacto en la Papelera tampoco cuenta como convertido", async () => {
    const antes = (await llamar(reportes)).cuerpo as Reporte;
    expect(antes.conversion.contactosConvertidos).toBeGreaterThan(0);

    // El contacto sembrado tiene oportunidades; al mandarlo a la Papelera deja
    // de contar en el numerador y en el denominador.
    await prisma.contacto.update({ where: { id: A.contacto }, data: { eliminadoEn: new Date() } });

    const despues = (await llamar(reportes)).cuerpo as Reporte;
    expect(despues.conversion.contactosConvertidos).toBe(antes.conversion.contactosConvertidos - 1);
    expect(despues.conversion.totalContactos).toBe(antes.conversion.totalContactos - 1);
  });
});
