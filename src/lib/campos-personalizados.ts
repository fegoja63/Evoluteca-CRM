// Lógica pura de campos personalizados: sin Prisma ni React, para poder
// probarla sola y reusarla en el cliente y el servidor.

export const TIPOS_CAMPO = ["TEXTO", "NUMERO", "FECHA", "LISTA", "BOOLEANO"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export const ENTIDADES_CAMPO = ["EMPRESA", "OPORTUNIDAD"] as const;
export type EntidadCampo = (typeof ENTIDADES_CAMPO)[number];

export const TIPO_LABEL: Record<TipoCampo, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  FECHA: "Fecha",
  LISTA: "Lista (opciones)",
  BOOLEANO: "Sí / No",
};

export const ENTIDAD_LABEL: Record<EntidadCampo, string> = {
  EMPRESA: "Cliente",
  OPORTUNIDAD: "Oportunidad",
};

// La forma mínima de una definición que necesita la validación. La API pasa
// las filas de Prisma, que cumplen esta forma (y traen más campos).
export type DefinicionCampo = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  obligatorio: boolean;
};

// Prefijo que namespacea las llaves de campos personalizados dentro de `extras`,
// para no chocar con las llaves legibles que llegan de importaciones de Excel
// (ej. "COTIZACION NUMERO", "AÑO").
export const PREFIJO_CAMPO = "cp_";

export function esClaveCampoPersonalizado(clave: string): boolean {
  return clave.startsWith(PREFIJO_CAMPO);
}

// Genera la clave estable a partir de la etiqueta: sin acentos, minúsculas,
// separadores a "_", con prefijo cp_. La unicidad por (tenant, entidad) la
// garantiza la API sufijando si hace falta.
export function slugCampo(etiqueta: string): string {
  const base = etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return PREFIJO_CAMPO + (base || "campo");
}

// Da formato legible a un valor guardado según el tipo de su definición.
// Se usa en las vistas de solo lectura.
export function formatearValorCampo(tipo: TipoCampo, valor: string): string {
  if (valor === "" || valor == null) return "—";
  if (tipo === "BOOLEANO") return valor === "true" ? "Sí" : "No";
  if (tipo === "FECHA") {
    // Guardado como YYYY-MM-DD; se muestra en local sin correrse de día.
    const d = new Date(valor + "T00:00:00");
    return isNaN(d.getTime()) ? valor : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (tipo === "NUMERO") {
    const n = Number(valor);
    return isNaN(n) ? valor : new Intl.NumberFormat("es-CO").format(n);
  }
  return valor;
}

export type ResultadoValidacion =
  | { ok: true; valores: Record<string, string> }
  | { ok: false; error: string };

// Valida y normaliza los valores entrantes contra las definiciones. Se asume
// que `entrantes` trae el conjunto COMPLETO de campos de la entidad (así los
// formularios de edición): un campo obligatorio ausente o vacío es un error.
// Devuelve solo las llaves con valor (las vacías no se guardan) ya normalizadas.
export function validarValoresCampos(
  defs: DefinicionCampo[],
  entrantes: Record<string, unknown>
): ResultadoValidacion {
  const valores: Record<string, string> = {};

  for (const def of defs) {
    const bruto = entrantes[def.clave];
    const vacio = bruto == null || (typeof bruto === "string" && bruto.trim() === "");

    if (vacio) {
      if (def.obligatorio) return { ok: false, error: `El campo "${def.etiqueta}" es obligatorio.` };
      continue; // no se guarda: equivale a limpiarlo
    }

    switch (def.tipo) {
      case "TEXTO": {
        const s = String(bruto).trim();
        if (s.length > 2000) return { ok: false, error: `El campo "${def.etiqueta}" es demasiado largo (máx. 2000).` };
        valores[def.clave] = s;
        break;
      }
      case "NUMERO": {
        // El input type="number" del formulario envía el valor canónico
        // ("1500000", "1500.5"), no formateado con separadores de miles.
        const n = Number(String(bruto).trim());
        if (!Number.isFinite(n)) return { ok: false, error: `El campo "${def.etiqueta}" debe ser un número.` };
        valores[def.clave] = String(n);
        break;
      }
      case "FECHA": {
        const s = String(bruto).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: `El campo "${def.etiqueta}" debe ser una fecha válida.` };
        valores[def.clave] = s;
        break;
      }
      case "LISTA": {
        const s = String(bruto).trim();
        if (!def.opciones.includes(s)) return { ok: false, error: `El campo "${def.etiqueta}" tiene un valor fuera de las opciones.` };
        valores[def.clave] = s;
        break;
      }
      case "BOOLEANO": {
        const s = String(bruto).trim().toLowerCase();
        if (["true", "sí", "si", "1"].includes(s)) valores[def.clave] = "true";
        else if (["false", "no", "0"].includes(s)) valores[def.clave] = "false";
        else return { ok: false, error: `El campo "${def.etiqueta}" debe ser Sí o No.` };
        break;
      }
    }
  }

  return { ok: true, valores };
}

// Combina los valores validados con los `extras` ya guardados, preservando las
// llaves que NO gestionan estas definiciones (ej. datos importados u otros
// campos ya borrados) y sobrescribiendo las que sí. Así importados y
// personalizados conviven sin pisarse.
export function mezclarExtras(
  existentes: Record<string, unknown> | null | undefined,
  defs: DefinicionCampo[],
  validados: Record<string, string>
): Record<string, unknown> {
  const gestionadas = new Set(defs.map((d) => d.clave));
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(existentes ?? {})) {
    if (!gestionadas.has(k)) base[k] = v;
  }
  return { ...base, ...validados };
}
