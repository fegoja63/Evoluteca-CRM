import { z } from "zod";

// Bloques de campo reutilizables entre los esquemas de cada entidad. Los
// campos "opcionales" aceptan "" (lo que mandan los formularios cuando un
// campo queda vacío) además de undefined, para no romper el comportamiento
// actual del frontend.

export const nombreRequerido = (min = 2, max = 200) =>
  z.string().trim().min(min, `Debe tener al menos ${min} caracteres`).max(max, `Máximo ${max} caracteres`);

export const textoOpcional = (max = 1000) =>
  z.union([z.string().trim().max(max, `Máximo ${max} caracteres`), z.literal("")]).optional();

export const emailOpcional = z.union([z.string().trim().email("Ingresa un correo válido").max(200), z.literal("")]).optional();

export const emailRequerido = z.string().trim().email("Ingresa un correo válido").max(200);

// Regex permisivo: dígitos, espacios, +, -, () y . — cubre formatos locales
// e internacionales sin forzar un formato específico de país.
export const telefonoOpcional = z.union([
  z.string().trim().max(30, "Máximo 30 caracteres").regex(/^[+]?[\d\s\-().]{7,30}$/, "Ingresa un teléfono válido"),
  z.literal(""),
]).optional();

export const urlOpcional = z.union([z.string().trim().max(300, "Máximo 300 caracteres"), z.literal("")]).optional();

// Ids de relaciones (empresaId, contactoId, etc.) — los <select> del frontend
// mandan "" cuando la opción es "Sin empresa"/"Sin contacto".
export const idOpcional = z.union([z.string().uuid("Id inválido"), z.literal("")]).optional().nullable();

export const montoNoNegativo = (max = 999_999_999_999, mensaje = "No puede ser negativo") =>
  z.coerce.number().min(0, mensaje).max(max, "El valor es demasiado alto");

export const enteroNoNegativo = (max = 1_000_000) =>
  z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo").max(max, "El valor es demasiado alto");

export const porcentaje = z.coerce.number().min(0, "Debe ser entre 0 y 100").max(100, "Debe ser entre 0 y 100");

// z.coerce.number() convierte "" en 0 (Number("") === 0 en JS) en vez de
// tratarlo como "sin valor" — sin este preprocesamiento, un campo numérico
// opcional dejado en blanco en un formulario se guardaría como 0 en vez de
// null, cambiando silenciosamente el comportamiento anterior (que usaba
// `valor ? Number(valor) : null`). El .optional() va DENTRO del preprocess:
// si fuera solo en el schema que llama a esta función, "" ya no es
// undefined en el momento en que Zod decide si el campo está "ausente" —
// preprocess transforma primero y el resultado (undefined) necesita que el
// schema que lo valida acepte undefined. Usar estas variantes "Opcional"
// (no las de arriba) para campos numéricos que el usuario puede dejar en
// blanco.
const sinVacio = (v: unknown) => (v === "" || v === null ? undefined : v);

export const montoOpcional = (max = 999_999_999_999, mensaje = "No puede ser negativo") =>
  z.preprocess(sinVacio, montoNoNegativo(max, mensaje).optional());

export const enteroOpcional = (max = 1_000_000) =>
  z.preprocess(sinVacio, enteroNoNegativo(max).optional());

export const porcentajeOpcional = z.preprocess(sinVacio, porcentaje.optional());

export const fechaValida = z.coerce.date({ error: "Fecha inválida" });

export const fechaOpcional = z.union([z.coerce.date({ error: "Fecha inválida" }), z.literal("")]).optional().nullable();

export const horaOpcional = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)"), z.literal("")]).optional().nullable();
