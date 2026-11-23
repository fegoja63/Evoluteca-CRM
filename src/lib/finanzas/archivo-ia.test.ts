import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { archivoAContenido, tipoPorContenido, xmlATexto, rtfATexto, pareceTexto, decodificar, MAX_TEXTO } from "./archivo-ia";

const bytes = (...b: number[]) => new Uint8Array(b).buffer;
const texto = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

async function zip(archivos: Record<string, string>): Promise<ArrayBuffer> {
  const z = new JSZip();
  for (const [n, c] of Object.entries(archivos)) z.file(n, c);
  return z.generateAsync({ type: "arraybuffer" });
}

async function textoDe(nombre: string, buffer: ArrayBuffer): Promise<string> {
  const r = await archivoAContenido(nombre, buffer);
  if (!r.ok) throw new Error(r.error);
  if (r.bloque.type !== "text") throw new Error(`se esperaba texto y llegó ${r.bloque.type}`);
  return r.bloque.text;
}

describe("tipoPorContenido", () => {
  it("reconoce por los primeros bytes", () => {
    expect(tipoPorContenido(new Uint8Array(texto("%PDF-1.7")))).toBe("pdf");
    expect(tipoPorContenido(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
    expect(tipoPorContenido(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(tipoPorContenido(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
    expect(tipoPorContenido(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]))).toBe("ole");
    expect(tipoPorContenido(new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode("ftypheic")]))).toBe("heic");
  });
});

describe("archivoAContenido", () => {
  it("un PDF va como documento aunque tenga otro nombre", async () => {
    const r = await archivoAContenido("estados.bin", texto("%PDF-1.4 hola"));
    expect(r.ok && r.bloque.type).toBe("document");
  });

  it("una foto va como imagen con su tipo real", async () => {
    const r = await archivoAContenido("foto.png", bytes(0xff, 0xd8, 0xff, 0xe0, 1, 2));
    expect(r.ok && r.bloque.type === "image" && r.bloque.source.type === "base64" && r.bloque.source.media_type).toBe("image/jpeg");
  });

  it("Excel .xlsx: las hojas como texto", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("PyG").addRow(["Ventas", 1500000]);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const t = await textoDe("pyg.xlsx", buf);
    expect(t).toContain("## Hoja: PyG");
    expect(t).toContain("Ventas | 1500000");
  });

  it("Word .docx: el texto con sus tablas", async () => {
    const buf = await zip({ "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>Estado de resultados</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:t>Ventas</w:t></w:p></w:tc><w:tc><w:p><w:t>1.500.000</w:t></w:p></w:tc></w:tr></w:tbl></w:body></w:document>" });
    const t = await textoDe("estados.docx", buf);
    expect(t).toContain("Estado de resultados");
    expect(t).toMatch(/Ventas\s+1\.500\.000/);
  });

  it("PowerPoint .pptx: el texto de cada diapositiva en orden", async () => {
    const buf = await zip({
      "ppt/slides/slide2.xml": "<p:sld><a:p><a:r><a:t>Balance</a:t></a:r></a:p></p:sld>",
      "ppt/slides/slide1.xml": "<p:sld><a:p><a:r><a:t>Resultados</a:t></a:r></a:p></p:sld>",
    });
    const t = await textoDe("junta.pptx", buf);
    expect(t.indexOf("Resultados")).toBeLessThan(t.indexOf("Balance"));
  });

  it("OpenOffice .ods: filas y celdas", async () => {
    const buf = await zip({ "content.xml": "<office:document-content><table:table><table:table-row><table:table-cell><text:p>Caja</text:p></table:table-cell><table:table-cell><text:p>40.000.000</text:p></table:table-cell></table:table-row></table:table></office:document-content>" });
    expect(await textoDe("balance.ods", buf)).toMatch(/Caja\s+40\.000\.000/);
  });

  it("CSV en Latin-1 (Excel de Windows) se lee con sus tildes", async () => {
    const latin1 = new Uint8Array([...new TextEncoder().encode("Utilidad neta;"), 0xf1, ...new TextEncoder().encode("o\n")]);
    expect(decodificar(latin1)).toBe("Utilidad neta;ño\n");
    expect(await textoDe("pyg.csv", latin1.buffer)).toContain("ño");
  });

  it("HTML y RTF se limpian a texto", async () => {
    expect(await textoDe("reporte.html", texto("<html><style>x{}</style><table><tr><td>Ventas</td><td>100</td></tr></table></html>"))).toMatch(/Ventas\s+100/);
    expect(rtfATexto("{\\rtf1\\ansi Ventas\\tab 100\\par Costos 50}")).toContain("Costos 50");
  });

  it("un archivo de texto con cualquier extensión se acepta", async () => {
    expect(await textoDe("exportado.dat", texto("Ventas 100\nCostos 50"))).toContain("Costos 50");
  });

  it("explica qué hacer con lo que no se puede leer", async () => {
    const xls = await archivoAContenido("viejo.xls", bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1));
    expect(!xls.ok && xls.error).toContain("Guardar como");
    const heic = await archivoAContenido("foto.heic", bytes(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63));
    expect(!heic.ok && heic.error).toContain("HEIC");
    const binario = await archivoAContenido("x.exe", bytes(0x4d, 0x5a, 0, 0, 3, 0));
    expect(!binario.ok && binario.error).toContain("No pudimos leer");
    const vacio = await archivoAContenido("vacio.pdf", new ArrayBuffer(0));
    expect(!vacio.ok && vacio.error).toContain("vacío");
    const zipRaro = await archivoAContenido("fotos.zip", await zip({ "a.txt": "hola" }));
    expect(zipRaro.ok).toBe(false);
  });

  it("un texto demasiado largo no se manda", async () => {
    const r = await archivoAContenido("enorme.txt", texto("x".repeat(MAX_TEXTO + 1)));
    expect(!r.ok && r.error).toContain("demasiado grande");
  });
});

describe("ayudantes", () => {
  it("pareceTexto descarta binarios", () => {
    expect(pareceTexto(new Uint8Array(texto("hola, mundo")))).toBe(true);
    expect(pareceTexto(new Uint8Array([1, 2, 0, 4]))).toBe(false);
  });
  it("xmlATexto decodifica entidades", () => {
    expect(xmlATexto("<p>P&amp;G &#x41;</p>")).toBe("P&G A");
  });
});
