"use client";

import { useEffect, useState } from "react";
import { boton, campo, insignia, type TonoInsignia } from "@/components/ui/estilos";
import { aInputDia, formatoDia, formatoFecha } from "@/lib/fecha-bogota";
import type { EstadoLicencia } from "@/lib/licencias";

// Habilitar, renovar o revocar el Gerente Financiero de un cliente desde el
// panel interno. Solo Evoluteca lo hace, previo pago (ver lib/licencias.ts).

type Licencia = {
  id: string;
  producto: "FINANZAS";
  desde: string;
  hasta: string;
  referenciaPago: string;
  nota: string | null;
  creadaEn: string;
  revocadaEn: string | null;
};

type Respuesta = {
  estados: { FINANZAS: { estado: EstadoLicencia; hasta: string | null } };
  historial: Licencia[];
};

export type ResumenFinanzas = { estado: EstadoLicencia; hasta: string | null };

export const ESTADO_LICENCIA: Record<EstadoLicencia, { label: string; tono: TonoInsignia }> = {
  VIGENTE: { label: "Vigente", tono: "exito" },
  VENCIDA: { label: "Vencida · solo lectura", tono: "alerta" },
  SIN_LICENCIA: { label: "No habilitado", tono: "neutro" },
};

const PERIODOS = [
  { label: "1 mes", meses: 1 },
  { label: "3 meses", meses: 3 },
  { label: "1 año", meses: 12 },
] as const;

const CORTA: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

/** "YYYY-MM-DD" + N meses − 1 día (un año desde el 19 oct cubre hasta el 18 oct). */
function sumarMeses(dia: string, meses: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const fin = new Date(Date.UTC(y, m - 1 + meses, d) - 86_400_000);
  return [fin.getUTCFullYear(), fin.getUTCMonth() + 1, fin.getUTCDate()].map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-");
}

export function LicenciasModulo({ tenantId, tenantNombre, clave, onCambio }: {
  tenantId: string;
  tenantNombre: string;
  clave: string;
  onCambio: (resumen: ResumenFinanzas) => void;
}) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const hoy = aInputDia(new Date());
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(sumarMeses(hoy, 12));
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    let vigente = true;
    fetch(`/api/admin-evoluteca/tenants/${tenantId}/licencias`, { headers: { "x-admin-secret": clave } })
      .then(res => (res.ok ? res.json() : null))
      .then((r: Respuesta | null) => {
        if (!vigente) return;
        if (r) setDatos(r);
        else setError("No se pudieron cargar las licencias.");
      })
      .catch(() => vigente && setError("No se pudieron cargar las licencias."));
    return () => { vigente = false; };
  }, [tenantId, clave]);

  function aplicar(r: Respuesta) {
    setDatos(r);
    onCambio(r.estados.FINANZAS);
  }

  async function habilitar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (referencia.trim().length < 3) {
      setError("Escriba la referencia del pago recibido (factura o transferencia).");
      return;
    }
    if (hasta < desde) {
      setError("La fecha final debe ser igual o posterior a la inicial.");
      return;
    }
    setGuardando(true);
    const res = await fetch(`/api/admin-evoluteca/tenants/${tenantId}/licencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": clave },
      body: JSON.stringify({ producto: "FINANZAS", desde, hasta, referenciaPago: referencia.trim(), nota: nota.trim() || undefined }),
    });
    const r = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      setError(r.error ?? "No se pudo habilitar la licencia.");
      return;
    }
    aplicar(r);
    setReferencia("");
    setNota("");
    setAbierto(false);
  }

  async function revocar(l: Licencia) {
    if (!confirm(`¿Revocar la licencia del Gerente Financiero de "${tenantNombre}" (pago ${l.referenciaPago})? Si no le queda otra vigente, el módulo deja de estar disponible.`)) return;
    setGuardando(true);
    const res = await fetch(`/api/admin-evoluteca/tenants/${tenantId}/licencias/${l.id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": clave },
    });
    setGuardando(false);
    if (!res.ok) {
      setError("No se pudo revocar la licencia.");
      return;
    }
    const r = await fetch(`/api/admin-evoluteca/tenants/${tenantId}/licencias`, { headers: { "x-admin-secret": clave } });
    if (r.ok) aplicar(await r.json());
  }

  const resumen = datos?.estados.FINANZAS;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gerente Financiero</p>
        {resumen && (
          <span className={insignia(ESTADO_LICENCIA[resumen.estado].tono)}>
            {ESTADO_LICENCIA[resumen.estado].label}
            {resumen.hasta && resumen.estado !== "SIN_LICENCIA" && ` · hasta ${formatoDia(resumen.hasta, CORTA)}`}
          </span>
        )}
        <button type="button" disabled={guardando} onClick={() => setAbierto(!abierto)} className={boton("secundario", "sm")}>
          {abierto ? "Cancelar" : resumen?.estado === "SIN_LICENCIA" ? "Habilitar" : "Renovar"}
        </button>
      </div>

      {abierto && (
        <form onSubmit={habilitar} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Referencia del pago
            <input
              value={referencia}
              onChange={e => { setReferencia(e.target.value); setError(""); }}
              placeholder="FE-0142 · transferencia"
              maxLength={120}
              className={campo("sm", "mt-1 block w-56")}
            />
          </label>
          <label className="text-xs text-slate-500">
            Desde
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={campo("sm", "mt-1 block")} />
          </label>
          <label className="text-xs text-slate-500">
            Hasta
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={campo("sm", "mt-1 block")} />
          </label>
          <div className="flex gap-1.5 pb-0.5">
            {PERIODOS.map(p => (
              <button key={p.label} type="button" onClick={() => desde && setHasta(sumarMeses(desde, p.meses))} className={boton("fantasma", "sm")}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="text-xs text-slate-500">
            Nota (opcional)
            <input value={nota} onChange={e => setNota(e.target.value)} maxLength={500} className={campo("sm", "mt-1 block w-48")} />
          </label>
          <button type="submit" disabled={guardando} className={boton("marca", "sm")}>Habilitar licencia</button>
        </form>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {datos && datos.historial.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {datos.historial.map(l => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className={l.revocadaEn ? "line-through" : ""}>
                {formatoDia(l.desde, CORTA)} → {formatoDia(l.hasta, CORTA)} · pago <span className="font-medium text-slate-700">{l.referenciaPago}</span>
                {l.nota && ` · ${l.nota}`}
              </span>
              <span className="text-slate-400">registrada {formatoFecha(l.creadaEn, CORTA)}</span>
              {l.revocadaEn ? (
                <span className="text-slate-400">revocada {formatoFecha(l.revocadaEn, CORTA)}</span>
              ) : (
                <button type="button" disabled={guardando} onClick={() => revocar(l)} className="text-red-600 hover:underline disabled:opacity-50">
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
