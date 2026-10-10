// Metodología de ventas del tenant (Configuración → Metodología de ventas).
// Hoy la usa el Coach de objeciones con IA para responder con ese enfoque.
// La clave es lo que se guarda en Tenant.metodologiaVentas.

export type MetodologiaVentas = "CONSULTIVA" | "SPIN" | "CHALLENGER" | "VALOR";

export const METODOLOGIA_POR_DEFECTO: MetodologiaVentas = "CONSULTIVA";

export const METODOLOGIAS: Record<MetodologiaVentas, { label: string; descripcion: string; enfoque: string }> = {
  CONSULTIVA: {
    label: "Consultiva (por defecto)",
    descripcion: "Entender prioridad, contexto y valor percibido antes de proponer. Sirve para casi cualquier venta B2B.",
    enfoque: "Venta consultiva: entiende la prioridad, el contexto y el valor percibido del cliente antes de proponer; escucha más de lo que habla.",
  },
  SPIN: {
    label: "SPIN Selling",
    descripcion: "Descubrir el dolor con preguntas de Situación, Problema, Implicación y Necesidad-beneficio. Útil cuando el cliente aún no ve el problema.",
    enfoque: "SPIN Selling: trabaja con preguntas de Situación, Problema, Implicación (qué le cuesta al cliente no resolverlo) y Necesidad-beneficio (que el cliente diga en voz alta el valor). Prioriza la pregunta de Implicación.",
  },
  CHALLENGER: {
    label: "Challenger",
    descripcion: "Enseñar algo nuevo y reencuadrar cómo el cliente ve su situación. Útil en mercados competidos o ante \"ya tenemos proveedor\".",
    enfoque: "Challenger Sale: aporta una perspectiva nueva que reencuadre cómo el cliente ve su situación (enseñar, adaptar, tomar el control con respeto); no discutas, cambia el marco.",
  },
  VALOR: {
    label: "Venta de valor (Value Selling)",
    descripcion: "Vender el impacto y el retorno, no el producto. Útil ante objeciones de precio y ofertas con ROI demostrable.",
    enfoque: "Value Selling: lleva la conversación al impacto de negocio y al retorno (qué gana o deja de perder el cliente), no al precio ni a las características; no inventes cifras.",
  },
};

export function esMetodologia(v: unknown): v is MetodologiaVentas {
  return typeof v === "string" && v in METODOLOGIAS;
}

export function metodologiaDe(v: unknown): MetodologiaVentas {
  return esMetodologia(v) ? v : METODOLOGIA_POR_DEFECTO;
}
