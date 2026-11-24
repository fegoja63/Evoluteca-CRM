import type { Balance, Periodo } from "@/lib/finanzas/estados";
import Link from "next/link";
import { SubirPlantilla } from "./subir-plantilla";
import { MesesCargados } from "./meses-cargados";
import { FormBalance } from "./form-balance";

type Props = {
  periodos: Periodo[];
  balance: (Balance & { corte: string }) | null;
  soloLectura: boolean;
};

/**
 * Pantalla "Cargar a mano": plantilla mensual, meses cargados y balance a mano.
 * La lectura con IA de los estados del contador tiene su propia pestaña
 * ("Subir estados"); aquí solo se menciona con un enlace discreto.
 */
export function CargarDatosFinancieros({ periodos, balance, soloLectura }: Props) {
  return (
    <div className="space-y-6">
      {!soloLectura && (
        <p className="text-sm text-slate-600">
          Aquí escribe las cifras usted mismo o usa la plantilla de Excel. Si tiene el archivo de su contador, es más fácil en la
          pestaña{" "}
          <Link href="/dashboard/finanzas/subir" className="font-semibold text-brand-700 hover:underline">Subir estados</Link>: la IA lo lee por usted.
        </p>
      )}
      {!soloLectura && <SubirPlantilla />}
      <MesesCargados periodos={periodos} soloLectura={soloLectura} />
      <FormBalance balance={balance} soloLectura={soloLectura} />
    </div>
  );
}
