import { Bloque, SkeletonKpis } from "@/components/ui/estados";
import { tarjeta } from "@/components/ui/estilos";

// Se ve mientras el servidor arma el Dashboard (la única página de servidor
// con datos). Imita su forma: banner navy, fila de KPIs y tres columnas.
export default function CargandoDashboard() {
  return (
    <div className="space-y-6">
      <div className="h-32 rounded-2xl bg-brand-950/90 animate-pulse" />
      <SkeletonKpis n={5} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className={tarjeta("p-5 space-y-3")}>
            <Bloque className="h-4 w-1/2" />
            {[0, 1, 2, 3, 4].map(j => <Bloque key={j} className="h-3.5 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
