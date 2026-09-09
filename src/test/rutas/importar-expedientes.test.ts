/**
 * Importación masiva de Expedientes y Plazos (jurídico).
 *
 * Ejerce las dos ramas nuevas del executor (/api/importar/ejecutar) contra la
 * base de pruebas: sube un Excel real (construido con exceljs), lo pasa por el
 * handler con una sesión simulada y comprueba que las filas queden insertadas
 * y vinculadas. Los plazos se vinculan al expediente por su número de radicado;
 * un plazo cuyo radicado no existe debe contarse como error, no crearse huérfano.
 */
import { describe, it, expect, beforeAll } from "vitest";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { A, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario } from "../helpers";
import { POST as importarEjecutar } from "@/app/api/importar/ejecutar/route";
import { prisma } from "@/lib/prisma";

async function xlsxBuffer(headers: string[], filas: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Hoja1");
  ws.addRow(headers);
  filas.forEach((f) => ws.addRow(f));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function peticion(buffer: Buffer, modulo: string, mapeo: Record<string, string>): NextRequest {
  const fd = new FormData();
  fd.append("archivo", new Blob([new Uint8Array(buffer)]), "carga.xlsx");
  fd.append("modulo", modulo);
  fd.append("mapeo", JSON.stringify(mapeo));
  fd.append("colsExtra", "[]");
  return new NextRequest("http://pruebas.local/api/importar/ejecutar", { method: "POST", body: fd });
}

describe("importar expedientes y plazos", () => {
  beforeAll(async () => { await sembrarSiHizoFalta(); });

  it("crea un expediente y luego un plazo vinculado por radicado", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const radicado = `IMP-${Date.now()}-001`;

    // 1) Expedientes
    const bufExp = await xlsxBuffer(
      ["Radicado", "Contraparte", "Estado"],
      [[radicado, "Contraparte X", "ACTIVO"]],
    );
    const resExp = await importarEjecutar(
      peticion(bufExp, "expedientes", { radicado: "Radicado", contraparte: "Contraparte", estado: "Estado" }),
    );
    expect(resExp.status).toBe(200);
    expect((await resExp.json()).creados).toBe(1);

    const exp = await prisma.expediente.findFirst({
      where: { tenantId: A.tenantId, numeroRadicado: radicado },
    });
    expect(exp).not.toBeNull();
    expect(exp!.contraparte).toBe("Contraparte X");
    expect(exp!.estado).toBe("ACTIVO");

    // 2) Plazos (vinculados al expediente por su radicado)
    const bufPl = await xlsxBuffer(
      ["Radicado", "Descripcion", "Fecha"],
      [[radicado, "Contestar demanda", "2026-10-15"]],
    );
    const resPl = await importarEjecutar(
      peticion(bufPl, "plazos", { radicado: "Radicado", descripcion: "Descripcion", fechaLimite: "Fecha" }),
    );
    expect(resPl.status).toBe(200);
    expect((await resPl.json()).creados).toBe(1);

    const plazo = await prisma.terminoExpediente.findFirst({
      where: { tenantId: A.tenantId, expedienteId: exp!.id, descripcion: "Contestar demanda" },
    });
    expect(plazo).not.toBeNull();
  });

  it("cuenta como error un plazo cuyo radicado no existe (no crea huérfanos)", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const buf = await xlsxBuffer(
      ["Radicado", "Descripcion", "Fecha"],
      [["RAD-INEXISTENTE-999", "Algo", "2026-10-15"]],
    );
    const res = await importarEjecutar(
      peticion(buf, "plazos", { radicado: "Radicado", descripcion: "Descripcion", fechaLimite: "Fecha" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.creados).toBe(0);
    expect(body.errores).toBe(1);
  });

  it("omite un radicado de expediente que ya existe (no lo duplica)", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const radicado = `IMP-DUP-${Date.now()}`;
    const mapeo = { radicado: "Radicado", contraparte: "Contraparte" };

    const primera = await importarEjecutar(
      peticion(await xlsxBuffer(["Radicado", "Contraparte"], [[radicado, "Parte A"]]), "expedientes", mapeo),
    );
    expect((await primera.json()).creados).toBe(1);

    const segunda = await importarEjecutar(
      peticion(await xlsxBuffer(["Radicado", "Contraparte"], [[radicado, "Parte A"]]), "expedientes", mapeo),
    );
    const body = await segunda.json();
    expect(body.creados).toBe(0);
    expect(body.omitidos).toBe(1);
  });
});
