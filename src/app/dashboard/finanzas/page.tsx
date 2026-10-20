import Link from "next/link";
import { redirect } from "next/navigation";
import { IconCoin, IconFileSpreadsheet, IconChartLine, IconAlertTriangle, IconAdjustments, IconSparkles } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { estadoLicencia, type EstadoLicencia } from "@/lib/licencias";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, insignia, tarjeta, type TonoInsignia } from "@/components/ui/estilos";

export const dynamic = "force-dynamic";

// Entrada del Gerente Financiero. Por ahora muestra el estado de la licencia
// y lo que trae el módulo; las pantallas de cada función llegan por fases.
const ESTADO: Record<EstadoLicencia, { label: string; tono: TonoInsignia }> = {
  VIGENTE: { label: "Activo", tono: "exito" },
  VENCIDA: { label: "Licencia vencida", tono: "alerta" },
  SIN_LICENCIA: { label: "No habilitado", tono: "neutro" },
};

const FUNCIONES = [
  { icon: IconFileSpreadsheet, titulo: "Estados financieros", texto: "Cargue su balance y estado de resultados (Excel, PDF o foto) y véalos ordenados con sus indicadores." },
  { icon: IconChartLine, titulo: "Caja proyectada", texto: "Cuánto dinero tendrá en las próximas semanas, con lo que se espera cobrar y pagar." },
  { icon: IconAlertTriangle, titulo: "Alerta de días de caja", texto: "Aviso a tiempo cuando la caja alcance para pocos días, y su punto de equilibrio." },
  { icon: IconAdjustments, titulo: "Simulador", texto: "Qué pasa si sube un costo, baja una venta o se demora un cobro." },
  { icon: IconSparkles, titulo: "Gerente con IA", texto: "Pregúntele por sus números y reciba un informe claro, en lenguaje sencillo." },
];

export default async function FinanzasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { estado, hasta } = await estadoLicencia(session.user.tenantId, "FINANZAS");
  const e = ESTADO[estado];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <IconCoin size={26} stroke={1.75} className="text-brand-600" />
            Gerente Financiero
          </h1>
          <p className="mt-1 text-sm text-slate-500">Los números de su empresa, claros y a tiempo para decidir.</p>
        </div>
        <span className={insignia(e.tono)}>{e.label}</span>
      </div>

      <div className={tarjeta("p-5")}>
        {estado === "VIGENTE" && (
          <p className="text-sm text-slate-700">
            Su módulo está activo hasta el <strong>{formatoDia(hasta!)}</strong>. Las funciones se irán habilitando en esta
            pantalla a medida que estén listas.
          </p>
        )}
        {estado === "VENCIDA" && (
          <p className="text-sm text-slate-700">
            La licencia venció el <strong>{formatoDia(hasta!)}</strong>. Puede seguir consultando su información, pero no
            modificarla. Comuníquese con Evoluteca para renovarla.
          </p>
        )}
        {estado === "SIN_LICENCIA" && (
          <p className="text-sm text-slate-700">
            Este módulo no está habilitado para su empresa. Comuníquese con Evoluteca para activarlo.
          </p>
        )}
        {estado !== "VIGENTE" && (
          <Link href="/dashboard/ayuda" className={boton("primario", "sm", "mt-3")}>Contactar a Evoluteca</Link>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lo que trae el módulo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map(f => (
            <div key={f.titulo} className={tarjeta("p-4")}>
              <div className="flex items-center justify-between gap-2">
                <f.icon size={20} stroke={1.75} className="text-brand-600" />
                <span className={insignia("neutro")}>Próximamente</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">{f.titulo}</p>
              <p className="mt-1 text-xs text-slate-500">{f.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
