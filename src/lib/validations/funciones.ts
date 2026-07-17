import { z } from "zod";
import { nombreRequerido, textoOpcional, enteroOpcional, montoOpcional, fechaValida } from "./campos";

const CANALES = ["PLATAFORMA", "TAQUILLA", "INVITADOS", "EMPRESA"] as const;

// Tope de funciones que puede generar una sola temporada, como red de
// seguridad ante un rango absurdo (p. ej. "todos los días durante 3 años").
export const MAX_FUNCIONES_TEMPORADA = 100;

export const crearFuncionSchema = z.object({
  titulo: nombreRequerido(2, 200),
  fecha: fechaValida,
  sillasTotales: enteroOpcional(100_000),
  sillasVendidas: enteroOpcional(100_000),
  canal: z.enum(CANALES, { error: "Canal inválido" }).optional(),
  ingresoEstimado: montoOpcional().nullable(),
  notas: textoOpcional(2000),
}).refine(
  d => d.sillasVendidas === undefined || d.sillasTotales === undefined || d.sillasVendidas <= d.sillasTotales,
  { message: "Las sillas vendidas no pueden superar el total", path: ["sillasVendidas"] }
);

// Generador de temporada: crea muchas funciones de golpe a partir de un
// patrón (rango de fechas + días de la semana + horarios). No es un registro
// aparte — cada función resultante queda como una Funcion individual, editable
// y con su propia ocupación / asistencias / NPS.
export const crearTemporadaSchema = z.object({
  titulo: nombreRequerido(2, 200),
  // Fechas de calendario (YYYY-MM-DD), sin hora: la hora la ponen los horarios.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha 'desde' inválida"),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha 'hasta' inválida"),
  // Días de la semana en convención JS getDay(): 0=domingo … 6=sábado.
  dias: z.array(z.number().int().min(0).max(6)).min(1, "Selecciona al menos un día de la semana"),
  horarios: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido (HH:mm)"))
    .min(1, "Agrega al menos un horario"),
  sillasTotales: enteroOpcional(100_000),
  sillasVendidas: enteroOpcional(100_000),
  canal: z.enum(CANALES, { error: "Canal inválido" }).optional(),
  ingresoEstimado: montoOpcional().nullable(),
  notas: textoOpcional(2000),
})
  .refine(d => d.desde <= d.hasta, { message: "La fecha 'hasta' debe ser igual o posterior a 'desde'", path: ["hasta"] })
  .refine(
    d => d.sillasVendidas === undefined || d.sillasTotales === undefined || d.sillasVendidas <= d.sillasTotales,
    { message: "Las sillas vendidas no pueden superar el total", path: ["sillasVendidas"] }
  );

export const editarFuncionSchema = z.object({
  titulo: nombreRequerido(2, 200).optional(),
  fecha: fechaValida.optional(),
  sillasTotales: enteroOpcional(100_000),
  sillasVendidas: enteroOpcional(100_000),
  canal: z.enum(CANALES, { error: "Canal inválido" }).optional(),
  ingresoEstimado: montoOpcional().nullable(),
  notas: textoOpcional(2000),
}).refine(
  d => d.sillasVendidas === undefined || d.sillasTotales === undefined || d.sillasVendidas <= d.sillasTotales,
  { message: "Las sillas vendidas no pueden superar el total", path: ["sillasVendidas"] }
);
