import type { Balance, Periodo } from "@/lib/finanzas/estados";
import { SubirPlantilla } from "./subir-plantilla";
import { MesesCargados } from "./meses-cargados";
import { FormBalance } from "./form-balance";

type Props = {
  periodos: Periodo[];
  balance: (Balance & { corte: string }) | null;
  soloLectura: boolean;
};

/** Pantalla "Cargar datos": plantilla mensual, meses cargados y balance. */
export function CargarDatosFinancieros({ periodos, balance, soloLectura }: Props) {
  return (
    <div className="space-y-6">
      {!soloLectura && <SubirPlantilla />}
      <MesesCargados periodos={periodos} soloLectura={soloLectura} />
      <FormBalance balance={balance} soloLectura={soloLectura} />
    </div>
  );
}
