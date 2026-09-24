// Minutas de reunión con IA: el esquema que la IA llena (respuesta
// estructurada), el que se valida al guardar (lo que el usuario revisó y
// editó) y el texto listo para copiar y enviar al cliente.
//
// Sin dependencias del servidor: lo usan la API, la pantalla y las pruebas.

import { z } from "zod";

export const LADOS_ASISTENTE = ["NOSOTROS", "CLIENTE", "DESCONOCIDO"] as const;
export const LADOS_COMPROMISO = ["NOSOTROS", "CLIENTE"] as const;

// Lo que devuelve la IA. Se mantiene simple (strings, listas, enums y nulls)
// porque es el JSON Schema que se le exige al modelo con structured outputs.
export const minutaIASchema = z.object({
  titulo: z.string().describe("Tema de la reunión en pocas palabras (máx. 80 caracteres)"),
  resumen: z.string().describe("Resumen de 2 a 5 frases: qué se habló y en qué quedó"),
  asistentes: z.array(z.object({
    nombre: z.string(),
    rol: z.string().nullable().describe("Cargo o rol si se menciona; si no, null"),
    lado: z.enum(LADOS_ASISTENTE).describe("NOSOTROS = nuestra empresa (quien vende); CLIENTE = el cliente"),
  })),
  acuerdos: z.array(z.string()).describe("Decisiones o acuerdos alcanzados"),
  compromisos: z.array(z.object({
    descripcion: z.string().describe("Qué hay que hacer, empezando con un verbo"),
    responsable: z.string().nullable().describe("Nombre de quien lo hace si se menciona; si no, null"),
    lado: z.enum(LADOS_COMPROMISO).describe("NOSOTROS si lo hace nuestra empresa, CLIENTE si lo hace el cliente"),
    fecha: z.string().nullable().describe("Fecha límite en formato YYYY-MM-DD si se menciona o se deduce; si no, null"),
  })),
  proximosPasos: z.array(z.string()).describe("Siguientes pasos de la relación comercial"),
  riesgos: z.array(z.string()).describe("Objeciones, dudas o riesgos que expresó el cliente"),
});
export type MinutaIA = z.infer<typeof minutaIASchema>;

// Límites de lo que se guarda (lo que llega del formulario ya revisado).
const texto = (max: number) => z.string().trim().max(max);
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const guardarMinutaSchema = z.object({
  oportunidadId: z.string().min(1).nullable().optional(),
  empresaId: z.string().min(1).nullable().optional(),
  fecha: z.string().regex(RE_FECHA, "Fecha de la reunión inválida"),
  titulo: texto(200).min(1, "La minuta necesita un título"),
  resumen: texto(4000).min(1, "La minuta necesita un resumen"),
  asistentes: z.array(z.object({
    nombre: texto(120).min(1),
    rol: texto(120).nullable(),
    lado: z.enum(LADOS_ASISTENTE),
  })).max(40),
  acuerdos: z.array(texto(500).min(1)).max(40),
  compromisos: z.array(z.object({
    descripcion: texto(300).min(1),
    responsable: texto(120).nullable(),
    lado: z.enum(LADOS_COMPROMISO),
    fecha: z.string().regex(RE_FECHA).nullable(),
    // Solo compromisos de NOSOTROS: si el usuario pidió crear la tarea.
    crearTarea: z.boolean().optional(),
  })).max(40),
  proximosPasos: z.array(texto(500).min(1)).max(40),
  riesgos: z.array(texto(500).min(1)).max(40),
  textoOriginal: texto(30000).nullable().optional(),
});
export type MinutaGuardar = z.infer<typeof guardarMinutaSchema>;

export const MAX_TEXTO_MINUTA = 30000;
export const MIN_TEXTO_MINUTA = 40;

/** Una fecha YYYY-MM-DD válida y razonable (±2 años), o null. */
export function fechaCompromisoValida(f: string | null | undefined, ahora: Date = new Date()): string | null {
  if (!f || !RE_FECHA.test(f)) return null;
  const d = new Date(`${f}T12:00:00-05:00`);
  if (isNaN(d.getTime())) return null;
  const dos = 2 * 365 * 86_400_000;
  return Math.abs(d.getTime() - ahora.getTime()) <= dos ? f : null;
}

/** Limpia lo que devolvió la IA: recorta vacíos y descarta fechas absurdas. */
export function limpiarMinutaIA(m: MinutaIA, ahora: Date = new Date()): MinutaIA {
  const limpio = (xs: string[]) => xs.map(x => x.trim()).filter(Boolean);
  return {
    titulo: m.titulo.trim().slice(0, 200),
    resumen: m.resumen.trim(),
    asistentes: m.asistentes.filter(a => a.nombre.trim()).map(a => ({ ...a, nombre: a.nombre.trim(), rol: a.rol?.trim() || null })),
    acuerdos: limpio(m.acuerdos),
    compromisos: m.compromisos
      .filter(c => c.descripcion.trim())
      .map(c => ({ ...c, descripcion: c.descripcion.trim(), responsable: c.responsable?.trim() || null, fecha: fechaCompromisoValida(c.fecha, ahora) })),
    proximosPasos: limpio(m.proximosPasos),
    riesgos: limpio(m.riesgos),
  };
}

const fmtFecha = (f: string) =>
  new Date(`${f}T12:00:00-05:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });

/**
 * La minuta como texto plano, lista para pegar en un correo o WhatsApp al
 * cliente. No incluye los riesgos: son notas internas del equipo.
 */
export function minutaATexto(m: Pick<MinutaGuardar, "titulo" | "fecha" | "resumen" | "asistentes" | "acuerdos" | "compromisos" | "proximosPasos">, empresa?: string | null): string {
  const lineas: string[] = [];
  lineas.push(`Minuta de reunión: ${m.titulo}`);
  lineas.push(`Fecha: ${fmtFecha(m.fecha)}${empresa ? ` · ${empresa}` : ""}`);
  if (m.asistentes.length) {
    lineas.push("", "Asistentes:");
    for (const a of m.asistentes) lineas.push(`- ${a.nombre}${a.rol ? ` (${a.rol})` : ""}`);
  }
  lineas.push("", "Resumen:", m.resumen);
  if (m.acuerdos.length) {
    lineas.push("", "Acuerdos:");
    for (const x of m.acuerdos) lineas.push(`- ${x}`);
  }
  if (m.compromisos.length) {
    lineas.push("", "Compromisos:");
    for (const c of m.compromisos) {
      const quien = c.responsable ?? (c.lado === "CLIENTE" ? "Cliente" : "Nuestro equipo");
      lineas.push(`- ${c.descripcion} — ${quien}${c.fecha ? `, ${fmtFecha(c.fecha)}` : ""}`);
    }
  }
  if (m.proximosPasos.length) {
    lineas.push("", "Próximos pasos:");
    for (const x of m.proximosPasos) lineas.push(`- ${x}`);
  }
  return lineas.join("\n");
}
