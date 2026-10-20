import Link from "next/link";
import { IconCoin } from "@tabler/icons-react";
import type { ResumenLicencia } from "@/lib/licencias";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { PestanasFinanzas } from "./pestanas-finanzas";

/** Título, estado de la licencia y pestañas, común a todas las pantallas del módulo. */
export function MarcoFinanzas({ licencia, children }: { licencia: ResumenLicencia; children: React.ReactNode }) {
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
        {licencia.estado === "VIGENTE" && licencia.hasta && (
          <span className={insignia("exito")}>Activo hasta el {formatoDia(licencia.hasta)}</span>
        )}
        {licencia.estado === "VENCIDA" && <span className={insignia("alerta")}>Licencia vencida · solo lectura</span>}
      </div>
      <PestanasFinanzas />
      {licencia.estado === "VENCIDA" && licencia.hasta && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La licencia venció el {formatoDia(licencia.hasta)}. Puede consultar su información, pero no modificarla.{" "}
          <Link href="/dashboard/ayuda" className="font-semibold underline">Contactar a Evoluteca</Link> para renovarla.
        </div>
      )}
      {children}
    </div>
  );
}

/** Cuando el usuario no puede entrar: comercial, o el tenant no tiene licencia. */
export function SinAccesoFinanzas({ motivo }: { motivo: "rol" | "licencia" }) {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <IconCoin size={26} stroke={1.75} className="text-brand-600" />
        Gerente Financiero
      </h1>
      <div className={tarjeta("p-5 text-sm text-slate-700")}>
        {motivo === "rol"
          ? "Las finanzas de la empresa las consultan el Administrador y el Gerente."
          : "Este módulo no está habilitado para su empresa. Comuníquese con Evoluteca para activarlo."}
        {motivo === "licencia" && (
          <div><Link href="/dashboard/ayuda" className={boton("primario", "sm", "mt-3")}>Contactar a Evoluteca</Link></div>
        )}
      </div>
    </div>
  );
}
