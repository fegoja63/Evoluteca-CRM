"use client";

import { useEffect, useState } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type Uso = { limite: number | null; usados: number; periodo: string; iaConfigurada: boolean };

/** Avisa a los contadores de cupo que se gastó una acción de IA (para refrescarlos). */
export function avisarUsoIA() {
  window.dispatchEvent(new Event("cupo-ia:actualizar"));
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-11" → "1 de dic" (el cupo se renueva el día 1 del mes siguiente). */
function renovacion(periodo: string): string {
  const m = Number(periodo.slice(5, 7));
  return `1 de ${MESES[m % 12]}`;
}

/**
 * Cuántos créditos de IA gasta una función y cuántos le quedan a la empresa
 * este mes. El cupo es mensual, del plan de la empresa (por ejemplo 100), y lo
 * comparten todas las funciones de IA del CRM y del Gerente Financiero.
 */
export function CupoIA({ consumo = 1, className }: { consumo?: number; className?: string }) {
  const [uso, setUso] = useState<Uso | null>(null);

  useEffect(() => {
    const cargar = () => fetch("/api/ia/uso", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null)).then(setUso).catch(() => {});
    cargar();
    window.addEventListener("cupo-ia:actualizar", cargar);
    return () => window.removeEventListener("cupo-ia:actualizar", cargar);
  }, []);

  const gasta = `Usa ${consumo} crédito${consumo === 1 ? "" : "s"} de IA`;
  let resto = "";
  let tono = "text-slate-500";
  if (uso && uso.limite === 0) { resto = "La IA no está incluida en su plan"; tono = "text-red-600"; }
  else if (uso && uso.limite == null) resto = `Su plan no tiene límite (${uso.usados} usados este mes)`;
  else if (uso && uso.limite != null) {
    const quedan = Math.max(0, uso.limite - uso.usados);
    resto = quedan === 0
      ? `Ya usó los ${uso.limite} créditos de este mes; se renuevan el ${renovacion(uso.periodo)}`
      : `Le quedan ${quedan} de ${uso.limite} este mes (se renuevan el ${renovacion(uso.periodo)})`;
    if (quedan === 0) tono = "text-red-600"; else if (quedan <= uso.limite * 0.1) tono = "text-amber-700";
  }

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-xs", tono, className)}
      title="Cupo mensual de IA de su plan, compartido por todas las funciones de IA de la empresa.">
      <IconSparkles size={13} className="shrink-0 text-brand-500" />
      <span className="font-semibold">{gasta}</span>
      {resto && <span>· {resto}</span>}
    </p>
  );
}
