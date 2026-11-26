"use client";

import { useCallback, useEffect, useState } from "react";
import { IconTargetArrow, IconPencil, IconFlag, IconCheck, IconX } from "@tabler/icons-react";
import { boton, campo, insignia, tarjeta, cx } from "@/components/ui/estilos";
import { INDICADORES, type ClaveIndicador, type Conteo, type Cumplimiento } from "@/lib/actividad-semanal";

type Vendedor = {
  id: string;
  nombre: string;
  meta: Conteo | null;
  compromiso: (Conteo & { nota: string | null }) | null;
  real: Conteo;
  anterior: { compromiso: (Conteo & { nota: string | null }) | null; real: Conteo; cumplimiento: Cumplimiento | null };
};
type Datos = {
  semana: string; texto: string; esActual: boolean; anterior: string; textoAnterior: string;
  puedeEditarMetas: boolean; editable: boolean; vendedores: Vendedor[];
};
type Edicion = { userId: string; tipo: "compromiso" | "meta" } | null;

function colorPct(p: number) {
  return p >= 80 ? "exito" : p >= 50 ? "alerta" : "peligro";
}

// "Reunión semanal": metas de actividad y compromisos medibles por vendedor.
// La reunión del lunes deja de ser de excusas: cada uno se compromete con
// cifras (contactos, negocios, llamadas, reuniones, propuestas) y el CRM cuenta
// solo lo que hizo con lo que ya se registra.
export function ReunionSemanal() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [edicion, setEdicion] = useState<Edicion>(null);

  const cargar = useCallback(() => {
    fetch("/api/compromisos", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setError(true));
  }, []);
  useEffect(cargar, [cargar]);

  if (error) return null;
  if (!d) return <div className="mb-8 h-40 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />;

  // Tarjeta completa para quien tiene algo (o se está editando); el resto, en
  // una línea compacta para no llenar la pantalla de tarjetas en cero.
  const conTarjeta = d.vendedores.filter(v => conDatos(v) || edicion?.userId === v.id);
  const sinNada = d.vendedores.filter(v => !conTarjeta.includes(v));

  return (
    <div className="mb-8">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <IconTargetArrow size={18} stroke={1.75} className="text-brand-600" />
        <span className="text-sm font-bold text-slate-800">Reunión semanal</span>
        <span className="text-xs text-slate-400">compromisos medibles · semana del {d.texto}</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        &ldquo;Voy a vender más&rdquo; es una intención; &ldquo;esta semana hago 15 llamadas y 3 propuestas&rdquo; es un compromiso que se mide.
        Cada vendedor deja sus cifras de la semana y el CRM cuenta solo lo que hizo. El próximo lunes se ve lo prometido frente a lo cumplido.
      </p>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {conTarjeta.map(v => (
          <TarjetaVendedor
            key={v.id} v={v} d={d}
            edicion={edicion?.userId === v.id ? edicion.tipo : null}
            onEditar={tipo => setEdicion(tipo ? { userId: v.id, tipo } : null)}
            onGuardado={() => { setEdicion(null); cargar(); }}
          />
        ))}
      </div>

      {sinNada.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{conTarjeta.length ? "Sin metas, compromisos ni actividad esta semana:" : "Nadie tiene aún metas ni compromisos. Empiece por:"}</span>
          {sinNada.map(v => (
            <button key={v.id} type="button" className={boton("secundario", "sm")}
              onClick={() => setEdicion({ userId: v.id, tipo: d.editable ? "compromiso" : "meta" })}>
              {v.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ¿Tiene algo que mostrar? (meta, compromiso, o actividad esta semana o la anterior)
function conDatos(v: Vendedor) {
  return !!(v.meta || v.compromiso || v.anterior.compromiso || INDICADORES.some(i => v.real[i.clave] > 0 || v.anterior.real[i.clave] > 0));
}

function TarjetaVendedor({ v, d, edicion, onEditar, onGuardado }: {
  v: Vendedor; d: Datos; edicion: "compromiso" | "meta" | null;
  onEditar: (tipo: "compromiso" | "meta" | null) => void; onGuardado: () => void;
}) {
  const c = v.anterior.cumplimiento;
  return (
    <div className={tarjeta("p-4")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{v.nombre}</span>
        {c ? (
          <span className={insignia(colorPct(c.pct ?? 0))} title={`Semana del ${d.textoAnterior}`}>
            Semana pasada: cumplió {c.cumplidos} de {c.total} ({c.pct} %)
          </span>
        ) : (
          <span className={insignia("neutro")}>Sin compromiso la semana pasada</span>
        )}
      </div>

      {edicion ? (
        <FormCifras v={v} tipo={edicion} semana={d.semana} onCancelar={() => onEditar(null)} onGuardado={onGuardado} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 text-left font-medium">Indicador</th>
                  <th className="py-1 text-right font-medium" title="Meta semanal estándar">Meta</th>
                  <th className="py-1 text-right font-medium" title="Lo que se comprometió esta semana">Compromiso</th>
                  <th className="py-1 pl-3 text-left font-medium" title="Lo que lleva hecho esta semana">Lleva</th>
                  <th className="py-1 text-right font-medium" title={`Semana del ${d.textoAnterior}: prometido → hecho`}>Sem. pasada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {INDICADORES.map(i => (
                  <FilaIndicador key={i.clave} clave={i.clave} etiqueta={i.etiqueta} ayuda={i.ayuda} v={v} />
                ))}
              </tbody>
            </table>
          </div>
          {v.compromiso?.nota && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
              <IconFlag size={14} className="mt-0.5 shrink-0 text-brand-500" /> {v.compromiso.nota}
            </p>
          )}
          {v.anterior.compromiso?.nota && (
            <p className="mt-1 text-2xs text-slate-400">Semana pasada se comprometió a: {v.anterior.compromiso.nota}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {d.editable && (
              <button type="button" className={boton("marca", "sm")} onClick={() => onEditar("compromiso")}>
                <IconPencil size={14} /> {v.compromiso ? "Corregir compromiso" : "Registrar compromiso"}
              </button>
            )}
            {d.puedeEditarMetas && (
              <button type="button" className={boton("secundario", "sm")} onClick={() => onEditar("meta")}>
                {v.meta ? "Cambiar meta semanal" : "Fijar meta semanal"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilaIndicador({ clave, etiqueta, ayuda, v }: { clave: ClaveIndicador; etiqueta: string; ayuda: string; v: Vendedor }) {
  const meta = v.meta?.[clave] ?? 0;
  const comp = v.compromiso?.[clave] ?? 0;
  const real = v.real[clave];
  // La barra mide contra el compromiso; si no hay, contra la meta.
  const objetivo = comp || meta;
  const pct = objetivo ? Math.min(100, Math.round((real / objetivo) * 100)) : 0;
  const prometidoAnt = v.anterior.compromiso?.[clave] ?? 0;
  const realAnt = v.anterior.real[clave];
  return (
    <tr>
      <td className="py-1.5 pr-2 text-slate-700" title={ayuda}>{etiqueta}</td>
      <td className="py-1.5 text-right tabular-nums text-slate-500">{meta || "—"}</td>
      <td className="py-1.5 text-right tabular-nums font-semibold text-slate-800">{comp || "—"}</td>
      <td className="py-1.5 pl-3">
        <div className="flex items-center gap-2">
          <span className="w-6 text-right tabular-nums font-semibold text-slate-800">{real}</span>
          {objetivo > 0 && (
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
              <div className={cx("h-full rounded-full", pct >= 100 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-300")} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
        {prometidoAnt > 0 ? (
          <span className={cx("inline-flex items-center gap-0.5", realAnt >= prometidoAnt ? "text-emerald-700" : "text-red-600")}>
            {prometidoAnt} → {realAnt}
            {realAnt >= prometidoAnt ? <IconCheck size={12} /> : <IconX size={12} />}
          </span>
        ) : (
          <span className="text-slate-400">{realAnt > 0 ? `— → ${realAnt}` : "—"}</span>
        )}
      </td>
    </tr>
  );
}

function FormCifras({ v, tipo, semana, onCancelar, onGuardado }: {
  v: Vendedor; tipo: "compromiso" | "meta"; semana: string; onCancelar: () => void; onGuardado: () => void;
}) {
  // El compromiso arranca con lo ya registrado o, si no hay, con la meta.
  const base = tipo === "meta" ? v.meta : (v.compromiso ?? v.meta);
  const [valores, setValores] = useState<Record<ClaveIndicador, string>>(
    () => Object.fromEntries(INDICADORES.map(i => [i.clave, String(base?.[i.clave] || "")])) as Record<ClaveIndicador, string>,
  );
  const [nota, setNota] = useState(tipo === "compromiso" ? v.compromiso?.nota ?? "" : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo: Record<string, unknown> = { userId: v.id };
    for (const i of INDICADORES) cuerpo[i.clave] = Number(valores[i.clave] || 0);
    if (tipo === "compromiso") { cuerpo.semana = semana; cuerpo.nota = nota; }
    const r = await fetch(tipo === "meta" ? "/api/metas-actividad" : "/api/compromisos", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
    });
    setGuardando(false);
    if (r.ok) onGuardado();
    else setError((await r.json().catch(() => null))?.error ?? "No se pudo guardar");
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <p className="text-xs text-slate-500">
        {tipo === "meta"
          ? "Meta semanal estándar: el ritmo de actividad que se espera cada semana. Deje en 0 lo que no aplique."
          : "Compromiso de esta semana: cifras concretas que se puedan medir. Deje en 0 lo que no aplique."}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {INDICADORES.map(i => (
          <label key={i.clave} className="text-2xs font-medium text-slate-600" title={i.ayuda}>
            {i.corta}
            <input
              type="number" min={0} max={10000} inputMode="numeric"
              className={campo("sm", "mt-0.5")}
              value={valores[i.clave]}
              onChange={e => setValores(x => ({ ...x, [i.clave]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {tipo === "compromiso" && (
        <label className="block text-2xs font-medium text-slate-600">
          Compromiso adicional (opcional)
          <input
            type="text" maxLength={500} placeholder="Ej.: cerrar la renovación de Clínica Norte"
            className={campo("sm", "mt-0.5")} value={nota} onChange={e => setNota(e.target.value)}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className={boton("primario", "sm")}>{guardando ? "Guardando…" : "Guardar"}</button>
        <button type="button" onClick={onCancelar} className={boton("fantasma", "sm")}>Cancelar</button>
      </div>
    </form>
  );
}
