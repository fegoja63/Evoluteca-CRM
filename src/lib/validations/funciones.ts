import { z } from "zod";
import { nombreRequerido, textoOpcional, enteroOpcional, montoOpcional, fechaValida } from "./campos";

const CANALES = ["PLATAFORMA", "TAQUILLA", "INVITADOS", "EMPRESA"] as const;

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
