"use client";

import { useEffect, useState } from "react";

type Item = { id: string; descripcion: string; cantidad: number; precioUnit: string };
type Cotizacion = {
  id: string;
  numero: number;
  estado: string;
  empresa: { id: string; nombre: string } | null;
  items: Item[];
};

type Empresa = { id: string; nombre: string };

const ESTADOS = [
  { key: "BORRADOR", label: "Borrador" },
  { key: "ENVIADA", label: "Enviada" },
  { key: "ACEPTADA", label: "Aceptada" },
  { key: "RECHAZADA", label: "Rechazada" },
];

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-neutral-100 text-neutral-600",
  ENVIADA: "bg-blue-50 text-blue-700",
  ACEPTADA: "bg-green-50 text-green-700",
  RECHAZADA: "bg-red-50 text-red-700",
};

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState([{ descripcion: "", cantidad: 1, precioUnit: "" }]);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/cotizaciones");
    const data = await res.json();
    setCotizaciones(data);
    setCargando(false);
  }

  async function cargarEmpresas() {
    const res = await fetch("/api/empresas");
    setEmpresas(await res.json());
  }

  useEffect(() => { cargar(); cargarEmpresas(); }, []);

  function actualizarItem(index: number, campo: string, valor: string | number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { descripcion: "", cantidad: 1, precioUnit: "" }]);
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function totalForm() {
    return items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0), 0);
  }

  function totalCotizacion(c: Cotizacion) {
    return c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
  }

  function formatoMoneda(valor: number) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(valor);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, notas, items }),
    });
    setEmpresaId("");
    setNotas("");
    setItems([{ descripcion: "", cantidad: 1, precioUnit: "" }]);
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEstado(id: string, estado: string) {
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Cotizaciones</h1>
          <p className="text-sm text-neutral-500">Propuestas comerciales</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva cotización
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nueva cotización</h2>
          <form onSubmit={handleGuardar}>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-2 block text-xs text-neutral-500">Ítems</label>
              <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Descripción"
                      required
                      value={item.descripcion}
                      onChange={(e) => actualizarItem(i, "descripcion", e.target.value)}
                      className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Cant."
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                      className="w-20 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      required
                      value={item.precioUnit}
                      onChange={(e) => actualizarItem(i, "precioUnit", e.target.value)}
                      className="w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarItem(i)}
                        className="rounded-md border border-neutral-300 px-3 text-sm text-neutral-500 hover:bg-neutral-100"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={agregarItem}
                className="mt-2 text-xs font-medium text-blue-600 hover:underline"
              >
                + Agregar ítem
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-neutral-500">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <p className="mb-3 text-sm font-medium text-neutral-900">
              Total: {formatoMoneda(totalForm())}
            </p>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-neutral-400">Cargando...</p>
      ) : cotizaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">Aún no tienes cotizaciones. Crea la primera.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cotizaciones.map((c) => (
            <div key={c.id} className="rounded-xl border border-neutral-200 p-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">
                    Cotización #{c.numero} {c.empresa && `· ${c.empresa.nombre}`}
                  </p>
                  <p className="text-xs text-neutral-500">{c.items.length} ítem(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">{formatoMoneda(totalCotizacion(c))}</span>
                  <select
                    value={c.estado}
                    onChange={(e) => cambiarEstado(c.id, e.target.value)}
                    className={`rounded px-2 py-1 text-xs font-medium outline-none ${ESTADO_COLOR[c.estado]}`}
                  >
                    {ESTADOS.map((es) => (
                      <option key={es.key} value={es.key}>{es.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
