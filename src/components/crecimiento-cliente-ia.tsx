"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBulb, IconClock, IconPlus, IconSparkles, IconTrendingUp } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { TIPO_SUGERENCIA_LABEL, type ExpansionIA, type Senal } from "@/lib/expansion";

type Resultado = { senales: Senal[]; ia: ExpansionIA | null; iaMensaje: string | null };
type Sugerencia = ExpansionIA["sugerencias"][number];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

// Tarjeta "Oportunidades de crecimiento" de la ficha de un cliente que ya
// compró: señales de momento y sugerencias de qué más ofrecerle. Con un clic
// la sugerencia se vuelve una oportunidad en Prospecto.
export function CrecimientoClienteIA({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState<number | null>(null);

  async function sugerir() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/ia/expansion/${empresaId}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudieron generar sugerencias.");
      else setResultado(d);
    } catch {
      setError("No se pudieron generar sugerencias. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function crear(s: Sugerencia, i: number) {
    setCreando(i);
    const res = await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: s.titulo,
        valor: s.valorEstimado ?? undefined,
        etapa: "PROSPECTO",
        empresaId,
        notas: `Sugerencia de crecimiento (${TIPO_SUGERENCIA_LABEL[s.tipo]}): ${s.razon}`,
      }),
    });
    setCreando(null);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo crear la oportunidad"); return; }
    toast.success("Oportunidad creada en Prospecto");
    router.push(`/dashboard/pipeline/${d.id}`);
  }

  const sugerencias = resultado?.ia?.sugerencias ?? [];

  return (
    <div className={tarjeta("p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center">
          <IconTrendingUp size={20} stroke={1.75} className="text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Oportunidades de crecimiento</h2>
          <p className="text-xs text-slate-500 mt-0.5">Qué más ofrecerle a este cliente, según lo que ya compró.</p>
        </div>
        <button onClick={sugerir} disabled={cargando} className={boton("secundario", "sm", "shrink-0")}>
          <IconSparkles size={14} stroke={2} />
          {cargando ? "Buscando…" : resultado ? "Buscar de nuevo" : "Sugerir con IA"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {resultado && !error && (
        <div className="mt-4 space-y-3">
          {resultado.senales.length > 0 && (
            <ul className="space-y-1">
              {resultado.senales.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <IconClock size={14} stroke={2} className="shrink-0" /> {s.texto}
                </li>
              ))}
            </ul>
          )}

          {sugerencias.length > 0 ? (
            <ul className="space-y-2">
              {sugerencias.map((s, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <IconBulb size={16} stroke={1.75} className="text-brand-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{s.titulo}</span>
                    <span className={insignia("marca")}>{TIPO_SUGERENCIA_LABEL[s.tipo]}</span>
                    {s.valorEstimado != null && <span className="text-xs font-semibold text-emerald-700">≈ {fmt(s.valorEstimado)}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{s.razon}</p>
                  <button onClick={() => crear(s, i)} disabled={creando != null} className={boton("primario", "sm", "mt-2")}>
                    <IconPlus size={14} stroke={2} />
                    {creando === i ? "Creando…" : "Crear oportunidad con esto"}
                  </button>
                </li>
              ))}
            </ul>
          ) : resultado.ia ? (
            <p className="text-sm text-slate-500">No hay suficiente historial para sugerir algo con fundamento.</p>
          ) : null}

          {resultado.iaMensaje && <p className="text-xs text-slate-500">{resultado.iaMensaje}</p>}
        </div>
      )}
    </div>
  );
}
