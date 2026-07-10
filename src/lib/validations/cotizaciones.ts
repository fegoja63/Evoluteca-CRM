import { z } from "zod";
import { textoOpcional, idOpcional, montoNoNegativo, porcentajeOpcional, fechaOpcional, horaOpcional } from "./campos";

const itemSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción del ítem es obligatoria").max(300),
  // "" (campo vacío) debe caer al valor por defecto (1), no a 0 — z.coerce
  // sin preprocesar convertiría "" en 0 y rompería la validación mínima.
  cantidad: z.preprocess(
    v => (v === "" || v === null ? undefined : v),
    z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0").max(1_000_000, "Cantidad demasiado alta").optional()
  ),
  precioUnit: montoNoNegativo(999_999_999, "El precio no puede ser negativo"),
});

export const crearCotizacionSchema = z.object({
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
  salonId: idOpcional,
  fechaEvento: fechaOpcional,
  horaInicio: horaOpcional,
  horaFin: horaOpcional,
  sede: textoOpcional(200),
  notas: textoOpcional(2000),
  fechaValidez: fechaOpcional,
  items: z.array(itemSchema).min(1, "Agrega al menos un ítem"),
  impuestoNombre: textoOpcional(60),
  impuestoPorcentaje: porcentajeOpcional.nullable(),
  impuesto2Nombre: textoOpcional(60),
  impuesto2Porcentaje: porcentajeOpcional.nullable(),
});

export const editarCotizacionSchema = z.object({
  estado: z.enum(["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA"], { error: "Estado inválido" }).optional(),
  notas: textoOpcional(2000),
  empresaId: idOpcional,
  motivoRechazo: textoOpcional(1000),
  fechaEvento: fechaOpcional,
  horaInicio: horaOpcional,
  horaFin: horaOpcional,
  impuestoNombre: textoOpcional(60),
  impuestoPorcentaje: porcentajeOpcional.nullable(),
  impuesto2Nombre: textoOpcional(60),
  impuesto2Porcentaje: porcentajeOpcional.nullable(),
});

export const enviarEmailCotizacionSchema = z.object({
  email: z.union([z.string().trim().email("Ingresa un correo válido"), z.literal("")]).optional(),
});
