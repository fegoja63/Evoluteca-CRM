"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Empresa  = { id: string; nombre: string };
type Contacto = { id: string; nombre: string; email: string | null; empresa: { id: string } | null };
type Oportunidad = { id: string; titulo: string; empresa: { id: string } | null };
type Producto = { id: string; nombre: string; precioBase: string; descripcion: string | null };
type ItemPlantilla = { descripcion: string; cantidad: number; precioUnit: string };
type Plantilla = { id: string; nombre: string; notas: string | null; items: ItemPlantilla[] };

type Linea = { descripcion: string; cantidad: string; precioUnit: string };

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

export default function NuevaCotizacionPage() {
  const router = useRouter();

  const [empresas, setEmpresas]       = useState<Empresa[]>([]);
  const [contactos, setContactos]     = useState<Contacto[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [plantillas, setPlantillas]   = useState<Plantilla[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [enviando, setEnviando]       = useState(false);
  const [error, setError]             = useState("");

  const [empresaId, setEmpresaId]         = useState("");
  const [contactoId, setContactoId]       = useState("");
  const [oportunidadId, setOportunidadId] = useState("");
  const [sede, setSede]               = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [fechaValidez, setFechaValidez] = useState("");
  const [notas, setNotas]             = useState("");

  const [lineas, setLineas] = useState<Linea[]>([
    { descripcion: "", cantidad: "1", precioUnit: "" },
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/empresas").then(r => r.json()),
      fetch("/api/contactos").then(r => r.json()),
      fetch("/api/oportunidades").then(r => r.json()),
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/plantillas-cotizacion").then(r => r.json()),
    ]).then(([emp, con, opo, prod, plant]) => {
      setEmpresas(Array.isArray(emp) ? emp : []);
      setContactos(Array.isArray(con) ? con : []);
      setOportunidades(Array.isArray(opo) ? opo : []);
      setProductos(Array.isArray(prod) ? prod : []);
      setPlantillas(Array.isArray(plant) ? plant : []);
      setCargando(false);
    });
  }, []);

  const contactosFiltrados = empresaId
    ? contactos.filter(c => c.empresa?.id === empresaId)
    : contactos;

  const oportunidadesFiltradas = empresaId
    ? oportunidades.filter(o => o.empresa?.id === empresaId)
    : oportunidades;

  function updateLinea(i: number, field: keyof Linea, val: string) {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }
  function addLinea() {
    setLineas(prev => [...prev, { descripcion: "", cantidad: "1", precioUnit: "" }]);
  }
  function removeLinea(i: number) {
    setLineas(prev => prev.filter((_, idx) => idx !== i));
  }

  const totalGeneral = lineas.reduce((acc, l) => {
    const q = parseFloat(l.cantidad) || 0;
    const p = parseFloat(l.precioUnit) || 0;
    return acc + q * p;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const lineasValidas = lineas.filter(l => l.descripcion.trim());
    if (lineasValidas.length === 0) {
      setError("Agrega al menos una línea de servicio con descripción.");
      return;
    }

    setEnviando(true);
    const res = await fetch("/api/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId:    empresaId    || null,
        contactoId:   contactoId   || null,
        oportunidadId: oportunidadId || null,
        sede:         sede.trim()  || null,
        fechaEvento:  fechaEvento  || null,
        fechaValidez: fechaValidez || null,
        notas:        notas.trim() || null,
        items: lineasValidas.map(l => ({
          descripcion: l.descripcion.trim(),
          cantidad:    parseInt(l.cantidad) || 1,
          precioUnit:  parseFloat(l.precioUnit) || 0,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      setEnviando(false);
      return;
    }

    const cot = await res.json();
    router.push(`/dashboard/cotizaciones-formales/${cot.id}`);
  }

  if (cargando) return <p className="text-sm text-slate-400 p-6">Cargando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cotizaciones-formales" className="text-slate-400 hover:text-slate-700 text-sm">
            ← Cotizaciones
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-semibold text-slate-900">Nueva cotización</h1>
        </div>
        {plantillas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Cargar plantilla:</span>
            <select
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 outline-none focus:border-violet-400"
              onChange={e => {
                const p = plantillas.find(x => x.id === e.target.value);
                if (!p) return;
                setLineas(p.items.map(it => ({
                  descripcion: it.descripcion,
                  cantidad: String(it.cantidad),
                  precioUnit: String(it.precioUnit),
                })));
                if (p.notas) setNotas(p.notas);
                e.target.value = "";
              }}>
              <option value="">— Elegir plantilla —</option>
              {plantillas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.items.length} ítems)</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Cliente */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Cliente y oportunidad</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
              <select value={empresaId} onChange={e => { setEmpresaId(e.target.value); setContactoId(""); setOportunidadId(""); }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500">
                <option value="">— Sin empresa —</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contacto</label>
              <select value={contactoId} onChange={e => setContactoId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500">
                <option value="">— Sin contacto —</option>
                {contactosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Oportunidad vinculada</label>
              <select value={oportunidadId} onChange={e => setOportunidadId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500">
                <option value="">— Sin oportunidad —</option>
                {oportunidadesFiltradas.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Detalles del evento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Detalles del evento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sede / Lugar</label>
              <input type="text" value={sede} onChange={e => setSede(e.target.value)}
                placeholder="Teatro Nacional, Sala A..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha del evento</label>
              <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de validez</label>
              <input type="date" value={fechaValidez} onChange={e => setFechaValidez(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Líneas de servicio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Servicios / Ítems</h2>

          <div className="mb-2 grid grid-cols-[1fr_80px_120px_28px] gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
            <span>Descripción</span>
            <span>Cant.</span>
            <span>Precio unit.</span>
            <span />
          </div>

          <div className="flex flex-col gap-2">
            {lineas.map((linea, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_120px_28px] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ej: Iluminación escénica"
                  value={linea.descripcion}
                  onChange={e => updateLinea(i, "descripcion", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  min={1}
                  value={linea.cantidad}
                  onChange={e => updateLinea(i, "cantidad", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 text-center"
                />
                <input
                  type="number"
                  min={0}
                  step="1000"
                  placeholder="0"
                  value={linea.precioUnit}
                  onChange={e => updateLinea(i, "precioUnit", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 text-right"
                />
                <button type="button" onClick={() => removeLinea(i)} disabled={lineas.length === 1}
                  className="text-slate-300 hover:text-red-500 disabled:opacity-30 text-lg font-bold leading-none">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <button type="button" onClick={addLinea}
              className="text-sm text-blue-600 hover:underline">
              + Línea vacía
            </button>
            {productos.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">o desde catálogo:</span>
                <select onChange={e => {
                  const p = productos.find(x => x.id === e.target.value);
                  if (!p) return;
                  setLineas(prev => [...prev, { descripcion: p.nombre, cantidad: "1", precioUnit: p.precioBase }]);
                  e.target.value = "";
                }}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500">
                  <option value="">Agregar servicio del catálogo...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(p.precioBase))}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(totalGeneral)}</p>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Notas / Observaciones</h2>
          <textarea
            value={notas} onChange={e => setNotas(e.target.value)}
            rows={3}
            placeholder="Condiciones especiales, información adicional..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <div className="flex items-center gap-3 justify-end pb-6">
          <Link href="/dashboard/cotizaciones-formales"
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </Link>
          <button type="submit" disabled={enviando}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {enviando ? "Guardando..." : "Guardar como borrador"}
          </button>
        </div>
      </form>
    </div>
  );
}
