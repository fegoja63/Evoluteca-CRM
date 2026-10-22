/**
 * Revisor de propuestas: chequeos de una cotización antes de enviarla.
 *
 * Las cifras (margen, descuento sobre la lista, vigencia) las calcula el código
 * con reglas fijas, para que sean exactas y funcionen aunque la IA no esté
 * disponible. La IA (ruta /api/ia/revisar-propuesta) solo agrega la lectura
 * comercial: objeciones pendientes, cómo se presenta el valor, riesgos.
 */
import { z } from "zod";
import { valorCotizacion, type CotizacionValor } from "@/lib/cotizaciones";
import { diaISO, fechaISO, formatoDia } from "@/lib/fecha-bogota";

export type NivelChequeo = "alerta" | "aviso" | "ok";
export type Chequeo = { nivel: NivelChequeo; titulo: string; detalle: string };

export type DatosRevision = Omit<CotizacionValor, "items"> & {
  items?: { descripcion?: string; cantidad?: number; precioUnit: number | string }[];
  fechaValidez?: Date | string | null;
  emailDestino?: string | null;
  // Costo del negocio (Oportunidad.costo), neto, para el margen.
  costo?: number | string | null;
  // Margen promedio (0–1) de las propuestas aceptadas del equipo con costo.
  margenPromedio?: number | null;
  catalogo?: { nombre: string; precioBase: number | string }[];
};

// Por debajo de este margen frente al promedio del equipo se avisa (10 puntos).
const MARGEN_TOLERANCIA = 0.10;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fmt = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const normalizar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Margen (0–1) del valor neto frente al costo, o null si no hay datos. */
export function margenDe(valorNeto: number, costo: number | string | null | undefined): number | null {
  const c = Number(costo ?? 0);
  if (!(c > 0) || !(valorNeto > 0)) return null;
  return (valorNeto - c) / valorNeto;
}

/** Promedio de márgenes válidos, o null si no hay ninguno. */
export function margenPromedio(margenes: (number | null)[]): number | null {
  const v = margenes.filter((m): m is number => m != null && Number.isFinite(m));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function chequearPropuesta(d: DatosRevision, ahora: Date = new Date()): Chequeo[] {
  const r: Chequeo[] = [];
  const valor = valorCotizacion(d);
  const items = d.items ?? [];

  // 1. Que tenga valor. En fee fijo, además, que ningún ítem vaya en cero.
  if (!(valor > 0)) {
    r.push({ nivel: "alerta", titulo: "La propuesta no tiene valor", detalle: "El total es $0. Revise los ítems o los honorarios antes de enviarla." });
  } else if ((d.modalidad ?? "FEE_FIJO") === "FEE_FIJO") {
    const enCero = items.filter(it => !(Number(it.precioUnit) > 0));
    if (enCero.length) {
      r.push({ nivel: "alerta", titulo: `${enCero.length === 1 ? "Un ítem va" : `${enCero.length} ítems van`} sin precio`, detalle: "Si es una cortesía, conviene decirlo en la descripción para que el cliente la valore." });
    }
  }

  // 2. Precios por debajo de la lista del catálogo (descuento implícito).
  if ((d.modalidad ?? "FEE_FIJO") === "FEE_FIJO" && d.catalogo?.length) {
    const lista = new Map(d.catalogo.map(p => [normalizar(p.nombre), Number(p.precioBase)]));
    for (const it of items) {
      const base = lista.get(normalizar(it.descripcion ?? ""));
      const precio = Number(it.precioUnit);
      if (base && base > 0 && precio > 0 && precio < base) {
        const desc = (base - precio) / base;
        r.push({
          nivel: desc >= 0.15 ? "alerta" : "aviso",
          titulo: `Descuento de ${pct(desc)} en "${it.descripcion}"`,
          detalle: `Precio de lista ${fmt(base)}, en la propuesta ${fmt(precio)}. Asegúrese de que el descuento esté pedido y justificado.`,
        });
      }
    }
  }

  // 3. Margen frente al costo del negocio y al promedio del equipo.
  const margen = margenDe(valor, d.costo);
  if (margen != null) {
    const prom = d.margenPromedio ?? null;
    if (margen < 0) {
      r.push({ nivel: "alerta", titulo: "Esta propuesta pierde dinero", detalle: `El costo (${fmt(Number(d.costo))}) es mayor que el valor neto (${fmt(valor)}).` });
    } else if (prom != null && margen < prom - MARGEN_TOLERANCIA) {
      r.push({ nivel: "aviso", titulo: `Margen bajo: ${pct(margen)}`, detalle: `El promedio de sus propuestas aceptadas es ${pct(prom)}. Revise precios o descuentos.` });
    } else {
      r.push({ nivel: "ok", titulo: `Margen de ${pct(margen)}`, detalle: prom != null ? `En línea con el promedio del equipo (${pct(prom)}).` : "Sobre el costo registrado en la oportunidad." });
    }
  }

  // 4. Vigencia (fecha de calendario).
  if (!d.fechaValidez) {
    r.push({ nivel: "aviso", titulo: "Sin fecha de vigencia", detalle: "Una vigencia clara ayuda a que el cliente decida a tiempo." });
  } else if (diaISO(d.fechaValidez) < fechaISO(ahora)) {
    r.push({ nivel: "alerta", titulo: "La vigencia ya venció", detalle: `Venció el ${formatoDia(d.fechaValidez)}. Actualícela antes de enviar.` });
  }

  // 5. A quién se envía.
  if (!d.emailDestino?.trim()) {
    r.push({ nivel: "aviso", titulo: "Sin correo del cliente", detalle: "Ni el contacto ni el cliente tienen correo registrado." });
  }

  return r;
}

// ---- Lectura comercial de la IA ----

export const VEREDICTOS = ["LISTA", "AJUSTAR", "NO_ENVIAR"] as const;
export const TIPOS_OBSERVACION = ["objecion", "valor", "riesgo", "mejora"] as const;

export const revisionIASchema = z.object({
  veredicto: z.enum(VEREDICTOS).describe("LISTA si se puede enviar tal cual, AJUSTAR si conviene corregir algo antes, NO_ENVIAR si hay un error grave"),
  resumen: z.string().describe("Una frase con la conclusión, en lenguaje sencillo"),
  observaciones: z.array(z.object({
    tipo: z.enum(TIPOS_OBSERVACION),
    titulo: z.string().describe("La observación en pocas palabras"),
    detalle: z.string().describe("Una o dos frases: qué pasa y qué hacer"),
  })).describe("De 0 a 4 observaciones, la más importante primero. No repitas los chequeos automáticos."),
});
export type RevisionIA = z.infer<typeof revisionIASchema>;

/** Recorta y limpia la respuesta de la IA. */
export function limpiarRevisionIA(r: RevisionIA): RevisionIA {
  return {
    veredicto: r.veredicto,
    resumen: r.resumen.trim(),
    observaciones: r.observaciones
      .map(o => ({ tipo: o.tipo, titulo: o.titulo.trim(), detalle: o.detalle.trim() }))
      .filter(o => o.titulo)
      .slice(0, 4),
  };
}
