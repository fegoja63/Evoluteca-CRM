"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Item = { id: string; descripcion: string; cantidad: number; precioUnit: string };
type Cotizacion = {
  id: string;
  numero: number;
  estado: string;
  fechaEvento: string | null;
  fechaValidez: string | null;
  sede: string | null;
  notas: string | null;
  impuestoNombre: string | null;
  impuestoPorcentaje: string | null;
  impuesto2Nombre: string | null;
  impuesto2Porcentaje: string | null;
  creadoEn: string;
  empresa:     { id: string; nombre: string; telefono: string | null } | null;
  contacto:    { id: string; nombre: string; email: string | null; telefono: string | null } | null;
  oportunidad: { id: string; titulo: string } | null;
  items: Item[];
};

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:  "bg-slate-100 text-slate-600 border-slate-200",
  ENVIADA:   "bg-blue-50 text-blue-700 border-blue-200",
  ACEPTADA:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECHAZADA: "bg-red-50 text-red-600 border-red-200",
};
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada",
};

const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  BORRADOR:  [{ label: "Marcar enviada",   estado: "ENVIADA",   color: "bg-blue-600 hover:bg-blue-700" }],
  ENVIADA:   [
    { label: "Marcar aceptada",  estado: "ACEPTADA",  color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Marcar rechazada", estado: "RECHAZADA", color: "bg-red-600 hover:bg-red-700" },
  ],
  ACEPTADA:  [],
  RECHAZADA: [{ label: "Reabrir como borrador", estado: "BORRADOR", color: "bg-slate-600 hover:bg-slate-700" }],
};

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}
function fmtFecha(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CotizacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [cot, setCot]           = useState<Cotizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editNotas, setEditNotas] = useState(false);
  const [notas, setNotas]       = useState("");
  const [guardando, setGuardando] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [enviando, setEnviando]   = useState(false);
  const [enviado, setEnviado]     = useState(false);
  const [mostrarEmailPanel, setMostrarEmailPanel] = useState(false);
  const [modoEmailPanel, setModoEmailPanel] = useState<"confirmar" | "editar">("confirmar");
  const [emailDestino, setEmailDestino] = useState("");
  const [mostrarWhatsappPanel, setMostrarWhatsappPanel] = useState(false);
  const [telefonoDestino, setTelefonoDestino] = useState("");
  const [mensajeWhatsapp, setMensajeWhatsapp] = useState("");
  const [editImpuesto, setEditImpuesto] = useState(false);
  const [impuestoNombre, setImpuestoNombre] = useState("");
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState("");
  const [impuesto2Nombre, setImpuesto2Nombre] = useState("");
  const [impuesto2Porcentaje, setImpuesto2Porcentaje] = useState("");
  const [guardandoImpuesto, setGuardandoImpuesto] = useState(false);
  const [linkPublico, setLinkPublico] = useState("");
  const [copiado, setCopiado]     = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [mostrarMotivoModal, setMostrarMotivoModal] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [plantillaGuardada, setPlantillaGuardada] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/cotizaciones/${id}`);
    if (!res.ok) { router.push("/dashboard/cotizaciones-formales"); return; }
    const data = await res.json();
    setCot(data);
    setNotas(data.notas ?? "");
    setEmailDestino(prev => prev || data.contacto?.email || "");
    setTelefonoDestino(prev => prev || data.contacto?.telefono || data.empresa?.telefono || "");
    setImpuestoNombre(data.impuestoNombre ?? "IVA");
    setImpuestoPorcentaje(data.impuestoPorcentaje ?? "");
    setImpuesto2Nombre(data.impuesto2Nombre ?? "");
    setImpuesto2Porcentaje(data.impuesto2Porcentaje ?? "");
    setMensajeWhatsapp(prev => {
      if (prev) return prev;
      const sub = data.items.reduce((acc: number, i: Item) => acc + i.cantidad * Number(i.precioUnit), 0);
      const pct1 = Number(data.impuestoPorcentaje ?? 0);
      const pct2 = Number(data.impuesto2Porcentaje ?? 0);
      const tot = sub + sub * (pct1 / 100) + sub * (pct2 / 100);
      const numero = `#${String(data.numero).padStart(4, "0")}`;
      const cliente = data.empresa?.nombre ?? "";
      const saludo = data.contacto?.nombre ? `Hola ${data.contacto.nombre}` : "Hola";
      return `${saludo}, te comparto la cotización ${numero}${cliente ? ` de ${cliente}` : ""}. Total: ${fmt(tot)}. Cualquier duda me cuentas.`;
    });
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function cambiarEstado(estado: string) {
    if (estado === "RECHAZADA") { setMostrarMotivoModal(true); return; }
    await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    cargar();
  }

  async function confirmarRechazo() {
    await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "RECHAZADA", motivoRechazo }),
    });
    setMostrarMotivoModal(false);
    setMotivoRechazo("");
    cargar();
  }

  async function guardarNotas() {
    setGuardando(true);
    await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas }),
    });
    setEditNotas(false);
    setGuardando(false);
    cargar();
  }

  async function guardarImpuesto() {
    setGuardandoImpuesto(true);
    await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        impuestoNombre: impuestoNombre || null, impuestoPorcentaje: impuestoPorcentaje || null,
        impuesto2Nombre: impuesto2Nombre || null, impuesto2Porcentaje: impuesto2Porcentaje || null,
      }),
    });
    setEditImpuesto(false);
    setGuardandoImpuesto(false);
    cargar();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta cotización? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    router.push("/dashboard/cotizaciones-formales");
  }

  async function duplicar() {
    setDuplicando(true);
    const res = await fetch(`/api/cotizaciones/${id}/duplicar`, { method: "POST" });
    const data = await res.json();
    setDuplicando(false);
    if (data.id) router.push(`/dashboard/cotizaciones-formales/${data.id}`);
  }

  async function generarLink() {
    const res = await fetch(`/api/cotizaciones/${id}/token`, { method: "POST" });
    const data = await res.json();
    setLinkPublico(data.url);
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function guardarComoPlantilla() {
    if (!cot || cot.items.length === 0) return;
    const nombre = prompt("Nombre para la plantilla:", `Plantilla #${String(cot.numero).padStart(4, "0")}`);
    if (!nombre?.trim()) return;
    setGuardandoPlantilla(true);
    await fetch("/api/plantillas-cotizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim(),
        notas: cot.notas,
        items: cot.items.map(it => ({
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precioUnit: Number(it.precioUnit),
        })),
      }),
    });
    setGuardandoPlantilla(false);
    setPlantillaGuardada(true);
    setTimeout(() => setPlantillaGuardada(false), 3000);
  }

  async function enviarEmail() {
    if (!emailDestino.trim()) return;
    setEnviando(true);
    await fetch(`/api/cotizaciones/${id}/enviar-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailDestino.trim() }),
    });
    setEnviando(false);
    setEnviado(true);
    setMostrarEmailPanel(false);
    setTimeout(() => setEnviado(false), 3000);
    cargar();
  }

  if (cargando || !cot) return <p className="text-sm text-slate-400 p-6">Cargando...</p>;

  const subtotal = cot.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
  const pctImpuesto = Number(cot.impuestoPorcentaje ?? 0);
  const valorImpuesto = subtotal * (pctImpuesto / 100);
  const pctImpuesto2 = Number(cot.impuesto2Porcentaje ?? 0);
  const valorImpuesto2 = subtotal * (pctImpuesto2 / 100);
  const total = subtotal + valorImpuesto + valorImpuesto2;
  const telefonoLimpio = telefonoDestino.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensajeWhatsapp)}`;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/cotizaciones-formales" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Cotizaciones
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-mono font-bold text-slate-600">
          #{String(cot.numero).padStart(4, "0")}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${ESTADO_COLOR[cot.estado]}`}>
              {ESTADO_LABEL[cot.estado]}
            </span>
            <span className="text-xs text-slate-400">Creada el {fmtFecha(cot.creadoEn)}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cotización #{String(cot.numero).padStart(4, "0")}
          </h1>
          {cot.empresa && (
            <p className="text-slate-500 text-sm mt-1">{cot.empresa.nombre}</p>
          )}
        </div>

        {/* Acciones de estado */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {TRANSICIONES[cot.estado]?.map(t => (
            <button key={t.estado} onClick={() => cambiarEstado(t.estado)}
              className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${t.color} transition-colors`}>
              {t.label}
            </button>
          ))}
          <button onClick={generarLink}
            className="rounded-xl border border-violet-200 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors">
            🔗 Link cliente
          </button>
          <button onClick={() => setMostrarEmailPanel(v => {
              const next = !v;
              if (next) setModoEmailPanel(emailDestino.trim() ? "confirmar" : "editar");
              return next;
            })} disabled={enviando || enviado}
            className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
            {enviado ? "✓ Enviado" : enviando ? "Enviando..." : "✉ Enviar email"}
          </button>
          <button onClick={() => setMostrarWhatsappPanel(v => !v)}
            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
            💬 WhatsApp
          </button>
          <button onClick={duplicar} disabled={duplicando}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {duplicando ? "Duplicando..." : "⧉ Duplicar"}
          </button>
          <button onClick={guardarComoPlantilla} disabled={guardandoPlantilla || plantillaGuardada}
            className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors">
            {plantillaGuardada ? "✓ Plantilla guardada" : guardandoPlantilla ? "Guardando..." : "★ Guardar plantilla"}
          </button>
          <a href={`/api/cotizaciones/${cot.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            ⬇ Descargar PDF
          </a>
          <button onClick={eliminar}
            className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      {/* Panel enviar email */}
      {mostrarEmailPanel && (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          {modoEmailPanel === "confirmar" ? (
            <div className="flex items-center gap-3">
              <span className="text-blue-500 text-lg">✉</span>
              <p className="flex-1 text-sm text-blue-900">
                ¿Enviar la cotización al correo <strong>{emailDestino}</strong>?
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setModoEmailPanel("editar")}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                  Cambiar correo
                </button>
                <button onClick={enviarEmail} disabled={enviando}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {enviando ? "Enviando..." : "Sí, enviar al actual"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-blue-500 text-lg">✉</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-700 mb-1">Enviar cotización a un correo distinto</p>
                <input type="email" value={emailDestino} onChange={e => setEmailDestino(e.target.value)}
                  placeholder="correo@cliente.com" autoFocus
                  className="w-full rounded-lg border border-blue-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" />
              </div>
              <button onClick={enviarEmail} disabled={enviando || !emailDestino.trim()}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panel enviar WhatsApp */}
      {mostrarWhatsappPanel && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-emerald-500 text-lg">💬</span>
            <div className="flex-1 flex flex-col gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Número de WhatsApp</p>
                <input type="tel" value={telefonoDestino} onChange={e => setTelefonoDestino(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="w-full rounded-lg border border-emerald-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 bg-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Mensaje</p>
                <textarea value={mensajeWhatsapp} onChange={e => setMensajeWhatsapp(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-emerald-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 bg-white resize-none" />
              </div>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => setMostrarWhatsappPanel(false)}
                aria-disabled={!telefonoLimpio}
                className={`self-start rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors ${telefonoLimpio ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-300 pointer-events-none"}`}>
                💬 Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Panel link público */}
      {linkPublico && (
        <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-3">
          <span className="text-violet-500 text-lg">🔗</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-violet-700 mb-1">Link para el cliente</p>
            <p className="text-xs text-violet-600 truncate font-mono">{linkPublico}</p>
          </div>
          <button onClick={copiarLink}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${copiado ? "bg-emerald-100 text-emerald-700" : "bg-violet-200 text-violet-700 hover:bg-violet-300"}`}>
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Datos generales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Datos generales</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              { label: "Empresa",         value: cot.empresa?.nombre },
              { label: "Contacto",        value: cot.contacto ? `${cot.contacto.nombre}${cot.contacto.email ? ` · ${cot.contacto.email}` : ""}` : null },
              { label: "Oportunidad",     value: cot.oportunidad?.titulo },
              { label: "Sede / Lugar",    value: cot.sede },
              { label: "Fecha del evento",value: fmtFecha(cot.fechaEvento) },
              { label: "Validez hasta",   value: fmtFecha(cot.fechaValidez) },
            ].map(r => (
              <div key={r.label}>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{r.label}</p>
                <p className={r.value ? "text-slate-900 font-medium" : "text-slate-300 italic text-xs"}>
                  {r.value ?? "No especificado"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ítems */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Servicios / Ítems</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Descripción</th>
                <th className="px-5 py-3 text-center">Cant.</th>
                <th className="px-5 py-3 text-right">Precio unit.</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cot.items.map(item => {
                const sub = item.cantidad * Number(item.precioUnit);
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-slate-800">{item.descripcion}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{item.cantidad}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmt(Number(item.precioUnit))}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{fmt(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-100">
                <td colSpan={3} className="px-5 py-1.5 text-xs text-slate-500 text-right">Subtotal</td>
                <td className="px-5 py-1.5 text-right text-sm text-slate-600">{fmt(subtotal)}</td>
              </tr>
              {pctImpuesto > 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-xs text-slate-500 text-right">
                    {cot.impuestoNombre || "Impuesto"} ({pctImpuesto}%)
                  </td>
                  <td className="px-5 py-1.5 text-right text-sm text-slate-600">{fmt(valorImpuesto)}</td>
                </tr>
              )}
              {pctImpuesto2 > 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-1.5 text-xs text-slate-500 text-right">
                    {cot.impuesto2Nombre || "Impuesto"} ({pctImpuesto2}%)
                  </td>
                  <td className="px-5 py-1.5 text-right text-sm text-slate-600">{fmt(valorImpuesto2)}</td>
                </tr>
              )}
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={3} className="px-5 py-4 text-sm font-bold text-slate-700 text-right uppercase tracking-wide">
                  Total
                </td>
                <td className="px-5 py-4 text-right text-xl font-bold text-slate-900">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="px-5 py-3 border-t border-slate-100">
            {editImpuesto ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Impuesto</label>
                    <input type="text" value={impuestoNombre} onChange={e => setImpuestoNombre(e.target.value)}
                      placeholder="Ej: IVA"
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                    <input type="number" min={0} max={100} step="0.01" value={impuestoPorcentaje}
                      onChange={e => setImpuestoPorcentaje(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">2º impuesto</label>
                    <input type="text" value={impuesto2Nombre} onChange={e => setImpuesto2Nombre(e.target.value)}
                      placeholder="Ej: Retención"
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                    <input type="number" min={0} max={100} step="0.01" value={impuesto2Porcentaje}
                      onChange={e => setImpuesto2Porcentaje(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={guardarImpuesto} disabled={guardandoImpuesto}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {guardandoImpuesto ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => setEditImpuesto(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditImpuesto(true)} className="text-xs text-blue-600 hover:underline">
                {pctImpuesto > 0 || pctImpuesto2 > 0 ? "Editar impuestos" : "+ Agregar impuesto"}
              </button>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Notas / Observaciones</h2>
            {!editNotas && (
              <button onClick={() => setEditNotas(true)}
                className="text-xs text-blue-600 hover:underline">
                Editar
              </button>
            )}
          </div>
          {editNotas ? (
            <div>
              <textarea
                rows={4}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={guardarNotas} disabled={guardando}
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
                <button onClick={() => { setEditNotas(false); setNotas(cot.notas ?? ""); }}
                  className="rounded-xl border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className={cot.notas ? "text-sm text-slate-700 whitespace-pre-wrap" : "text-sm text-slate-300 italic"}>
              {cot.notas || "Sin notas"}
            </p>
          )}
        </div>
      </div>

      {/* Modal motivo rechazo */}
      {mostrarMotivoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-900 mb-1">Motivo de rechazo</h3>
            <p className="text-xs text-slate-500 mb-4">Registrar el motivo ayuda a analizar patrones.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {["Precio muy alto","Eligió a la competencia","El evento fue cancelado","Sin presupuesto","Fuera de fechas","Otro"].map(m => (
                <button key={m} onClick={() => setMotivoRechazo(m)}
                  className={`rounded-xl border px-3 py-2 text-xs text-left transition-all ${motivoRechazo === m ? "bg-red-50 border-red-400 text-red-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {m}
                </button>
              ))}
            </div>
            {motivoRechazo === "Otro" && (
              <input value={motivoRechazo === "Otro" ? "" : motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Describe el motivo..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 mb-4" />
            )}
            <div className="flex gap-2">
              <button onClick={confirmarRechazo} disabled={!motivoRechazo}
                className="flex-1 rounded-xl bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                Confirmar rechazo
              </button>
              <button onClick={() => setMostrarMotivoModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
