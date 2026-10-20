/**
 * Licencias de módulos de pago (hoy: el Gerente Financiero, `FINANZAS`).
 *
 * Solo Evoluteca las habilita, desde /admin-evoluteca/clientes, previo pago:
 * no viven en `Tenant.modulos` porque ese objeto lo puede editar el ADMIN del
 * propio tenant desde Configuración.
 *
 * Cada habilitación es una fila de `LicenciaModulo` con su referencia de pago;
 * renovar suma una fila nueva y revocar marca `revocadaEn`. El estado de un
 * producto sale de todas sus filas no revocadas:
 *  - VIGENTE: alguna cubre hoy (desde ≤ hoy ≤ hasta, días de Bogotá).
 *  - VENCIDA: tuvo licencia pero ya no cubre hoy → el módulo queda en solo
 *    lectura (los datos nunca se borran).
 *  - SIN_LICENCIA: nunca la tuvo, o todas fueron revocadas o empiezan después.
 *
 * Las rutas del módulo validan aquí, en el servidor; esconder el menú no basta.
 */
import { NextResponse } from "next/server";
import type { ProductoLicencia } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EstadoLicencia = "VIGENTE" | "VENCIDA" | "SIN_LICENCIA";

export type ResumenLicencia = {
  estado: EstadoLicencia;
  /** Último día cubierto por la licencia vigente o, si venció, por la última. */
  hasta: Date | null;
};

type Periodo = { desde: Date; hasta: Date; revocadaEn: Date | null };

const UN_DIA = 86_400_000;

/** `hasta` es la medianoche (Bogotá) del último día: la licencia cubre ese día completo. */
function finDelDia(hasta: Date): number {
  return hasta.getTime() + UN_DIA;
}

/** Estado de un producto a partir de sus filas de licencia (función pura). */
export function resumirLicencias(filas: Periodo[], ahora: Date = new Date()): ResumenLicencia {
  const validas = filas.filter(f => !f.revocadaEn);
  const t = ahora.getTime();

  const vigentes = validas.filter(f => f.desde.getTime() <= t && t < finDelDia(f.hasta));
  if (vigentes.length) {
    const hasta = vigentes.reduce((max, f) => (f.hasta > max ? f.hasta : max), vigentes[0].hasta);
    return { estado: "VIGENTE", hasta };
  }

  const pasadas = validas.filter(f => finDelDia(f.hasta) <= t);
  if (pasadas.length) {
    const hasta = pasadas.reduce((max, f) => (f.hasta > max ? f.hasta : max), pasadas[0].hasta);
    return { estado: "VENCIDA", hasta };
  }

  return { estado: "SIN_LICENCIA", hasta: null };
}

export async function estadoLicencia(
  tenantId: string,
  producto: ProductoLicencia,
  ahora: Date = new Date(),
): Promise<ResumenLicencia> {
  const filas = await prisma.licenciaModulo.findMany({
    where: { tenantId, producto },
    select: { desde: true, hasta: true, revocadaEn: true },
  });
  return resumirLicencias(filas, ahora);
}

/**
 * Guarda para las rutas de un módulo de pago. Devuelve una respuesta de error
 * si el tenant no puede usar el producto, o `null` si puede seguir.
 *
 * `uso: "leer"` deja pasar una licencia VENCIDA (solo lectura); `"editar"` exige VIGENTE.
 */
export async function exigirLicencia(
  tenantId: string,
  producto: ProductoLicencia,
  uso: "leer" | "editar",
): Promise<NextResponse | null> {
  const { estado } = await estadoLicencia(tenantId, producto);
  if (estado === "VIGENTE") return null;
  if (estado === "VENCIDA" && uso === "leer") return null;
  return NextResponse.json(
    {
      error: estado === "VENCIDA"
        ? "La licencia de este módulo venció: puede consultar la información, pero no modificarla. Comuníquese con Evoluteca para renovarla."
        : "Este módulo no está habilitado para su empresa. Comuníquese con Evoluteca para activarlo.",
      licencia: estado,
    },
    { status: 403 },
  );
}
