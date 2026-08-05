"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  IconPlus, IconTrash, IconArrowUp, IconArrowDown, IconGripVertical,
} from "@tabler/icons-react";
import {
  TIPOS_CAMPO, TIPO_LABEL, ENTIDADES_CAMPO, ENTIDAD_LABEL,
  type TipoCampo, type EntidadCampo,
} from "@/lib/campos-personalizados";

type Def = {
  id: string;
  entidad: EntidadCampo;
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  obligatorio: boolean;
  orden: number;
  activo: boolean;
};

export function CamposPersonalizadosAdmin({ esAdmin }: { esAdmin: boolean }) {
  const [entidad, setEntidad] = useState<EntidadCampo>("OPORTUNIDAD");
  const [campos, setCampos] = useState<Def[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de alta
  const [etiqueta, setEtiqueta] = useState("");
  const [tipo, setTipo] = useState<TipoCampo>("TEXTO");
  const [opcionesTexto, setOpcionesTexto] = useState("");
  const [obligatorio, setObligatorio] = useState(false);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/campos-personalizados");
    const data = await res.json();
    setCampos(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  const delEntidad = campos
    .filter(c => c.entidad === entidad)
    .sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta));

  async function crear() {
    if (!etiqueta.trim()) { toast.error("Ponle un nombre al campo."); return; }
    const opciones = tipo === "LISTA"
      ? opcionesTexto.split("\n").map(o => o.trim()).filter(Boolean)
      : [];
    if (tipo === "LISTA" && opciones.length < 2) {
      toast.error("Un campo de tipo Lista necesita al menos 2 opciones (una por línea).");
      return;
    }
    setCreando(true);
    const res = await fetch("/api/campos-personalizados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entidad, etiqueta: etiqueta.trim(), tipo, opciones, obligatorio }),
    });
    setCreando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear el campo.");
      return;
    }
    setEtiqueta(""); setTipo("TEXTO"); setOpcionesTexto(""); setObligatorio(false);
    cargar();
  }

  async function eliminar(c: Def) {
    if (!confirm(`¿Eliminar el campo "${c.etiqueta}"? Los valores ya guardados en cada registro dejarán de mostrarse.`)) return;
    const res = await fetch(`/api/campos-personalizados/${c.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar."); return; }
    cargar();
  }

  async function toggleObligatorio(c: Def) {
    const previos = campos;
    setCampos(prev => prev.map(x => x.id === c.id ? { ...x, obligatorio: !x.obligatorio } : x));
    const res = await fetch(`/api/campos-personalizados/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obligatorio: !c.obligatorio }),
    });
    if (!res.ok) { setCampos(previos); toast.error("No se pudo actualizar."); }
  }

  async function mover(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= delEntidad.length) return;
    const nuevo = [...delEntidad];
    [nuevo[idx], nuevo[j]] = [nuevo[j], nuevo[idx]];
    // Optimista: refleja el nuevo orden ya mismo.
    setCampos(prev => prev.map(c => {
      const pos = nuevo.findIndex(n => n.id === c.id);
      return pos >= 0 ? { ...c, orden: pos } : c;
    }));
    const res = await fetch("/api/campos-personalizados", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nuevo.map(n => n.id) }),
    });
    if (!res.ok) { toast.error("No se pudo reordenar."); cargar(); }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
        <IconGripVertical size={16} stroke={1.75} />Campos personalizados
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Crea campos propios para tus Clientes y Oportunidades (ej. NIT, competidor, N° de licitación).
        Aparecen en el formulario de cada ficha y en su vista de detalle. La <strong>Lista</strong> es un menú
        de opciones fijas; <strong>Sí / No</strong> es una casilla.
      </p>

      {/* Tabs de entidad */}
      <div className="flex gap-2 mb-4">
        {ENTIDADES_CAMPO.map(e => (
          <button key={e} onClick={() => setEntidad(e)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              entidad === e ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {ENTIDAD_LABEL[e]}
          </button>
        ))}
      </div>

      {/* Lista de campos de la entidad activa */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : delEntidad.length === 0 ? (
        <p className="text-xs text-slate-400 mb-4">Aún no hay campos para {ENTIDAD_LABEL[entidad]}.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mb-4">
          {delEntidad.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <div className="flex flex-col">
                <button disabled={!esAdmin || idx === 0} onClick={() => mover(idx, -1)}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30" title="Subir">
                  <IconArrowUp size={13} stroke={2} />
                </button>
                <button disabled={!esAdmin || idx === delEntidad.length - 1} onClick={() => mover(idx, 1)}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30" title="Bajar">
                  <IconArrowDown size={13} stroke={2} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.etiqueta}</p>
                <p className="text-xs text-slate-400">
                  {TIPO_LABEL[c.tipo]}
                  {c.tipo === "LISTA" && c.opciones.length > 0 && <span> · {c.opciones.join(", ")}</span>}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 cursor-pointer" title="¿Obligatorio al guardar la ficha?">
                <input type="checkbox" checked={c.obligatorio} disabled={!esAdmin}
                  onChange={() => toggleObligatorio(c)} className="w-3.5 h-3.5 accent-brand-600" />
                Obligatorio
              </label>
              <button disabled={!esAdmin} onClick={() => eliminar(c)}
                className="shrink-0 text-slate-300 hover:text-red-500 p-1 disabled:opacity-30" title="Eliminar campo">
                <IconTrash size={15} stroke={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Alta de campo */}
      {esAdmin && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">Nuevo campo para {ENTIDAD_LABEL[entidad]}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Nombre del campo</label>
              <input value={etiqueta} onChange={e => setEtiqueta(e.target.value)}
                placeholder="Ej: NIT, Competidor, N° de licitación"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoCampo)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                {TIPOS_CAMPO.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            {tipo === "LISTA" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Opciones (una por línea)</label>
                <textarea value={opcionesTexto} onChange={e => setOpcionesTexto(e.target.value)} rows={4}
                  placeholder={"Gobierno\nSector financiero\nEmpresa privada"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={obligatorio} onChange={e => setObligatorio(e.target.checked)}
                className="w-4 h-4 accent-brand-600" />
              Obligatorio al guardar la ficha
            </label>
          </div>
          <button onClick={crear} disabled={creando}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
            <IconPlus size={16} stroke={1.75} />{creando ? "Creando..." : "Agregar campo"}
          </button>
        </div>
      )}
    </div>
  );
}
