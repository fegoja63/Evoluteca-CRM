// Cuerpo / condiciones de la cotización que cada tenant define UNA vez (en
// Configuración) y se repiten en TODAS sus cotizaciones — tanto en el PDF como
// en el link público que ve el cliente. Es un array de secciones libres
// (título + contenido) que el tenant puede agregar, quitar y reordenar.
//
// Si el tenant no ha configurado nada (null/[]), se usan CONDICIONES_DEFAULT
// para no cambiar el comportamiento de quien ya venía usando el sistema.

export type SeccionCuerpo = { titulo: string; contenido: string };

export const MAX_SECCIONES = 20;
export const MAX_TITULO = 120;
export const MAX_CONTENIDO = 4000;

// Condiciones que el PDF traía fijas en código. Se usan como respaldo cuando el
// tenant no ha definido su propio cuerpo de cotización.
export const CONDICIONES_DEFAULT: SeccionCuerpo[] = [
  {
    titulo: "Condiciones comerciales",
    contenido: [
      "Vigencia de la cotización: 30 días calendario a partir de la fecha de emisión.",
      "Moneda: los precios están expresados en pesos colombianos e incluyen impuestos.",
      "Forma de pago: 50% de anticipo y 50% contra entrega.",
      "Modificaciones: cualquier modificación al alcance será cotizada por separado.",
      "Aceptación: la aceptación de esta propuesta se realizará mediante la emisión de una orden de compra o la aceptación de la presente cotización.",
      "Intereses: los pagos vencidos generarán intereses moratorios a la máxima tasa legal permitida en Colombia.",
    ].join("\n"),
  },
];

// Punto de partida que se ofrece al tenant en el editor de Configuración cuando
// todavía no ha configurado su cuerpo de cotización. Son solo sugerencias
// editables: el usuario ajusta títulos, contenido y cuáles conservar.
export const SECCIONES_SUGERIDAS: SeccionCuerpo[] = [
  { titulo: "Sobre nosotros", contenido: "" },
  { titulo: "Solución propuesta", contenido: "" },
  { titulo: "Alcance", contenido: "" },
  ...CONDICIONES_DEFAULT.map(s => ({ ...s })),
  { titulo: "Condiciones legales", contenido: "" },
  { titulo: "Términos y plazos de entrega", contenido: "" },
];

// Normaliza lo que venga de la BD (Json?) o del cliente a una lista de secciones
// válidas: descarta lo que no sea objeto con título, recorta a los límites y
// limita la cantidad. Devuelve [] si no hay nada usable.
export function normalizarCuerpo(valor: unknown): SeccionCuerpo[] {
  if (!Array.isArray(valor)) return [];
  const secciones: SeccionCuerpo[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const titulo = String((item as Record<string, unknown>).titulo ?? "").trim().slice(0, MAX_TITULO);
    const contenido = String((item as Record<string, unknown>).contenido ?? "").trim().slice(0, MAX_CONTENIDO);
    if (!titulo && !contenido) continue;
    secciones.push({ titulo, contenido });
    if (secciones.length >= MAX_SECCIONES) break;
  }
  return secciones;
}

// Secciones que se deben RENDERIZAR en una cotización: el cuerpo del tenant si
// lo tiene configurado, o las condiciones por defecto en caso contrario.
export function seccionesCotizacion(cuerpoTenant: unknown): SeccionCuerpo[] {
  const propio = normalizarCuerpo(cuerpoTenant);
  return propio.length > 0 ? propio : CONDICIONES_DEFAULT;
}

// Normaliza un título para compararlo sin distinguir mayúsculas ni acentos.
function normalizarTitulo(s: string): string {
  // ̀-ͯ = marcas diacríticas combinantes (acentos) que deja normalize("NFD").
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Secciones del cuerpo del tenant a mostrar en ESTA cotización. Si la cotización
// trae condiciones comerciales propias del cliente, se omite la sección genérica
// "Condiciones comerciales" del cuerpo del tenant para no mostrar dos bloques con
// el mismo título (lo específico del cliente reemplaza al genérico).
export function seccionesVisibles(cuerpoTenant: unknown, tieneCondicionesPropias: boolean): SeccionCuerpo[] {
  const secciones = seccionesCotizacion(cuerpoTenant);
  if (!tieneCondicionesPropias) return secciones;
  return secciones.filter(s => normalizarTitulo(s.titulo) !== "condiciones comerciales");
}

// Secciones definitivas a mostrar en ESTA cotización (PDF y enlace público):
//   - Si la cotización trae su propio cuerpo (cuerpoCotizacion), ese manda por
//     completo — es el modelo nuevo, editable por cotización.
//   - Si no, se cae al comportamiento anterior: el cuerpo del tenant, ocultando
//     la sección genérica "Condiciones comerciales" cuando la cotización tiene
//     condicionesComerciales propias (que se renderizan aparte).
export function seccionesParaCotizacion(cot: {
  cuerpoCotizacion?: unknown;
  condicionesComerciales?: string | null;
  tenant: { cuerpoCotizacion?: unknown };
}): SeccionCuerpo[] {
  const propio = normalizarCuerpo(cot.cuerpoCotizacion);
  if (propio.length > 0) return propio;
  return seccionesVisibles(cot.tenant.cuerpoCotizacion, !!cot.condicionesComerciales);
}

// ¿La cotización define su propio cuerpo? Sirve para no renderizar el bloque
// separado de "Condiciones comerciales" cuando el cuerpo ya lo incluye.
export function tieneCuerpoPropio(cuerpoCotizacion: unknown): boolean {
  return normalizarCuerpo(cuerpoCotizacion).length > 0;
}

// Cuerpo para EDITAR una cotización (formulario del detalle). A diferencia de
// seccionesParaCotizacion (para render, donde las condiciones van aparte), aquí
// se busca no perder nada: si la cotización no tiene cuerpo propio, se parte de
// la plantilla del tenant y se inyecta la condicionesComerciales del cliente en
// la sección "Condiciones comerciales" (o se agrega al final). Así, al guardar,
// la cotización migra al modelo nuevo sin perder su texto anterior.
export function cuerpoEditable(cot: {
  cuerpoCotizacion?: unknown;
  condicionesComerciales?: string | null;
  tenant: { cuerpoCotizacion?: unknown };
}): SeccionCuerpo[] {
  const propio = normalizarCuerpo(cot.cuerpoCotizacion);
  if (propio.length > 0) return propio;
  const base = seccionesCotizacion(cot.tenant.cuerpoCotizacion).map(s => ({ ...s }));
  const cond = (cot.condicionesComerciales ?? "").trim();
  if (!cond) return base;
  let reemplazada = false;
  const resultado = base.map(s => {
    if (normalizarTitulo(s.titulo) === "condiciones comerciales") { reemplazada = true; return { ...s, contenido: cond }; }
    return s;
  });
  if (!reemplazada) resultado.push({ titulo: "Condiciones comerciales", contenido: cond });
  return resultado;
}
