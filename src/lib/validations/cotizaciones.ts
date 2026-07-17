import { z } from "zod";
import { textoOpcional, idOpcional, montoNoNegativo, montoOpcional, enteroOpcional, porcentajeOpcional, fechaOpcional, horaOpcional } from "./campos";

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

// Línea de ahorro estimado por área (modalidad SUCCESS_FEE).
const lineaAhorroSchema = z.object({
  area: z.string().trim().min(1, "El área es obligatoria").max(120),
  gastoBaseMensual: montoNoNegativo(999_999_999_999, "El gasto base no puede ser negativo"),
  ahorroEstimadoMensual: montoNoNegativo(999_999_999_999, "El ahorro no puede ser negativo"),
});

export const crearCotizacionSchema = z.object({
  empresaId: idOpcional,
  contactoId: idOpcional,
  oportunidadId: idOpcional,
  salonId: idOpcional,
  numeroManual: textoOpcional(40),
  fechaEvento: fechaOpcional,
  horaInicio: horaOpcional,
  horaFin: horaOpcional,
  sede: textoOpcional(200),
  notas: textoOpcional(2000),
  condicionesComerciales: textoOpcional(4000),
  fechaValidez: fechaOpcional,
  modalidad: z.enum(["FEE_FIJO", "SUCCESS_FEE", "FEE_MENSUAL"]).optional().default("FEE_FIJO"),
  items: z.array(itemSchema).optional().default([]),
  // Success fee y fee mensual:
  lineasAhorro: z.array(lineaAhorroSchema).optional().default([]),
  porcentajeHonorarios: porcentajeOpcional.nullable(),
  horizonteMeses: enteroOpcional(600).nullable(),
  feeMensual: montoOpcional(999_999_999_999, "El fee mensual no puede ser negativo").nullable(),
  impuestoNombre: textoOpcional(60),
  impuestoPorcentaje: porcentajeOpcional.nullable(),
  impuesto2Nombre: textoOpcional(60),
  impuesto2Porcentaje: porcentajeOpcional.nullable(),
}).superRefine((data, ctx) => {
  if (data.modalidad === "SUCCESS_FEE") {
    if (data.lineasAhorro.length === 0)
      ctx.addIssue({ code: "custom", path: ["lineasAhorro"], message: "Agrega al menos una línea de ahorro" });
    if (data.porcentajeHonorarios == null)
      ctx.addIssue({ code: "custom", path: ["porcentajeHonorarios"], message: "Indica el % de honorarios" });
    if (data.horizonteMeses == null)
      ctx.addIssue({ code: "custom", path: ["horizonteMeses"], message: "Indica el horizonte en meses" });
  } else if (data.modalidad === "FEE_MENSUAL") {
    if (data.feeMensual == null)
      ctx.addIssue({ code: "custom", path: ["feeMensual"], message: "Indica el fee mensual" });
    if (data.horizonteMeses == null)
      ctx.addIssue({ code: "custom", path: ["horizonteMeses"], message: "Indica el horizonte en meses" });
  } else if (data.items.length === 0) {
    ctx.addIssue({ code: "custom", path: ["items"], message: "Agrega al menos un ítem" });
  }
});

export const editarCotizacionSchema = z.object({
  estado: z.enum(["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA"], { error: "Estado inválido" }).optional(),
  numeroManual: textoOpcional(40),
  notas: textoOpcional(2000),
  condicionesComerciales: textoOpcional(4000),
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
