/**
 * Convierte el archivo que sube el usuario (los estados financieros del
 * contador) en algo que la IA pueda leer. Se acepta casi cualquier archivo:
 *
 *   PDF                           → documento (la IA lee PDF, también escaneados)
 *   JPG, PNG, WebP, GIF           → imagen
 *   Excel .xlsx                   → texto por hojas (ExcelJS)
 *   Word .docx, PowerPoint .pptx,
 *   OpenOffice .odt/.ods/.odp     → texto (son ZIP con XML adentro)
 *   CSV, TXT, HTML, XML, JSON,
 *   RTF y cualquier archivo que
 *   en realidad sea texto         → texto
 *
 * El tipo se reconoce por el contenido (los primeros bytes), no solo por la
 * extensión: un PDF con el nombre mal puesto igual se lee. Lo que no se puede
 * leer (Office antiguo .xls/.doc, fotos HEIC del iPhone, binarios) devuelve un
 * mensaje que explica cómo guardarlo en un formato que sí sirve.
 */
import type Anthropic from "@anthropic-ai/sdk";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { fechaISO } from "@/lib/fecha-bogota";

/** Tope del archivo. Más de MAX_BYTES_DIRECTO llega por partes (ver subida-partes.ts). */
export const MAX_BYTES_ARCHIVO = 15 * 1024 * 1024;
/** Lo que cabe en una sola petición: Vercel no acepta cuerpos de más de 4,5 MB. */
export const MAX_BYTES_DIRECTO = 4 * 1024 * 1024;
/** La IA no acepta imágenes de más de 5 MB (la pantalla las achica antes). */
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
export const MAX_TEXTO = 400_000;

type Bloque = Anthropic.Beta.BetaContentBlockParam;
export type ResultadoArchivo = { ok: true; bloque: Bloque; tipo: string } | { ok: false; error: string };

const IMAGENES: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

const MENSAJES = {
  vacio: "El archivo está vacío.",
  pesado: "El archivo pesa más de 15 MB. Suba solo los estados financieros.",
  imagenGrande: "La foto pesa más de 5 MB. Tome una captura de pantalla de la foto o redúzcala, y súbala de nuevo.",
  grande: "El archivo es demasiado grande para leerlo de una vez. Suba solo los estados financieros.",
  officeAntiguo: "Este archivo está en un formato antiguo de Office (.xls, .doc o .ppt) que no se puede leer. Ábralo y use \"Guardar como\" → Excel (.xlsx), Word (.docx) o PDF.",
  heic: "Las fotos HEIC del iPhone no se pueden leer. Envíela como JPG (o tome una captura de pantalla de la foto) y súbala de nuevo.",
  desconocido: "No pudimos leer este archivo. Guárdelo como PDF, Excel o foto y súbalo de nuevo.",
  danado: "No se pudo abrir el archivo. ¿Está dañado o protegido con clave?",
};

// ── Reconocer el tipo por el contenido ──────────────────────────────────────

function empiezaCon(b: Uint8Array, firma: number[], desde = 0): boolean {
  return firma.every((x, i) => b[desde + i] === x);
}

export type TipoArchivo = "pdf" | "png" | "jpeg" | "gif" | "webp" | "zip" | "ole" | "heic" | "otro";

export function tipoPorContenido(b: Uint8Array): TipoArchivo {
  if (empiezaCon(b, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (empiezaCon(b, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (empiezaCon(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (empiezaCon(b, [0x47, 0x49, 0x46, 0x38])) return "gif"; // GIF8
  if (empiezaCon(b, [0x52, 0x49, 0x46, 0x46]) && empiezaCon(b, [0x57, 0x45, 0x42, 0x50], 8)) return "webp"; // RIFF....WEBP
  if (empiezaCon(b, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // xlsx, docx, pptx, odt, ods…
  if (empiezaCon(b, [0xd0, 0xcf, 0x11, 0xe0])) return "ole"; // xls, doc, ppt antiguos
  // HEIC/HEIF: "ftyp" en el byte 4 con marca heic/heix/mif1/msf1/hevc.
  if (empiezaCon(b, [0x66, 0x74, 0x79, 0x70], 4)) {
    const marca = String.fromCharCode(...b.slice(8, 12));
    if (["heic", "heix", "hevc", "mif1", "msf1", "heim", "heis"].includes(marca)) return "heic";
  }
  return "otro";
}

// ── Texto ───────────────────────────────────────────────────────────────────

/** ¿Parece texto? (pocos caracteres de control y ningún byte nulo) */
export function pareceTexto(b: Uint8Array): boolean {
  if (b.length === 0) return false;
  const muestra = b.slice(0, 8000);
  let raros = 0;
  for (const x of muestra) {
    if (x === 0) return false;
    if (x < 9 || (x > 13 && x < 32)) raros++;
  }
  return raros / muestra.length < 0.02;
}

/** UTF-8; si trae caracteres inválidos, Latin-1 (archivos de Windows viejos). */
export function decodificar(b: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(b);
  return utf8.includes("�") ? new TextDecoder("latin1").decode(b) : utf8;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
function decodificarEntidades(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (todo, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : todo;
    }
    return ENTIDADES[e.toLowerCase()] ?? todo;
  });
}

/** XML de Office/OpenOffice (o HTML) → texto: celdas con tabulador, filas y párrafos con salto. */
export function xmlATexto(xml: string): string {
  return decodificarEntidades(
    xml
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/(w:tc|a:tc|table:table-cell|td|th)>/gi, "\t")
      .replace(/<(w:tab|text:tab)\b[^>]*\/?>/gi, "\t")
      .replace(/<\/(w:p|a:p|text:p|text:h|w:tr|a:tr|table:table-row|tr|p|div|li|h\d)>|<(br|w:br|text:line-break)\b[^>]*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** RTF → texto (lo justo para leer cifras: quita grupos y palabras de control). */
export function rtfATexto(rtf: string): string {
  return rtf
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\cell\b/g, "\t")
    .replace(/\\row\b/g, "\n")
    .replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Excel y archivos ZIP de Office/OpenOffice ───────────────────────────────

function textoDeCelda(c: ExcelJS.Cell): string {
  const v = c.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "");
  if (typeof v === "object" && "richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map(t => t.text).join("");
  if (v instanceof Date) return fechaISO(v);
  return String(v);
}

export async function excelATexto(buffer: ArrayBuffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const partes: string[] = [];
  for (const hoja of wb.worksheets) {
    partes.push(`## Hoja: ${hoja.name}`);
    hoja.eachRow({ includeEmpty: false }, fila => {
      const celdas: string[] = [];
      for (let c = 1; c <= hoja.columnCount; c++) celdas.push(textoDeCelda(fila.getCell(c)));
      partes.push(celdas.join(" | "));
    });
  }
  return partes.join("\n");
}

/** ZIP de Office u OpenOffice → texto. null si no es ninguno conocido. */
async function zipATexto(buffer: ArrayBuffer): Promise<string | null> {
  const zip = await JSZip.loadAsync(buffer);
  const nombres = Object.keys(zip.files);
  if (nombres.some(n => n.startsWith("xl/"))) return excelATexto(buffer);
  const leer = async (n: string) => (await zip.file(n)?.async("string")) ?? "";
  if (zip.file("word/document.xml")) return xmlATexto(await leer("word/document.xml"));
  const diapositivas = nombres
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (diapositivas.length) {
    const textos = await Promise.all(diapositivas.map(async (n, i) => `## Diapositiva ${i + 1}\n${xmlATexto(await leer(n))}`));
    return textos.join("\n\n");
  }
  if (zip.file("content.xml")) return xmlATexto(await leer("content.xml")); // odt, ods, odp
  return null;
}

// ── Punto de entrada ────────────────────────────────────────────────────────

function comoTexto(nombre: string, texto: string): ResultadoArchivo {
  if (!texto.trim()) return { ok: false, error: MENSAJES.vacio };
  if (texto.length > MAX_TEXTO) return { ok: false, error: MENSAJES.grande };
  return { ok: true, tipo: "texto", bloque: { type: "text", text: `<documento nombre="${nombre.replace(/["<>]/g, "")}">\n${texto}\n</documento>` } };
}

export async function archivoAContenido(nombre: string, buffer: ArrayBuffer): Promise<ResultadoArchivo> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) return { ok: false, error: MENSAJES.vacio };
  if (bytes.length > MAX_BYTES_ARCHIVO) return { ok: false, error: MENSAJES.pesado };
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  const base64 = () => Buffer.from(buffer).toString("base64");

  try {
    switch (tipoPorContenido(bytes)) {
      case "pdf":
        return { ok: true, tipo: "pdf", bloque: { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64() } } };
      case "png": case "jpeg": case "gif": case "webp": {
        const t = tipoPorContenido(bytes);
        if (bytes.length > MAX_BYTES_IMAGEN) return { ok: false, error: MENSAJES.imagenGrande };
        const media = IMAGENES[t === "jpeg" ? "jpg" : t];
        return { ok: true, tipo: "imagen", bloque: { type: "image", source: { type: "base64", media_type: media, data: base64() } } };
      }
      case "zip": {
        const texto = await zipATexto(buffer);
        return texto === null ? { ok: false, error: MENSAJES.desconocido } : comoTexto(nombre, texto);
      }
      case "ole":
        return { ok: false, error: MENSAJES.officeAntiguo };
      case "heic":
        return { ok: false, error: MENSAJES.heic };
      default: {
        if (ext === "heic" || ext === "heif") return { ok: false, error: MENSAJES.heic };
        if (!pareceTexto(bytes)) return { ok: false, error: MENSAJES.desconocido };
        const texto = decodificar(bytes);
        if (ext === "rtf" || texto.startsWith("{\\rtf")) return comoTexto(nombre, rtfATexto(texto));
        if (ext === "html" || ext === "htm" || ext === "xml" || /^\s*</.test(texto)) return comoTexto(nombre, xmlATexto(texto));
        return comoTexto(nombre, texto);
      }
    }
  } catch {
    return { ok: false, error: MENSAJES.danado };
  }
}
