import type { Balance, Periodo } from "@/lib/finanzas/estados";
import Link from "next/link";
import { IconFileUpload } from "@tabler/icons-react";
import { boton, tarjeta } from "@/components/ui/estilos";
import { SubirPlantilla } from "./subir-plantilla";
import { MesesCargados } from "./meses-cargados";
import { FormBalance } from "./form-balance";

type Props = {
  periodos: Periodo[];
  balance: (Balance & { corte: string }) | null;
  soloLectura: boolean;
};

/**
 * Pantalla "Cargar datos": plantilla mensual, meses cargados y balance a mano.
 * La lectura con IA de los estados del contador tiene su propia pestaña
 * ("Subir estados"); aquí solo se enlaza.
 */
export function CargarDatosFinancieros({ periodos, balance, soloLectura }: Props) {
  return (
    <div className="space-y-6">
      {!soloLectura && (
        <div className={tarjeta("flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50 p-4")}>
          <p className="min-w-0 flex-1 text-sm text-slate-700">
            ¿Tiene el archivo de su contador (cierre del año o meses)? Súbalo y la IA lo lee por usted.
          </p>
          <Link href="/dashboard/finanzas/subir" className={boton("primario", "sm")}>
            <IconFileUpload size={15} stroke={1.75} />Subir estados financieros
          </Link>
        </div>
      )}
      {!soloLectura && <SubirPlantilla />}
      <MesesCargados periodos={periodos} soloLectura={soloLectura} />
      <FormBalance balance={balance} soloLectura={soloLectura} />
    </div>
  );
}
