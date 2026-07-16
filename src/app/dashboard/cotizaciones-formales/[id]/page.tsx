"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { ahorroMensualTotal, valorCotizacion, valorFeeMensual, MODALIDAD_LABEL, numeroCotizacion } from "@/lib/cotizaciones";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { IconLink, IconMail, IconCheck, IconBrandWhatsapp, IconStar, IconDownload, IconCopy, IconArrowLeft, IconPencil } from "@tabler/icons-react";

type Item = { id: string; descripcion: string; cantidad: number; precioUnit: string };
type LineaAhorro = { id: string; area: string; gastoBaseMensual: string; ahorroEstimadoMensual: string };
type Cotizacion = {
  id: string;
  numero: number;
  numeroManual: string | null;
  estado: string;
  modalidad: string;
  porcentajeHonorarios: string | null;
  horizonteMeses: number | null;
  feeMensual: string | null;
  lineasAhorro: LineaAhorro[];
  fechaEvento: string | null;
  fechaValidez: string | null;
  sede: string | null;
  notas: string | null;
  impuestoNombre: string | null;
  impuestoPorcentaje: string | null;
  impuesto2Nombre: string | null;
  impuesto2Porcentaje: string | null;
  creadoEn: string;
  empresa:     { id: string; nombre: string; email: string | null; telefono: string | null } | null;
  contacto:    { id: string; nombre: string; email: string | null; telefono: string | null } | null;
  oportunidad: { id: string; titulo: string } | null;
  reemplazada?: boolean;
  items: Item[];
};

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:  "bg-slate-100 text-slate-600 border-slate-200",
  ENVIADA:   "bg-brand-50 text-brand-700 border-brand-200",
  ACEPTADA:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECHAZADA: "bg-red-50 text-red-600 border-red-200",
};
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada",
};

const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  // Desde Borrador se puede enviar, o marcar aceptada/rechazada directamente
  // (p. ej. cuando el cliente acepta por teléfono y nunca se "envió" el PDF).
  BORRADOR:  [
    { label: "Marcar enviada",   estado: "ENVIADA",   color: "bg-accent-600 hover:bg-accent-700" },
    { label: "Marcar aceptada",  estado: "ACEPTADA",  color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Marcar rechazada", estado: "RECHAZADA", color: "bg-red-600 hover:bg-red-700" },
  ],
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
  const [editNumero, setEditNumero] = useState(false);
  const [numeroManual, setNumeroManual] = useState("");
  const [guardandoNumero, setGuardandoNumero] = useState(false);
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
    setNumeroManual(data.numeroManual ?? "");
    setEmailDestino(prev => prev || data.contacto?.email || data.empresa?.email || "");
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
      const tot = data.modalidad && data.modalidad !== "FEE_FIJO"
        ? valorCotizacion(data)
        : sub + sub * (pct1 / 100) + sub * (pct2 / 100);
      const numero = numeroCotizacion(data);
      const cliente = data.empresa?.nombre ?? "";
      const saludo = data.contacto?.nombre ? `Hola ${data.contacto.nombre}` : "Hola";
      return `${saludo}, te comparto la cotización ${numero}${cliente ? ` de ${cliente}` : ""}. Total: ${fmt(tot)}. Cualquier duda me cuentas.`;
    });
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function cambiarEstado(estado: string) {
    if (estado === "RECHAZADA") { setMostrarMotivoModal(true); return; }
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo cambiar el estado. Revisa tu conexión e inténtalo de nuevo.");
    }
    cargar();
  }

  async function confirmarRechazo() {
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "RECHAZADA", motivoRechazo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
    setMostrarMotivoModal(false);
    setMotivoRechazo("");
    cargar();
  }

  async function guardarNotas() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Mantiene el editor abierto para no perder lo escrito.
      toast.error("No se pudieron guardar las notas. Revisa tu conexión e inténtalo de nuevo.");
      setGuardando(false);
      return;
    }
    setEditNotas(false);
    setGuardando(false);
    cargar();
  }

  async function guardarNumero() {
    setGuardandoNumero(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroManual: numeroManual.trim() || null }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo guardar el número. Revisa tu conexión e inténtalo de nuevo.");
      setGuardandoNumero(false);
      return;
    }
    setEditNumero(false);
    setGuardandoNumero(false);
    cargar();
  }

  async function guardarImpuesto() {
    setGuardandoImpuesto(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impuestoNombre: impuestoNombre || null, impuestoPorcentaje: impuestoPorcentaje || null,
          impuesto2Nombre: impuesto2Nombre || null, impuesto2Porcentaje: impuesto2Porcentaje || null,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudieron guardar los impuestos. Revisa tu conexión e inténtalo de nuevo.");
      setGuardandoImpuesto(false);
      return;
    }
    setEditImpuesto(false);
    setGuardandoImpuesto(false);
    cargar();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta cotización? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
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
    const nombre = prompt("Nombre para la plantilla:", `Plantilla ${numeroCotizacion(cot)}`);
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
        <Link href="/dashboard/cotizaciones-formales" className="text-slate-400 hover:text-slate-700 text-sm inline-flex items-center gap-1">
          <IconArrowLeft size={14} stroke={1.75} /> Cotizaciones
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-mono font-bold text-slate-600">
          {numeroCotizacion(cot)}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${ESTADO_COLOR[cot.estado]}`}>
              {ESTADO_LABEL[cot.estado]}
            </span>
            {cot.reemplazada && (
              <span className="rounded-full border border-slate-200 bg-slate-200 px-3 py-0.5 text-xs font-bold text-slate-500">
                Reemplazada
              </span>
            )}
            <span className="text-xs text-slate-400">Creada el {fmtFecha(cot.creadoEn)}</span>
          </div>
          {cot.reemplazada && (
            <p className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Esta cotización fue reemplazada por una versión más reciente del mismo negocio. Se conserva como historial, pero la versión vigente es otra.
            </p>
          )}
          {editNumero ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={numeroManual}
                  onChange={e => setNumeroManual(e.target.value)}
                  placeholder={`#${String(cot.numero).padStart(4, "0")}`}
                  maxLength={40}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") guardarNumero(); if (e.key === "Escape") { setEditNumero(false); setNumeroManual(cot.numeroManual ?? ""); } }}
                  className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-lg font-bold text-slate-900 outline-none focus:border-brand-500"
                />
                <button onClick={guardarNumero} disabled={guardandoNumero}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {guardandoNumero ? "Guardando…" : "Guardar"}
                </button>
                <button onClick={() => { setEditNumero(false); setNumeroManual(cot.numeroManual ?? ""); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Número propio del cliente (ej. COT-2026-045). Déjalo vacío para usar el consecutivo automático #{String(cot.numero).padStart(4, "0")}.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Cotización {numeroCotizacion(cot)}
              </h1>
              <button onClick={() => setEditNumero(true)} title="Editar número"
                className="text-slate-400 hover:text-brand-600 transition-colors">
                <IconPencil size={16} stroke={1.75} />
              </button>
            </div>
          )}
          {!editNumero && cot.numeroManual && (
            <p className="text-xs text-slate-400 mt-0.5">Consecutivo interno #{String(cot.numero).padStart(4, "0")}</p>
          )}
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
            className="rounded-xl border border-violet-200 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors inline-flex items-center gap-1.5">
            <IconLink size={14} stroke={1.75} /> Link cliente
          </button>
          <button onClick={() => setMostrarEmailPanel(v => {
              const next = !v;
              if (next) setModoEmailPanel(emailDestino.trim() ? "confirmar" : "editar");
              return next;
            })} disabled={enviando || enviado}
            className="rounded-xl border border-brand-200 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5">
            {enviado ? <><IconCheck size={14} stroke={1.75} /> Enviado</> : enviando ? "Enviando..." : <><IconMail size={14} stroke={1.75} /> Enviar email</>}
          </button>
          <button onClick={() => setMostrarWhatsappPanel(v => !v)}
            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1.5">
            <IconBrandWhatsapp size={14} stroke={1.75} /> WhatsApp
          </button>
          <button onClick={duplicar} disabled={duplicando}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {duplicando ? "Duplicando..." : "Duplicar"}
          </button>
          <button onClick={guardarComoPlantilla} disabled={guardandoPlantilla || plantillaGuardada}
            className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5">
            {plantillaGuardada ? <><IconCheck size={14} stroke={1.75} /> Plantilla guardada</> : guardandoPlantilla ? "Guardando..." : <><IconStar size={14} stroke={1.75} /> Guardar plantilla</>}
          </button>
          <a href={`/api/cotizaciones/${cot.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <IconDownload size={14} stroke={1.75} /> Descargar PDF
          </a>
          <button onClick={eliminar}
            className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      {/* Panel enviar email */}
      {mostrarEmailPanel && (
        <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          {modoEmailPanel === "confirmar" ? (
            <div className="flex items-center gap-3">
              <IconMail size={18} stroke={1.75} className="text-brand-500 shrink-0" />
              <p className="flex-1 text-sm text-brand-900">
                ¿Enviar la cotización al correo <strong>{emailDestino}</strong>?
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setModoEmailPanel("editar")}
                  className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100">
                  Cambiar correo
                </button>
                <button onClick={enviarEmail} disabled={enviando}
                  className="rounded-lg bg-accent-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {enviando ? "Enviando..." : "Sí, enviar al actual"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <IconMail size={18} stroke={1.75} className="text-brand-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-700 mb-1">
                  {cot.contacto?.email || cot.empresa?.email ? "Enviar cotización a un correo distinto" : "¿A qué correo enviamos la cotización?"}
                </p>
                <input type="email" value={emailDestino} onChange={e => setEmailDestino(e.target.value)}
                  placeholder="correo@cliente.com" autoFocus
                  className="w-full rounded-lg border border-brand-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white" />
              </div>
              <button onClick={enviarEmail} disabled={enviando || !emailDestino.trim()}
                className="shrink-0 rounded-lg bg-accent-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
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
            <IconBrandWhatsapp size={18} stroke={1.75} className="text-emerald-500 shrink-0" />
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
                className={`self-start rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 ${telefonoLimpio ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-300 pointer-events-none"}`}>
                <IconBrandWhatsapp size={14} stroke={1.75} /> Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Panel link público */}
      {linkPublico && (
        <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-3">
          <IconLink size={18} stroke={1.75} className="text-violet-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-violet-700 mb-1">Link para el cliente</p>
            <p className="text-xs text-violet-600 truncate font-mono">{linkPublico}</p>
          </div>
          <button onClick={copiarLink}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center gap-1.5 ${copiado ? "bg-emerald-100 text-emerald-700" : "bg-violet-200 text-violet-700 hover:bg-violet-300"}`}>
            {copiado ? <><IconCheck size={13} stroke={1.75} /> Copiado</> : <><IconCopy size={13} stroke={1.75} /> Copiar</>}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Datos generales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Datos generales</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {([
              { label: "Empresa",         value: cot.empresa?.nombre ?? null },
              { label: "Contacto",        value: cot.contacto ? `${cot.contacto.nombre}${cot.contacto.email ? ` · ${cot.contacto.email}` : ""}` : null },
              { label: "Negocio (Pipeline)", value: cot.oportunidad?.titulo ?? null, href: cot.oportunidad ? `/dashboard/pipeline/${cot.oportunidad.id}` : undefined },
              { label: "Sede / Lugar",    value: cot.sede ?? null },
              { label: "Fecha del evento",value: fmtFecha(cot.fechaEvento) },
              { label: "Validez hasta",   value: fmtFecha(cot.fechaValidez) },
            ] as { label: string; value: string | null; href?: string }[]).map(r => (
              <div key={r.label}>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{r.label}</p>
                {r.href && r.value ? (
                  <Link href={r.href} className="text-brand-600 font-medium hover:underline">{r.value} →</Link>
                ) : (
                  <p className={r.value ? "text-slate-900 font-medium" : "text-slate-300 italic text-xs"}>
                    {r.value ?? "No especificado"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Honorarios (success fee / fee mensual) */}
        {cot.modalidad !== "FEE_FIJO" && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Propuesta de honorarios</h2>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-brand-50 text-brand-700">{MODALIDAD_LABEL[cot.modalidad] ?? cot.modalidad}</span>
            </div>
            {cot.modalidad === "SUCCESS_FEE" ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Área de gasto</th>
                      <th className="px-5 py-3 text-right">Gasto base mensual</th>
                      <th className="px-5 py-3 text-right">Ahorro estimado mensual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(cot.lineasAhorro ?? []).map(l => (
                      <tr key={l.id}>
                        <td className="px-5 py-3 text-slate-800">{l.area}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fmt(Number(l.gastoBaseMensual))}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmt(Number(l.ahorroEstimadoMensual))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-4 border-t border-slate-100 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Ahorro mensual estimado</span><span className="font-semibold">{fmt(ahorroMensualTotal(cot.lineasAhorro ?? []))}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Honorarios (% del ahorro)</span><span className="font-semibold">{Number(cot.porcentajeHonorarios ?? 0)}%</span></div>
                  <div className="flex justify-between text-slate-600"><span>Horizonte</span><span className="font-semibold">{cot.horizonteMeses ?? 0} meses</span></div>
                  <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-2">
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Honorario estimado</span>
                    <span className="text-xl font-bold text-slate-900">{fmt(valorCotizacion(cot))}</span>
                  </div>
                  <p className="text-xs text-slate-400 pt-1">Estimación sobre el ahorro proyectado. El honorario real se cobra sobre el ahorro efectivamente verificado mes a mes.</p>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Fee mensual</span><span className="font-semibold">{fmt(Number(cot.feeMensual ?? 0))}</span></div>
                <div className="flex justify-between text-slate-600"><span>Horizonte</span><span className="font-semibold">{cot.horizonteMeses ?? 0} meses</span></div>
                <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-2">
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Total del contrato</span>
                  <span className="text-xl font-bold text-slate-900">{fmt(valorFeeMensual(cot.feeMensual, cot.horizonteMeses))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ítems (solo modalidad fee fijo) */}
        {cot.modalidad === "FEE_FIJO" && (
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
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                    <input type="number" min={0} max={100} step="0.01" value={impuestoPorcentaje}
                      onChange={e => setImpuestoPorcentaje(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">2º impuesto</label>
                    <input type="text" value={impuesto2Nombre} onChange={e => setImpuesto2Nombre(e.target.value)}
                      placeholder="Ej: Retención"
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                    <input type="number" min={0} max={100} step="0.01" value={impuesto2Porcentaje}
                      onChange={e => setImpuesto2Porcentaje(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={guardarImpuesto} disabled={guardandoImpuesto}
                    className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                    {guardandoImpuesto ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => setEditImpuesto(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditImpuesto(true)} className="text-xs text-brand-600 hover:underline">
                {pctImpuesto > 0 || pctImpuesto2 > 0 ? "Editar impuestos" : "+ Agregar impuesto"}
              </button>
            )}
          </div>
        </div>
        )}

        {/* Notas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Notas / Observaciones</h2>
            {!editNotas && (
              <button onClick={() => setEditNotas(true)}
                className="text-xs text-brand-600 hover:underline">
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={guardarNotas} disabled={guardando}
                  className="rounded-xl bg-accent-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60">
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
