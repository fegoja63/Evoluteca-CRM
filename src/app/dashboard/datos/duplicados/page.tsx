"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IconUsers, IconBuilding, IconAlertTriangle, IconArrowLeft, IconCheck, IconLoader2,
} from "@tabler/icons-react";
import { puedeEliminar } from "@/lib/permisos";
import { toast } from "@/lib/toast";

type Registro = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  creadoEn: string;
  detalle: string | null;
  conteos: Record<string, number> & { total: number };
};
type Racimo = { registros: Registro[] };
type Tipo = "contactos" | "empresas";

// Estado de selección por racimo: cuál se conserva y cuáles se excluyen de la fusión.
type Seleccion = { sobrevivienteId: string; excluidos: Set<string> };

const ETIQUETA_CONTEO: Record<string, string> = {
  oportunidades: "oportunidades", actividades: "tareas", cotizaciones: "cotizaciones",
  correos: "correos", adjuntos: "adjuntos", timeline: "eventos", contactos: "contactos",
  expedientes: "expedientes",
};

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default function DuplicadosPage() {
  const { data: session, status } = useSession();
  const rol = session?.user?.rol;
  const autorizado = puedeEliminar(rol);

  const [tipo, setTipo] = useState<Tipo>("contactos");
  const [racimos, setRacimos] = useState<Racimo[]>([]);
  const [sel, setSel] = useState<Record<number, Seleccion>>({});
  const [cargando, setCargando] = useState(true);
  const [fusionando, setFusionando] = useState<number | null>(null);

  const cargar = useCallback(async (t: Tipo) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/duplicados?tipo=${t}`);
      const data = await res.json();
      const rs: Racimo[] = data.racimos ?? [];
      setRacimos(rs);
      // Por defecto se conserva el más antiguo (primero, orden asc) y no se excluye ninguno.
      const inicial: Record<number, Seleccion> = {};
      rs.forEach((r, i) => { inicial[i] = { sobrevivienteId: r.registros[0].id, excluidos: new Set() }; });
      setSel(inicial);
    } catch {
      toast.error("No se pudieron cargar los duplicados");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (autorizado) cargar(tipo); }, [tipo, autorizado, cargar]);

  function elegirSobreviviente(idx: number, id: string) {
    setSel((s) => {
      const prev = s[idx];
      const excluidos = new Set(prev.excluidos);
      excluidos.delete(id); // el que se conserva nunca está excluido
      return { ...s, [idx]: { sobrevivienteId: id, excluidos } };
    });
  }

  function alternarExcluido(idx: number, id: string) {
    setSel((s) => {
      const prev = s[idx];
      const excluidos = new Set(prev.excluidos);
      if (excluidos.has(id)) excluidos.delete(id); else excluidos.add(id);
      return { ...s, [idx]: { ...prev, excluidos } };
    });
  }

  function perdedoresDe(idx: number, racimo: Racimo): string[] {
    const s = sel[idx];
    if (!s) return [];
    return racimo.registros
      .filter((r) => r.id !== s.sobrevivienteId && !s.excluidos.has(r.id))
      .map((r) => r.id);
  }

  async function fusionar(idx: number, racimo: Racimo) {
    const s = sel[idx];
    const perdedoresIds = perdedoresDe(idx, racimo);
    if (perdedoresIds.length === 0) return;
    const nombreSobrev = racimo.registros.find((r) => r.id === s.sobrevivienteId)?.nombre ?? "";
    const singular = tipo === "contactos" ? "contacto" : "empresa";
    if (!confirm(
      `Se fusionarán ${perdedoresIds.length} ${singular}(s) en "${nombreSobrev}".\n\n` +
      `Todo lo asociado (oportunidades, tareas, cotizaciones, correos...) pasará al que conservas, ` +
      `y los duplicados irán a la papelera. ¿Continuar?`
    )) return;

    setFusionando(idx);
    try {
      const res = await fetch("/api/duplicados/fusionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, sobrevivienteId: s.sobrevivienteId, perdedoresIds }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "No se pudo fusionar"); return; }
      toast.success(`${data.fusionados} ${singular}(s) fusionado(s)`);
      // Quita el racimo resuelto sin recargar todo.
      setRacimos((rs) => rs.filter((_, i) => i !== idx));
      setSel((prev) => {
        const nuevo: Record<number, Seleccion> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const i = Number(k);
          if (i < idx) nuevo[i] = v;
          else if (i > idx) nuevo[i - 1] = v;
        });
        return nuevo;
      });
    } catch {
      toast.error("Error de red al fusionar");
    } finally {
      setFusionando(null);
    }
  }

  if (status === "loading") return null;
  if (!autorizado) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Duplicados</h1>
        <p className="mt-3 text-sm text-slate-500">
          Solo un administrador o gerente puede fusionar registros duplicados, porque la operación
          mueve datos entre registros y manda a la papelera los sobrantes.
        </p>
      </div>
    );
  }

  const Icono = tipo === "contactos" ? IconUsers : IconBuilding;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/datos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <IconArrowLeft size={15} stroke={1.75} /> Volver a Datos
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Limpiar duplicados</h1>
        <p className="text-slate-500 text-sm mt-1">
          Registros que parecen la misma persona o empresa (por correo o nombre). Elige cuál conservar
          y fusiona: lo asociado se reasigna y los sobrantes van a la papelera.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["contactos", "empresas"] as Tipo[]).map((t) => {
          const activo = tipo === t;
          const Ic = t === "contactos" ? IconUsers : IconBuilding;
          return (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activo ? "border-accent-600 text-accent-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Ic size={16} stroke={1.75} />{t === "contactos" ? "Contactos" : "Empresas"}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <IconLoader2 size={18} className="animate-spin" /> Buscando duplicados...
        </div>
      ) : racimos.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <IconCheck size={28} stroke={1.75} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-900">Sin duplicados de {tipo === "contactos" ? "contactos" : "empresas"}</p>
          <p className="text-xs text-emerald-700 mt-1">No encontramos registros que compartan correo o nombre.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <IconAlertTriangle size={13} stroke={1.75} className="text-amber-500" />
            {racimos.length} grupo(s) de posibles duplicados
          </p>

          {racimos.map((racimo, idx) => {
            const s = sel[idx];
            if (!s) return null;
            const perdedores = perdedoresDe(idx, racimo);
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {racimo.registros.map((r) => {
                    const esSobrev = r.id === s.sobrevivienteId;
                    const excluido = s.excluidos.has(r.id);
                    const conteos = Object.entries(r.conteos).filter(([k, v]) => k !== "total" && v > 0);
                    return (
                      <div key={r.id} className={`flex items-start gap-3 p-4 ${excluido ? "opacity-40" : ""}`}>
                        <input
                          type="radio"
                          name={`sobrev-${idx}`}
                          checked={esSobrev}
                          onChange={() => elegirSobreviviente(idx, r.id)}
                          className="mt-1 accent-accent-600"
                          title="Conservar este"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Icono size={15} stroke={1.75} className="text-slate-400 shrink-0" />
                            <span className="text-sm font-semibold text-slate-800 truncate">{r.nombre}</span>
                            {esSobrev && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-accent-100 text-accent-700 px-2 py-0.5">
                                Se conserva
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {r.email && <span>{r.email}</span>}
                            {r.telefono && <span>{r.telefono}</span>}
                            {r.detalle && <span className="text-slate-400">{r.detalle}</span>}
                            <span className="text-slate-300">Creado {fechaCorta(r.creadoEn)}</span>
                          </div>
                          {conteos.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {conteos.map(([k, v]) => (
                                <span key={k} className="text-[11px] rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5">
                                  {v} {ETIQUETA_CONTEO[k] ?? k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {!esSobrev && (
                          <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!excluido}
                              onChange={() => alternarExcluido(idx, r.id)}
                              className="accent-accent-600"
                            />
                            Fusionar
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    {perdedores.length === 0
                      ? "Marca al menos un duplicado para fusionar."
                      : `Se fusionará(n) ${perdedores.length} en el que conservas.`}
                  </p>
                  <button
                    onClick={() => fusionar(idx, racimo)}
                    disabled={perdedores.length === 0 || fusionando === idx}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 shrink-0"
                  >
                    {fusionando === idx ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} stroke={2} />}
                    Fusionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
