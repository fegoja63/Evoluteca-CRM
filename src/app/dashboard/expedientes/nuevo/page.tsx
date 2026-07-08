"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Empresa = { id: string; nombre: string };
type Coincidencia = { id: string; nombre: string };
type Conflicto = { empresas: Coincidencia[]; contactos: Coincidencia[] };

export default function NuevoExpedientePage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [conflicto, setConflicto] = useState<Conflicto | null>(null);
  const conflictoNombreRef = useRef("");
  const [form, setForm] = useState({
    numeroRadicado: "",
    juzgado: "",
    tipoProceso: "",
    contraparte: "",
    empresaId: "",
    notas: "",
  });

  useEffect(() => {
    fetch("/api/empresas")
      .then((res) => res.json())
      .then((data) => setEmpresas(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    const nombre = form.contraparte.trim();
    if (nombre.length < 3) { setConflicto(null); return; }
    const t = setTimeout(async () => {
      conflictoNombreRef.current = nombre;
      const res = await fetch(`/api/expedientes/conflicto?nombre=${encodeURIComponent(nombre)}`);
      const data = await res.json();
      // Ignora la respuesta si el usuario ya siguió escribiendo (evita que una
      // respuesta lenta y vieja sobreescriba el resultado de un texto más reciente).
      if (conflictoNombreRef.current === nombre) setConflicto(data);
    }, 300);
    return () => clearTimeout(t);
  }, [form.contraparte]);

  const hayConflicto = !!conflicto && (conflicto.empresas.length > 0 || conflicto.contactos.length > 0);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const res = await fetch("/api/expedientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el expediente");
      return;
    }
    const nuevo = await res.json();
    router.push(`/dashboard/expedientes/${nuevo.id}`);
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/expedientes" className="text-sm text-slate-500 hover:text-blue-600">
          ← Expedientes
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Nuevo expediente</h1>
      </div>

      <form onSubmit={handleGuardar} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Número de radicado *</label>
          <input required value={form.numeroRadicado} onChange={e => setForm({ ...form, numeroRadicado: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Juzgado</label>
          <input value={form.juzgado} onChange={e => setForm({ ...form, juzgado: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Tipo de proceso</label>
          <input value={form.tipoProceso} onChange={e => setForm({ ...form, tipoProceso: e.target.value })}
            placeholder="Ej: Civil, Laboral, Penal..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Cliente</label>
          <select value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
            <option value="">Sin cliente asociado</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Contraparte *</label>
          <input required value={form.contraparte} onChange={e => setForm({ ...form, contraparte: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          {hayConflicto && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Posible conflicto de interés:</p>
              <p>La contraparte coincide con registros existentes de tu CRM:</p>
              <ul className="mt-1 list-disc list-inside">
                {conflicto!.empresas.map(e => <li key={e.id}>{e.nombre} (cliente)</li>)}
                {conflicto!.contactos.map(c => <li key={c.id}>{c.nombre} (contacto)</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Notas</label>
          <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        {error && (
          <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="col-span-2 flex gap-2">
          <button type="submit" disabled={guardando}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Guardando..." : "Crear expediente"}
          </button>
          <Link href="/dashboard/expedientes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
