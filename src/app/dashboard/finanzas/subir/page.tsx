import Link from "next/link";
import { accesoPaginaFinanzas } from "@/lib/finanzas/datos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { LeerConIA } from "@/components/finanzas/leer-con-ia";
import { tarjeta } from "@/components/ui/estilos";

export const dynamic = "force-dynamic";

// Pestaña "Subir estados": la lectura con IA de los estados del contador, sola
// y a la vista (antes estaba mezclada con la plantilla y los formularios de
// "Cargar a mano"). Al lado, qué pasa después y cuánto cupo de IA gasta.
export default async function SubirEstadosPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      {acceso.soloLectura ? (
        <p className={tarjeta("p-5 text-sm text-slate-500")}>La licencia no está vigente: el módulo está en solo lectura.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <LeerConIA />
          <aside className={tarjeta("h-fit space-y-4 p-5 text-sm text-slate-600")}>
            <div>
              <h2 className="font-semibold text-slate-800">Qué pasa al subirlo</h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>La IA lee el estado de resultados y el balance, y los convierte a pesos.</li>
                <li>Usted revisa las cifras y lo que la IA le pide verificar.</li>
                <li>Con &quot;Guardar todo lo leído&quot; quedan en Resumen, Estados, Indicadores, Caja e Informe.</li>
              </ol>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">¿Mensuales o cierre anual?</h2>
              <p className="mt-1">
                Sirven los dos, pero <strong>no dan los mismos resultados</strong>:
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li><strong>Cierre anual</strong> (el año contra el anterior, como lo entrega el contador): análisis año contra año con la utilidad real del contador. No hay detalle mes a mes; la caja usa promedios.</li>
                <li><strong>Estados mensuales</strong>: comparan mes a mes, muestran la temporada y proyectan los próximos meses. Si no traen el impuesto, se estima al 35 %.</li>
              </ul>
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                <strong>Lo ideal:</strong> subir el cierre anual auditado del año pasado y, además, los meses del año en curso. Así tiene la
                utilidad real del contador y también la caja, la temporada y la proyección al día.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Créditos de IA</h2>
              <p className="mt-1">
                Cada lectura usa <strong>1 crédito</strong>, igual que cada informe del mes y cada consulta al gerente con IA.
                Los créditos son un cupo <strong>mensual del plan de su empresa</strong> (por ejemplo 100 al mes), compartido
                por todas las funciones de IA y por todos sus usuarios. Se renueva el día 1 de cada mes.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              ¿Prefiere escribir las cifras usted mismo o usar la plantilla de Excel?{" "}
              <Link href="/dashboard/finanzas/cargar" className="font-semibold text-brand-700 hover:underline">Cargar a mano</Link>
            </p>
          </aside>
        </div>
      )}
    </MarcoFinanzas>
  );
}
