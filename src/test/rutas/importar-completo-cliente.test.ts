/**
 * Importación completa: ahora también guarda los DATOS DE DETALLE del cliente
 * (sector, teléfono, email, sitio web, condiciones comerciales, notas), no solo
 * el nombre. Este test sube un Excel real con esas columnas y verifica que la
 * empresa quede creada con todos esos campos, además del contacto y la
 * oportunidad vinculados.
 */
import { describe, it, expect, beforeAll } from "vitest";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { A, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario } from "../helpers";
import { POST as importarCompleto } from "@/app/api/importar/completo/route";
import { prisma } from "@/lib/prisma";

async function xlsxBuffer(headers: string[], filas: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");
  ws.addRow(headers);
  filas.forEach((f) => ws.addRow(f));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function peticion(buffer: Buffer, mapeo: Record<string, string>): NextRequest {
  const fd = new FormData();
  fd.append("archivo", new Blob([new Uint8Array(buffer)]), "comercial.xlsx");
  fd.append("mapeo", JSON.stringify(mapeo));
  fd.append("colsExtra", "[]");
  return new NextRequest("http://pruebas.local/api/importar/completo", { method: "POST", body: fd });
}

describe("importación completa con datos de cliente", () => {
  beforeAll(async () => { await sembrarSiHizoFalta(); });

  it("crea la empresa con sus datos de detalle + contacto + oportunidad", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const nombre = `Cliente Completo ${Date.now()}`;

    const buf = await xlsxBuffer(
      ["Cliente", "Sector", "TelCliente", "EmailCliente", "Web", "Condiciones", "NotasCliente", "Contacto", "EmailContacto", "TipoNegocio", "Etapa", "Valor"],
      [[nombre, "Legal", "6017770000", "info@clientecompleto.com", "https://clientecompleto.com", "Anticipo 50%", "Cuenta clave", "Laura Díaz", "laura@clientecompleto.com", "Asesoría anual", "PROPUESTA", "12000000"]],
    );

    const res = await importarCompleto(peticion(buf, {
      empresa: "Cliente",
      sector: "Sector",
      telefonoEmpresa: "TelCliente",
      emailEmpresa: "EmailCliente",
      sitioWeb: "Web",
      condicionesComerciales: "Condiciones",
      notasEmpresa: "NotasCliente",
      contacto: "Contacto",
      emailContacto: "EmailContacto",
      tituloOportunidad: "TipoNegocio",
      etapaOportunidad: "Etapa",
      valorOportunidad: "Valor",
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.empresasCreadas).toBe(1);
    expect(body.contactosCreados).toBe(1);
    expect(body.oportunidadesCreadas).toBe(1);

    const emp = await prisma.empresa.findFirst({ where: { tenantId: A.tenantId, nombre } });
    expect(emp).not.toBeNull();
    expect(emp!.sector).toBe("Legal");
    expect(emp!.telefono).toBe("6017770000");
    expect(emp!.email).toBe("info@clientecompleto.com");
    expect(emp!.sitioWeb).toBe("https://clientecompleto.com");
    expect(emp!.condicionesComerciales).toBe("Anticipo 50%");
    expect(emp!.notas).toBe("Cuenta clave");
  });
});
