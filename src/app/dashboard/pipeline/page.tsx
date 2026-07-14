"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IconSearch, IconX, IconPlus, IconLayoutKanban, IconTable, IconSelector,
  IconArrowNarrowUp, IconArrowNarrowDown, IconCalendarEvent, IconTrash,
  IconChartFunnel, IconTrendingUp, IconTrophy, IconTarget, IconBuildingPavilion,
  IconAlertTriangle, IconMoodSad, type Icon,
} from "@tabler/icons-react";

const MOTIVOS_PERDIDA = [
  "Precio muy alto",
  "Eligió a la competencia",
  "El evento fue cancelado",
  "Sin respuesta del cliente",
  "Presupuesto insuficiente",
  "Fuera de fechas disponibles",
  "Otro",
];

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  creadoEn: string;
  fechaCierre: string | null;
  probabilidad: number | null;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  extras: Record<string, string> | null;
  creadoBy: string | null;
  motivoPerdida: string | null;
};

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

function urgenciaBorde(dias: number, etapa: string): string {
  if (etapa === "GANADA" || etapa === "PERDIDA") return "";
  if (dias < 15) return "border-l-4 border-l-emerald-400";
  if (dias < 30) return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-red-400";
}

function urgenciaBadge(dias: number, etapa: string): string | null {
  if (etapa === "GANADA" || etapa === "PERDIDA") return null;
  return `${dias}d`;
}

function cierreBadge(fechaCierre: string | null, etapa: string): { label: string; color: string } | null {
  if (!fechaCierre || etapa === "GANADA" || etapa === "PERDIDA") return null;
  const dias = Math.ceil((new Date(fechaCierre).getTime() - Date.now()) / 86_400_000);
  if (dias < 0)  return { label: `Vencido ${Math.abs(dias)}d`, color: "bg-red-100 text-red-700" };
  if (dias === 0) return { label: "Cierra hoy", color: "bg-red-100 text-red-700" };
  if (dias <= 7)  return { label: `${dias}d para cierre`, color: "bg-amber-100 text-amber-700" };
  if (dias <= 30) return { label: `${dias}d para cierre`, color: "bg-blue-50 text-blue-600" };
  return null;
}

function urgenciaBadgeColor(dias: number): string {
  if (dias < 15) return "text-emerald-600 bg-emerald-50";
  if (dias < 30) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string };
type UsuarioVendedor = { id: string; nombre: string };
type Salon = { id: string; nombre: string; capacidad: number | null };
type Disponibilidad = { aceptadas: { id: string; empresa: { nombre: string } | null }[]; pendientes: { id: string; empresa: { nombre: string } | null }[] };

// El nombre visible y el orden de cada etapa son configurables por tenant
// (Configuración → Etapas del pipeline), pero el "key" (usado como valor de
// Oportunidad.etapa) y su color/badge quedan fijos en código.
const ETAPA_ESTILO: Record<string, { color: string; badge: string }> = {
  PROSPECTO:   { color: "border-t-slate-400",   badge: "bg-slate-100 text-slate-600" },
  CALIFICADO:  { color: "border-t-blue-400",    badge: "bg-blue-50 text-blue-700" },
  PROPUESTA:   { color: "border-t-violet-400",  badge: "bg-violet-50 text-violet-700" },
  NEGOCIACION: { color: "border-t-amber-400",   badge: "bg-amber-50 text-amber-700" },
  GANADA:      { color: "border-t-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
  PERDIDA:     { color: "border-t-red-400",     badge: "bg-red-50 text-red-600" },
};

const ETAPAS_DEFECTO = [
  { key: "PROSPECTO",   label: "Prospecto" },
  { key: "CALIFICADO",  label: "Calificado" },
  { key: "PROPUESTA",   label: "Cotización" },
  { key: "NEGOCIACION", label: "Negociación" },
  { key: "GANADA",      label: "Ganada" },
  { key: "PERDIDA",     label: "Perdida" },
];

const MESES_LABEL: Record<string, number> = {
  ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6,
  JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12,
};

const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function PipelinePage() {
  const { data: session } = useSession();
  const esAdministrador = session?.user?.rol === "ADMINISTRADOR";

  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [empresas, setEmpresas]   = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [vendedores, setVendedores] = useState<UsuarioVendedor[]>([]);
  const [ETAPAS, setETAPAS] = useState(
    ETAPAS_DEFECTO.map(e => ({ ...e, ...ETAPA_ESTILO[e.key] }))
  );
  const [cargando, setCargando]   = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<string | null>(null);
  const [modalPerdidaId, setModalPerdidaId] = useState<string | null>(null);
  const [motivoPerdidaSel, setMotivoPerdidaSel] = useState("");
  const [otroMotivoPerdida, setOtroMotivoPerdida] = useState("");
  const [busqueda, setBusqueda]   = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes]   = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [vista, setVista] = useState<"kanban" | "tabla">("kanban");
  const [orden, setOrden] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "creadoEn", dir: "desc" });
  const [form, setForm] = useState({
    titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "", probabilidad: "50", fechaCierre: "",
    salonId: "", sede: "", fechaEvento: "", horaInicio: "", horaFin: "",
  });
  const [modoEmpresa, setModoEmpresa] = useState<"existente" | "nueva">("existente");
  const [nuevaEmpresaForm, setNuevaEmpresaForm] = useState({ nombre: "", email: "", telefono: "" });
  const [creandoEmpresaLoading, setCreandoEmpresaLoading] = useState(false);
  const [creandoEmpresaError, setCreandoEmpresaError] = useState("");
  const [modoContacto, setModoContacto] = useState<"existente" | "nuevo">("existente");
  const [nuevoContactoForm, setNuevoContactoForm] = useState({ nombre: "", email: "", telefono: "", cargo: "" });
  const [creandoContactoLoading, setCreandoContactoLoading] = useState(false);
  const [creandoContactoError, setCreandoContactoError] = useState("");
  const [salones, setSalones] = useState<Salon[]>([]);
  const [moduloSalones, setModuloSalones] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const disponibilidadClaveRef = useRef("");

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/oportunidades");
    setOportunidades(await res.json());
    setCargando(false);
  }

  async function cargarRelaciones() {
    const [resEmp, resCon, resConfig, resUsu] = await Promise.all([fetch("/api/empresas"), fetch("/api/contactos"), fetch("/api/configuracion"), fetch("/api/usuarios")]);
    setEmpresas(await resEmp.json());
    setContactos(await resCon.json());
    const usuarios = await resUsu.json();
    setVendedores(Array.isArray(usuarios) ? usuarios.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })) : []);
    const config = await resConfig.json();
    const salonesActivo = !!config?.modulos?.salones;
    setModuloSalones(salonesActivo);
    if (salonesActivo) {
      fetch("/api/salones").then(r => r.json()).then(s => setSalones(Array.isArray(s) ? s : []));
    }
  }

  useEffect(() => { cargar(); cargarRelaciones(); }, []);

  useEffect(() => {
    fetch("/api/etapas-pipeline").then(r => r.json()).then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      setETAPAS(
        data
          .filter((e: { oculta?: boolean }) => !e.oculta)
          .map((e: { key: string; nombre: string }) => ({ key: e.key, label: e.nombre, ...ETAPA_ESTILO[e.key] }))
      );
    });
  }, []);

  useEffect(() => {
    if (!form.salonId || !form.fechaEvento) { setDisponibilidad(null); return; }
    const clave = `${form.salonId}|${form.fechaEvento}|${form.horaInicio}|${form.horaFin}`;
    const t = setTimeout(async () => {
      disponibilidadClaveRef.current = clave;
      const params = new URLSearchParams({ salonId: form.salonId, fecha: form.fechaEvento });
      if (form.horaInicio && form.horaFin) { params.set("horaInicio", form.horaInicio); params.set("horaFin", form.horaFin); }
      const res = await fetch(`/api/salones/disponibilidad?${params.toString()}`);
      const data = await res.json();
      if (disponibilidadClaveRef.current === clave) setDisponibilidad(data);
    }, 300);
    return () => clearTimeout(t);
  }, [form.salonId, form.fechaEvento, form.horaInicio, form.horaFin]);

  async function crearEmpresaInline() {
    if (!nuevaEmpresaForm.nombre.trim()) return;
    setCreandoEmpresaLoading(true);
    setCreandoEmpresaError("");
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaEmpresaForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreandoEmpresaError(data.error ?? "No se pudo crear el cliente");
      setCreandoEmpresaLoading(false);
      return;
    }
    const nueva = await res.json();
    setEmpresas(prev => [{ id: nueva.id, nombre: nueva.nombre }, ...prev]);
    setForm(f => ({ ...f, empresaId: nueva.id }));
    setModoEmpresa("existente");
    setNuevaEmpresaForm({ nombre: "", email: "", telefono: "" });
    setCreandoEmpresaLoading(false);
  }

  async function crearContactoInline() {
    if (!nuevoContactoForm.nombre.trim()) return;
    setCreandoContactoLoading(true);
    setCreandoContactoError("");
    const res = await fetch("/api/contactos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevoContactoForm, empresaId: form.empresaId || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreandoContactoError(data.error ?? "No se pudo crear el contacto");
      setCreandoContactoLoading(false);
      return;
    }
    const nuevo = await res.json();
    setContactos(prev => [nuevo, ...prev]);
    setForm(f => ({ ...f, contactoId: nuevo.id }));
    setModoContacto("existente");
    setNuevoContactoForm({ nombre: "", email: "", telefono: "", cargo: "" });
    setCreandoContactoLoading(false);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (modoEmpresa === "nueva" && !form.empresaId && nuevaEmpresaForm.nombre.trim()) {
      setCreandoEmpresaError("Tienes datos de un cliente nuevo sin crear. Haz clic en \"Crear cliente\" o cambia a \"Existente\".");
      return;
    }
    if (modoContacto === "nuevo" && !form.contactoId && nuevoContactoForm.nombre.trim()) {
      setCreandoContactoError("Tienes datos de un contacto nuevo sin crear. Haz clic en \"Crear contacto\" o cambia a \"Existente\".");
      return;
    }
    setGuardando(true);
    await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "", probabilidad: "50", fechaCierre: "", salonId: "", sede: "", fechaEvento: "", horaInicio: "", horaFin: "" });
    setModoEmpresa("existente");
    setNuevaEmpresaForm({ nombre: "", email: "", telefono: "" });
    setModoContacto("existente");
    setNuevoContactoForm({ nombre: "", email: "", telefono: "", cargo: "" });
    setDisponibilidad(null);
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(id: string, etapa: string) {
    if (etapa === "PERDIDA") {
      setMotivoPerdidaSel("");
      setOtroMotivoPerdida("");
      setModalPerdidaId(id);
      return; // espera a que se elija un motivo en el modal antes de mover la tarjeta
    }
    const actual = oportunidades.find(o => o.id === id);
    let cotizacionNumero: string | undefined;
    if (actual && (actual.etapa === "PROSPECTO" || actual.etapa === "CALIFICADO") && etapa !== actual.etapa) {
      const cot = prompt("Número de cotización (opcional):");
      if (cot && cot.trim()) cotizacionNumero = cot.trim();
    }
    // Guardado optimista con reversión: si el PATCH no persiste (red, sesión
    // expirada, error del servidor), se restaura el estado previo y se avisa,
    // para que el usuario nunca crea que un cambio quedó guardado si no lo está.
    const previas = oportunidades;
    setOportunidades(prev => prev.map(o => o.id === id ? {
      ...o,
      etapa,
      ...(cotizacionNumero ? { extras: { ...(o.extras || {}), "COTIZACION NUMERO": cotizacionNumero } } : {}),
    } : o));
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa, ...(cotizacionNumero ? { cotizacionNumero } : {}) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOportunidades(previas);
      toast.error("No se pudo guardar el cambio de etapa. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function confirmarPerdida() {
    if (!modalPerdidaId) return;
    const id = modalPerdidaId;
    const motivoPerdida = motivoPerdidaSel === "Otro" ? otroMotivoPerdida.trim() : motivoPerdidaSel;
    const previas = oportunidades;
    setOportunidades(prev => prev.map(o => o.id === id ? { ...o, etapa: "PERDIDA", motivoPerdida } : o));
    setModalPerdidaId(null);
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: "PERDIDA", motivoPerdida }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOportunidades(previas);
      toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function eliminarOportunidad(id: string, titulo: string) {
    if (!esAdministrador) { toast.error("Solicita al Administrador borrar esta oportunidad."); return; }
    if (!confirm(`¿Eliminar la oportunidad "${titulo}"? Esta acción no se puede deshacer.`)) return;
    const previas = oportunidades;
    setOportunidades(prev => prev.filter(o => o.id !== id));
    try {
      const res = await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setOportunidades(previas);
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function fmt(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }
  function fmtN(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  // ── Años y meses desde fechaCierre ──
  // iso viene como "2026-07-10T05:00:00.000Z" — tomamos los primeros 7 chars "2026-07"
  const opConFecha = oportunidades.filter(o => !!o.fechaCierre);

  const aniosDisponibles = Array.from(new Set(
    opConFecha.map(o => o.fechaCierre!.substring(0, 4))
  )).sort((a, b) => Number(b) - Number(a));

  const mesesDisponibles = Array.from(new Set(
    opConFecha.map(o => String(Number(o.fechaCierre!.substring(5, 7))))
  )).sort((a, b) => Number(a) - Number(b));

  // ── Filtrado ──
  const filtradas = oportunidades.filter(o => {
    if (filtroAnio && (!o.fechaCierre || o.fechaCierre.substring(0, 4) !== filtroAnio)) return false;
    if (filtroMes  && (!o.fechaCierre || String(Number(o.fechaCierre.substring(5, 7))) !== filtroMes)) return false;
    if (filtroEtapa && o.etapa !== filtroEtapa) return false;
    if (filtroVendedor && o.creadoBy !== filtroVendedor) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!o.titulo.toLowerCase().includes(q) &&
          !o.empresa?.nombre.toLowerCase().includes(q) &&
          !(o.extras?.["COTIZACION NUMERO"] ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hayFiltro = busqueda || filtroAnio || filtroMes || filtroEtapa || filtroVendedor;

  // ── Ordenamiento para vista tabla ──
  function ordenar(col: string) {
    setOrden(prev => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  }
  function sortIcon(col: string) {
    if (orden.col !== col) return <IconSelector size={12} stroke={2} className="inline text-slate-300 ml-1" />;
    return orden.dir === "asc"
      ? <IconArrowNarrowUp size={12} stroke={2} className="inline text-brand-500 ml-1" />
      : <IconArrowNarrowDown size={12} stroke={2} className="inline text-brand-500 ml-1" />;
  }
  const tablaOrdenada = [...filtradas].sort((a, b) => {
    const dir = orden.dir === "asc" ? 1 : -1;
    if (orden.col === "valor")       return dir * (Number(a.valor ?? 0) - Number(b.valor ?? 0));
    if (orden.col === "probabilidad") return dir * ((a.probabilidad ?? 50) - (b.probabilidad ?? 50));
    if (orden.col === "fechaCierre") return dir * ((a.fechaCierre ?? "").localeCompare(b.fechaCierre ?? ""));
    if (orden.col === "etapa")       return dir * a.etapa.localeCompare(b.etapa);
    if (orden.col === "empresa")     return dir * (a.empresa?.nombre ?? "").localeCompare(b.empresa?.nombre ?? "");
    // creadoEn por defecto
    return dir * a.creadoEn.localeCompare(b.creadoEn);
  });

  // ── KPIs ──
  const etapasActivas = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"];
  const activas  = filtradas.filter(o => etapasActivas.includes(o.etapa));
  const ganadas  = filtradas.filter(o => o.etapa === "GANADA");
  const perdidas = filtradas.filter(o => o.etapa === "PERDIDA");
  const valorGanadas  = ganadas.reduce((acc,o)  => acc + Number(o.valor ?? 0), 0);
  const valorPerdidas = perdidas.reduce((acc,o) => acc + Number(o.valor ?? 0), 0);
  const valorActivas  = activas.reduce((acc,o)  => acc + Number(o.valor ?? 0), 0);
  const valorPonderado = activas.reduce((acc,o) => acc + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0);
  const tasa = (ganadas.length + perdidas.length) > 0
    ? Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100) : 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline</h1>
        <p className="text-slate-500 text-sm mt-1">Oportunidades de venta por etapa</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {([
          { label: "Pipeline activo",        valor: fmtN(valorActivas),  sub: `${activas.length} oportunidades`,                         icon: IconChartFunnel, semantic: false },
          { label: "Pronóstico ponderado",   valor: fmtN(valorPonderado), sub: "valor × probabilidad",                                     icon: IconTrendingUp,  semantic: false },
          { label: "Valor ganado",           valor: fmtN(valorGanadas),  sub: `${ganadas.length} negocios cerrados`,                       icon: IconTrophy,      semantic: true, ibg: "bg-emerald-50", itxt: "text-emerald-600" },
          { label: "Valor perdido",          valor: fmtN(valorPerdidas), sub: `${perdidas.length} perdidos`,                               icon: IconX,           semantic: true, ibg: "bg-red-50",     itxt: "text-red-500" },
          { label: "Tasa de cierre",         valor: `${tasa}%`,          sub: `${ganadas.length} ganadas · ${perdidas.length} perdidas`,   icon: IconTarget,      semantic: false },
        ] as { label: string; valor: string; sub: string; icon: Icon; semantic: boolean; ibg?: string; itxt?: string }[]).map(k => {
          const Icono = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.semantic ? k.ibg : "bg-brand-50"}`}>
                  <Icono size={18} stroke={1.75} className={k.semantic ? k.itxt : "text-brand-600"} />
                </div>
              </div>
              <p className={`font-extrabold text-slate-900 leading-tight ${k.valor.length > 10 ? "text-lg" : "text-2xl"}`}>{k.valor}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{k.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── FILTROS + TOGGLE ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={14} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente, evento o N° cotización..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-brand-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>

        {/* Año */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Cierre año:</label>
          <select value={filtroAnio} onChange={e => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
            className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer">
            <option value="">Todos</option>
            {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Mes */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Cierre mes:</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer">
            <option value="">Todos</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{MESES_NOMBRE[Number(m) - 1]}</option>)}
          </select>
        </div>

        {/* Etapa (solo en tabla) */}
        {vista === "tabla" && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-500">Etapa:</label>
            <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer">
              <option value="">Todas</option>
              {ETAPAS.map(et => <option key={et.key} value={et.key}>{et.label}</option>)}
            </select>
          </div>
        )}

        {/* Vendedor (solo roles con visión de equipo) */}
        {session?.user?.rol !== "COMERCIAL" && vendedores.length > 0 && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-500">Vendedor:</label>
            <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer">
              <option value="">Todos</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Contador + limpiar */}
        {hayFiltro && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{filtradas.length} de {oportunidades.length}</span>
            <button onClick={() => { setBusqueda(""); setFiltroAnio(""); setFiltroMes(""); setFiltroEtapa(""); setFiltroVendedor(""); }}
              className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
              <IconX size={12} stroke={2} />Limpiar
            </button>
          </div>
        )}

        <button onClick={() => setMostrarForm(v => !v)}
          className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-medium text-white hover:bg-accent-700 flex items-center gap-1">
          {mostrarForm ? <><IconX size={13} stroke={2} />Cancelar</> : <><IconPlus size={13} stroke={2} />Nueva oportunidad</>}
        </button>

        {/* Toggle vista */}
        <div className="ml-auto flex rounded-xl border border-slate-200 overflow-hidden bg-white">
          <button onClick={() => setVista("kanban")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${vista === "kanban" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconLayoutKanban size={14} stroke={1.75} />Kanban
          </button>
          <button onClick={() => setVista("tabla")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${vista === "tabla" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconTable size={14} stroke={1.75} />Tabla
          </button>
        </div>
      </div>

      {/* ── FORMULARIO ── */}
      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Nueva oportunidad</h2>
            <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-600"><IconX size={18} stroke={1.75} /></button>
          </div>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título *</label>
              <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Valor estimado (COP)</label>
              <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Etapa</label>
              <select value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                {ETAPAS.map(et => <option key={et.key} value={et.key}>{et.label}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-slate-500">Empresa</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoEmpresa("existente")}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${modoEmpresa === "existente" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoEmpresa("nueva")}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${modoEmpresa === "nueva" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    + Nueva
                  </button>
                </div>
              </div>
              {modoEmpresa === "existente" ? (
                <select value={form.empresaId} onChange={e => setForm({...form, empresaId: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              ) : (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-2.5">
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Nombre del cliente *" value={nuevaEmpresaForm.nombre}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="email" placeholder="Email (opcional)" value={nuevaEmpresaForm.email}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="text" placeholder="Teléfono (opcional)" value={nuevaEmpresaForm.telefono}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    {creandoEmpresaError && <p className="text-xs text-red-600">{creandoEmpresaError}</p>}
                    <button type="button" onClick={crearEmpresaInline} disabled={creandoEmpresaLoading || !nuevaEmpresaForm.nombre.trim()}
                      className="self-start rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                      {creandoEmpresaLoading ? "Creando..." : "Crear cliente"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-slate-500">Contacto</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoContacto("existente")}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${modoContacto === "existente" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoContacto("nuevo")}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${modoContacto === "nuevo" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    + Nuevo
                  </button>
                </div>
              </div>
              {modoContacto === "existente" ? (
                <select value={form.contactoId} onChange={e => setForm({...form, contactoId: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin contacto</option>
                  {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-2.5">
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Nombre del contacto *" value={nuevoContactoForm.nombre}
                      onChange={e => setNuevoContactoForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="email" placeholder="Email (opcional)" value={nuevoContactoForm.email}
                      onChange={e => setNuevoContactoForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="text" placeholder="Teléfono (opcional)" value={nuevoContactoForm.telefono}
                      onChange={e => setNuevoContactoForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    {creandoContactoError && <p className="text-xs text-red-600">{creandoContactoError}</p>}
                    <button type="button" onClick={crearContactoInline} disabled={creandoContactoLoading || !nuevoContactoForm.nombre.trim()}
                      className="self-start rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                      {creandoContactoLoading ? "Creando..." : "Crear contacto"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {moduloSalones && (
              <div className="col-span-2 pt-2 mt-1 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1"><IconBuildingPavilion size={13} stroke={1.75} />Salón (módulo Salones)</p>
                <label className="mb-1 block text-xs text-slate-500">Salón</label>
                <select value={form.salonId} onChange={e => setForm({...form, salonId: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">— Sin salón del catálogo —</option>
                  {salones.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.capacidad ? ` (${s.capacidad} pers.)` : ""}</option>)}
                </select>
                {disponibilidad && disponibilidad.aceptadas.length > 0 && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <p className="font-semibold flex items-center gap-1"><IconAlertTriangle size={13} stroke={1.75} />Ese salón ya tiene una cotización aceptada ese día:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {disponibilidad.aceptadas.map(c => <li key={c.id}>{c.empresa?.nombre ?? "Sin empresa"}</li>)}
                    </ul>
                  </div>
                )}
                {disponibilidad && disponibilidad.aceptadas.length === 0 && disponibilidad.pendientes.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {disponibilidad.pendientes.length} cotización(es) pendiente(s) también interesada(s) en esa fecha y salón.
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sede / Lugar</label>
              <input value={form.sede} onChange={e => setForm({...form, sede: e.target.value})}
                placeholder="Teatro Nacional, Sala A..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha del evento</label>
              <input type="date" value={form.fechaEvento} onChange={e => setForm({...form, fechaEvento: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {moduloSalones && form.salonId && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">Horario (opcional)</label>
                <div className="flex items-center gap-2">
                  <input type="time" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <span className="text-slate-400 text-xs">a</span>
                  <input type="time" value={form.horaFin} onChange={e => setForm({...form, horaFin: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">
                Probabilidad de cierre: <span className="font-semibold text-brand-600">{form.probabilidad}%</span>
              </label>
              <input type="range" min="0" max="100" step="5" value={form.probabilidad}
                onChange={e => setForm({...form, probabilidad: e.target.value})}
                className="w-full accent-brand-600" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha de cierre estimada</label>
              <input type="date" value={form.fechaCierre} onChange={e => setForm({...form, fechaCierre: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── VISTAS ── */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : vista === "tabla" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Oportunidad</th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("empresa")}>
                    Cliente {sortIcon("empresa")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("etapa")}>
                    Etapa {sortIcon("etapa")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold cursor-pointer select-none" onClick={() => ordenar("valor")}>
                    Valor {sortIcon("valor")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold cursor-pointer select-none" onClick={() => ordenar("probabilidad")}>
                    Prob. {sortIcon("probabilidad")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("fechaCierre")}>
                    Cierre {sortIcon("fechaCierre")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("creadoEn")}>
                    Creada {sortIcon("creadoEn")}
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tablaOrdenada.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">Sin oportunidades</td></tr>
                )}
                {tablaOrdenada.map(o => {
                  const etapa = ETAPAS.find(e => e.key === o.etapa);
                  const cb = cierreBadge(o.fechaCierre, o.etapa);
                  const dias = diasDesde(o.creadoEn);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/pipeline/${o.id}`} className="font-medium text-slate-900 hover:text-brand-600 transition-colors">
                          {o.titulo}
                        </Link>
                        {o.extras?.["COTIZACION NUMERO"] && (
                          <p className="text-xs text-slate-400">{o.extras["COTIZACION NUMERO"]}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.empresa?.nombre ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${etapa?.badge ?? ""}`}>
                          {etapa?.label ?? o.etapa}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {o.valor ? fmt(o.valor) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.etapa !== "GANADA" && o.etapa !== "PERDIDA"
                          ? <span className="text-xs font-bold text-brand-600">{o.probabilidad ?? 50}%</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {cb
                          ? <span className={`text-xs rounded-full px-2 py-0.5 font-medium inline-flex items-center gap-1 ${cb.color}`}><IconCalendarEvent size={12} stroke={1.75} />{cb.label}</span>
                          : o.fechaCierre
                            ? <span className="text-xs text-slate-400">{new Date(o.fechaCierre).toLocaleDateString("es-CO",{timeZone:"UTC"})}</span>
                            : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(o.creadoEn).toLocaleDateString("es-CO")}
                        <span className={`ml-1 text-xs rounded-full px-1 ${urgenciaBadgeColor(dias)}`}>{dias}d</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => eliminarOportunidad(o.id, o.titulo)} title="Eliminar oportunidad"
                          className="text-slate-300 hover:text-red-500 inline-flex">
                          <IconTrash size={15} stroke={1.75} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {tablaOrdenada.length} oportunidad{tablaOrdenada.length !== 1 ? "es" : ""}
          </div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-6 gap-3">
          {ETAPAS.map(etapa => {
            const items = filtradas.filter(o => o.etapa === etapa.key);
            const isOver = dragOverEtapa === etapa.key;
            return (
              <div key={etapa.key}
                className={`rounded-xl border-2 border-t-4 border-slate-200 ${etapa.color} p-3 transition-colors ${
                  isOver ? "bg-brand-50 border-brand-300" : "bg-slate-50"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOverEtapa(etapa.key); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverEtapa(null); }}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("oportunidadId");
                  if (id) cambiarEtapa(id, etapa.key);
                  setDraggingId(null);
                  setDragOverEtapa(null);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700">{etapa.label}</h3>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${etapa.badge}`}>{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-0.5">
                  {items.length === 0 && (
                    <div className={`rounded-lg border-2 border-dashed py-6 text-center text-xs transition-colors ${
                      isOver ? "border-brand-300 text-brand-400 bg-brand-50" : "border-slate-200 text-slate-400"
                    }`}>
                      {isOver ? "Soltar aquí" : "Sin registros"}
                    </div>
                  )}
                  {items.map(o => {
                    const dias = diasDesde(o.creadoEn);
                    const badge = urgenciaBadge(dias, etapa.key);
                    return (
                    <div key={o.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData("oportunidadId", o.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(o.id);
                      }}
                      onDragEnd={() => { setDraggingId(null); setDragOverEtapa(null); }}
                      className={`rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm cursor-grab active:cursor-grabbing transition-opacity select-none ${urgenciaBorde(dias, etapa.key)} ${
                        draggingId === o.id ? "opacity-40" : "hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <Link href={`/dashboard/pipeline/${o.id}`}
                          className="font-semibold text-slate-900 leading-snug hover:text-brand-600 transition-colors"
                          onClick={e => { if (draggingId) e.preventDefault(); }}>
                          {o.titulo}
                        </Link>
                        <button onClick={() => eliminarOportunidad(o.id, o.titulo)} title="Eliminar oportunidad"
                          className="text-slate-300 hover:text-red-500 shrink-0">
                          <IconTrash size={13} stroke={1.75} />
                        </button>
                      </div>
                      {o.empresa && <p className="text-slate-500 mb-1">{o.empresa.nombre}</p>}
                      {(() => { const cb = cierreBadge(o.fechaCierre, o.etapa); return cb ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold mb-1 ${cb.color}`}><IconCalendarEvent size={11} stroke={1.75} />{cb.label}</span>
                      ) : null; })()}
                      {o.extras?.["COTIZACION NUMERO"] && (
                        <p className="text-slate-400 mb-1">{o.extras["COTIZACION NUMERO"]}</p>
                      )}
                      {o.extras?.["AÑO"] && (
                        <p className="text-slate-400">
                          {o.extras["AÑO"]}{o.extras["MES ELABORACION"] ? ` · ${o.extras["MES ELABORACION"]}` : ""}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        {o.valor
                          ? <p className="font-semibold text-emerald-700">{fmt(o.valor)}</p>
                          : <span />
                        }
                        <div className="flex items-center gap-1">
                          {(etapa.key !== "GANADA" && etapa.key !== "PERDIDA") && (
                            <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold bg-brand-50 text-brand-600">
                              {o.probabilidad ?? 50}%
                            </span>
                          )}
                          {badge && (
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${urgenciaBadgeColor(dias)}`}>
                              {badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {/* Drop zone visible al final de columnas con items */}
                  {items.length > 0 && isOver && (
                    <div className="rounded-lg border-2 border-dashed border-brand-300 py-3 text-center text-xs text-brand-400">
                      Soltar aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda: qué significan los colores del borde de cada tarjeta */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">¿Qué significan los colores de las tarjetas?</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
            <span className="text-slate-400">La barra de color a la izquierda indica hace cuánto se creó el negocio:</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-1 rounded bg-emerald-400" />Menos de 15 días — reciente</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-1 rounded bg-amber-400" />Entre 15 y 29 días — dale seguimiento</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-1 rounded bg-red-400" />30 días o más — estancado</span>
            <span className="text-slate-400">Los negocios en Ganada y Perdida no muestran barra (ya están cerrados).</span>
          </div>
        </div>
        </>
      )}

      {/* Modal motivo de pérdida */}
      {modalPerdidaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><IconMoodSad size={20} stroke={1.75} className="text-red-500" /></div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">¿Por qué se perdió este negocio?</h2>
                <p className="text-xs text-slate-400">Esta información ayuda a mejorar futuros cierres</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {MOTIVOS_PERDIDA.map(m => (
                <button key={m} onClick={() => setMotivoPerdidaSel(m)}
                  className={`text-left rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    motivoPerdidaSel === m
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {m}
                </button>
              ))}
            </div>

            {motivoPerdidaSel === "Otro" && (
              <input
                type="text"
                value={otroMotivoPerdida}
                onChange={e => setOtroMotivoPerdida(e.target.value)}
                placeholder="Describe el motivo..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 mb-4"
                autoFocus
              />
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={confirmarPerdida} disabled={!motivoPerdidaSel || (motivoPerdidaSel === "Otro" && !otroMotivoPerdida.trim())}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40">
                Marcar como perdida
              </button>
              <button onClick={() => setModalPerdidaId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
