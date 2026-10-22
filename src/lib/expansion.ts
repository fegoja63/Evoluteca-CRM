/**
 * Sugerencias de expansión: qué más venderle a un cliente que ya compró.
 *
 * El código calcula las señales de MOMENTO (renovación cercana, recompra
 * habitual, cliente que se enfría) a partir del historial; la IA propone qué
 * ofrecer usando lo que el cliente compró, el catálogo (si existe) y lo que
 * compraron clientes del mismo sector. No crea nada: el vendedor decide y con
 * un clic la sugerencia se vuelve una oportunidad en Prospecto.
 */
import { z } from "zod";
import { diaISO, fechaISO } from "@/lib/fecha-bogota";

export type Compra = { titulo: string; valor: number | null; fechaCierre: Date | null; fechaRenovacion?: Date | null };
export type Senal = { tipo: "RENOVACION" | "RECOMPRA" | "INACTIVO"; texto: string };

const DIA = 86_400_000;
const diasEntre = (desdeISO: string, hastaISO: string) =>
  Math.round((Date.parse(`${hastaISO}T00:00:00Z`) - Date.parse(`${desdeISO}T00:00:00Z`)) / DIA);

// Ventana para avisar una renovación próxima.
export const DIAS_RENOVACION = 120;
// Sin compras en este tiempo, el cliente se está enfriando.
export const DIAS_INACTIVO = 365;

/**
 * Señales de momento a partir de las compras (oportunidades GANADAS) del
 * cliente. Las fechas son de calendario (cierre, renovación).
 */
export function senalesDeMomento(compras: Compra[], ahora: Date = new Date()): Senal[] {
  const hoy = fechaISO(ahora);
  const r: Senal[] = [];

  const renovaciones = compras
    .filter(c => c.fechaRenovacion)
    .map(c => ({ titulo: c.titulo, dias: diasEntre(hoy, diaISO(c.fechaRenovacion!)) }))
    .filter(x => x.dias >= 0 && x.dias <= DIAS_RENOVACION)
    .sort((a, b) => a.dias - b.dias);
  if (renovaciones.length) {
    const x = renovaciones[0];
    r.push({ tipo: "RENOVACION", texto: x.dias === 0 ? `"${x.titulo}" se renueva hoy` : `"${x.titulo}" se renueva en ${x.dias} días` });
  }

  const fechas = compras.filter(c => c.fechaCierre).map(c => diaISO(c.fechaCierre!)).sort();
  if (fechas.length) {
    const ultima = fechas[fechas.length - 1];
    const desdeUltima = diasEntre(ultima, hoy);
    if (fechas.length >= 3) {
      // Intervalo típico entre compras (mediana) para detectar una recompra vencida.
      const intervalos = fechas.slice(1).map((f, i) => diasEntre(fechas[i], f)).sort((a, b) => a - b);
      const mediana = intervalos[Math.floor(intervalos.length / 2)];
      if (mediana > 0 && desdeUltima >= mediana) {
        r.push({ tipo: "RECOMPRA", texto: `Suele comprar cada ~${mediana} días y su última compra fue hace ${desdeUltima}` });
      }
    }
    if (desdeUltima >= DIAS_INACTIVO) {
      r.push({ tipo: "INACTIVO", texto: `No compra hace ${desdeUltima} días` });
    }
  }
  return r;
}

export const TIPOS_SUGERENCIA = ["SUBIR_NIVEL", "COMPLEMENTARIO", "RECOMPRA", "RENOVACION"] as const;
export const TIPO_SUGERENCIA_LABEL: Record<(typeof TIPOS_SUGERENCIA)[number], string> = {
  SUBIR_NIVEL: "Subir de nivel",
  COMPLEMENTARIO: "Complementario",
  RECOMPRA: "Volver a comprar",
  RENOVACION: "Renovación",
};

export const expansionIASchema = z.object({
  sugerencias: z.array(z.object({
    tipo: z.enum(TIPOS_SUGERENCIA),
    titulo: z.string().describe("Nombre corto de la oportunidad a crear, como lo escribiría el vendedor en el pipeline"),
    razon: z.string().describe("Una o dos frases: por qué tiene sentido para ESTE cliente, citando su historial"),
    valorEstimado: z.number().nullable().describe("Valor estimado en pesos según compras o catálogo; null si no hay base para estimarlo"),
  })).describe("De 0 a 3 sugerencias, la más prometedora primero. Vacío si no hay base suficiente."),
});
export type ExpansionIA = z.infer<typeof expansionIASchema>;

export function limpiarExpansionIA(e: ExpansionIA): ExpansionIA {
  return {
    sugerencias: e.sugerencias
      .map(s => ({
        tipo: s.tipo,
        titulo: s.titulo.trim().slice(0, 200),
        razon: s.razon.trim(),
        valorEstimado: s.valorEstimado != null && Number.isFinite(s.valorEstimado) && s.valorEstimado > 0 ? Math.round(s.valorEstimado) : null,
      }))
      .filter(s => s.titulo)
      .slice(0, 3),
  };
}
