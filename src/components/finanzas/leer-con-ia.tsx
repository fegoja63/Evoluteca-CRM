"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSparkles, IconUpload } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { formatoDia } from "@/lib/fecha-bogota";
import { totalesBalance, balanceCuadra, type Balance, type Periodo } from "@/lib/finanzas/estados";
import { repartirAcumulado, mesesEntre, type Acumulado } from "@/lib/finanzas/lectura-ia";
import { millones, mesCorto } from "@/lib/finanzas/formato";
import { TablaMeses, enviar } from "./comun";

type Lectura = {
  periodos: Periodo[];
  acumulado: Acumulado | null;
  balance: (Balance & { corte: string }) | null;
  advertencias: string[];
  unidadDocumento: string;
};

const UNIDAD: Record<string, string> = { miles: "miles de pesos", millones: "millones de pesos" };

/** 1. Leer con IA los estados del contador; el usuario revisa y guarda. */
export function LeerConIA() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  // Meses a guardar: los que leyó la IA, o el acumulado repartido si el usuario lo pide.
  const [meses, setMeses] = useState<Periodo[]>([]);
  const [repartido, setRepartido] = useState(false);
  const [guardando, setGuardando] = useState<"meses" | "balance" | null>(null);

  async function leer() {
    if (!archivo) return;
    setLeyendo(true);
    setLectura(null);
    const form = new FormData();
    form.append("archivo", archivo);
    const res = await fetch("/api/finanzas/leer-ia", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setLeyendo(false);
    if (!res.ok) { toast.error(data.error ?? "No se pudo leer el documento."); return; }
    setLectura(data);
    setMeses(data.periodos);
    setRepartido(false);
  }

  async function guardarMeses() {
    setGuardando("meses");
    try {
      await enviar("/api/finanzas/periodos", "PUT", { periodos: meses });
      toast.success(`${meses.length} mes(es) guardado(s).`);
      setMeses([]);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(null);
    }
  }

  async function guardarBalance() {
    if (!lectura?.balance) return;
    setGuardando("balance");
    try {
      await enviar("/api/finanzas/balance", "PUT", lectura.balance);
      toast.success("Balance guardado.");
      setLectura({ ...lectura, balance: null });
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(null);
    }
  }

  const sinNada = lectura && meses.length === 0 && !lectura.acumulado && !lectura.balance;

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <IconSparkles size={18} className="text-brand-600" />1. Leer los estados del contador con IA
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Suba el PDF, una foto o el Excel de los estados financieros tal como se los entregó su contador. La IA propone las cifras
          y usted las revisa antes de guardar. Cuenta como una acción de IA de su plan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={boton("secundario", "sm", "cursor-pointer")}>
          <IconUpload size={15} />{archivo ? archivo.name : "Elegir archivo (PDF, foto o Excel)"}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv" className="sr-only"
            onChange={e => { setArchivo(e.target.files?.[0] ?? null); setLectura(null); }} />
        </label>
        <button type="button" onClick={leer} disabled={!archivo || leyendo} className={boton("marca", "sm")}>
          {leyendo ? "Leyendo… puede tardar un minuto" : "Leer con IA"}
        </button>
      </div>

      {lectura && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {UNIDAD[lectura.unidadDocumento] && (
            <p className="text-xs text-slate-500">El documento venía en {UNIDAD[lectura.unidadDocumento]}; las cifras ya están convertidas a pesos.</p>
          )}
          {lectura.advertencias.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-semibold">Revise esto:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{lectura.advertencias.map(a => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {sinNada && <p className="text-sm text-slate-600">No se encontraron estados financieros en este documento.</p>}

          {lectura.acumulado && !repartido && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                El estado de resultados viene acumulado de <strong>{mesCorto(lectura.acumulado.desde)}</strong> a{" "}
                <strong>{mesCorto(lectura.acumulado.hasta)}</strong>: ventas {millones(lectura.acumulado.ventas)}, costo{" "}
                {millones(lectura.acumulado.costoVentas)}. Para verlo mes a mes se puede repartir en partes iguales; es un promedio
                aproximado, no el dato real de cada mes.
              </p>
              <button type="button" className={boton("secundario", "sm")}
                onClick={() => { setMeses(repartirAcumulado(lectura.acumulado!)); setRepartido(true); }}>
                Repartir en {mesesEntre(lectura.acumulado.desde, lectura.acumulado.hasta).length} meses iguales
              </button>
            </div>
          )}

          {meses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Estado de resultados: <strong>{meses.length}</strong> mes(es){repartido ? " (promedio repartido)" : ""}. Si un mes ya estaba cargado, se reemplaza.
              </p>
              <TablaMeses periodos={meses} />
              <button type="button" onClick={guardarMeses} disabled={guardando !== null} className={boton("primario", "sm")}>
                {guardando === "meses" ? "Guardando…" : `Guardar ${meses.length} mes(es)`}
              </button>
            </div>
          )}

          {lectura.balance && <BalanceLeido balance={lectura.balance} guardando={guardando === "balance"} onGuardar={guardarBalance} />}
        </div>
      )}
    </section>
  );
}

function BalanceLeido({ balance: b, guardando, onGuardar }: { balance: Balance & { corte: string }; guardando: boolean; onGuardar: () => void }) {
  const t = totalesBalance(b);
  const filas: [string, number][] = [
    ["Caja y bancos", b.caja], ["Cuentas por cobrar", b.cuentasPorCobrar], ["Inventario", b.inventario],
    ["Otros activos corrientes", b.otrosActivosCorrientes], ["Activos fijos", b.activosFijos], ["Proveedores", b.proveedores],
    ["Obligaciones financieras CP", b.obligacionesCP], ["Impuestos y laborales", b.impuestosLaborales], ["Deuda de largo plazo", b.deudaLP],
    ["Patrimonio", b.patrimonio],
  ];
  const cuadra = balanceCuadra(b);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">Balance general al <strong>{formatoDia(b.corte)}</strong>:</p>
      <div className="grid gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2">
        {filas.map(([n, v]) => (
          <div key={n} className="flex justify-between gap-2">
            <span className="text-slate-600">{n}</span>
            <span className="tabular-nums">{millones(v)}</span>
          </div>
        ))}
      </div>
      <p className={cn("rounded-lg px-3 py-2 text-sm", cuadra ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
        Activo {millones(t.activoTotal)} · Pasivo + patrimonio {millones(t.pasivoTotal + b.patrimonio)} ·{" "}
        {cuadra ? "cuadra." : `no cuadra por ${millones(t.diferencia)}: revíselo antes de guardar (puede corregirlo abajo después).`}
      </p>
      <button type="button" onClick={onGuardar} disabled={guardando} className={boton("primario", "sm")}>
        {guardando ? "Guardando…" : "Guardar este balance"}
      </button>
    </div>
  );
}
