"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconAlertTriangle, IconTemplate, IconCheck } from "@tabler/icons-react";
import { MoneyInput } from "@/components/money-input";

type Empresa  = { id: string; nombre: string; condicionesComerciales?: string | null };
type Contacto = { id: string; nombre: string; email: string | null; empresa: { id: string } | null };
type Oportunidad = { id: string; titulo: string; empresa: { id: string } | null };
type Producto = { id: string; nombre: string; precioBase: string; descripcion: string | null };
type ItemPlantilla = { descripcion: string; cantidad: number; precioUnit: string };
type Plantilla = { id: string; nombre: string; notas: string | null; items: ItemPlantilla[] };
type Salon = { id: string; nombre: string; capacidad: number | null };
type Disponibilidad = { aceptadas: { id: string; empresa: { nombre: string } | null }[]; pendientes: { id: string; empresa: { nombre: string } | null }[] };

type Linea = { descripcion: string; cantidad: string; precioUnit: string };
type LineaAhorro = { area: string; gastoBaseMensual: string; ahorroEstimadoMensual: string };

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

// Borrador autoguardado en el navegador para que no se pierda lo escrito
// al devolverse (botón atrás, "Cancelar" o enlace) antes de guardar.
const DRAFT_KEY = "evoluteca:nueva-cotizacion-draft";

function loadDraft(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [draft] = useState(loadDraft);
  const d = (draft ?? {}) as Record<string, any>;
  const [borradorRestaurado, setBorradorRestaurado] = useState(draft !== null);

  function empezarEnBlanco() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
    window.location.reload();
  }

  const [empresas, setEmpresas]       = useState<Empresa[]>([]);
  const [contactos, setContactos]     = useState<Contacto[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [plantillas, setPlantillas]   = useState<Plantilla[]>([]);
  const [salones, setSalones]         = useState<Salon[]>([]);
  const [moduloSalones, setModuloSalones] = useState(false);
  const [cargando, setCargando]       = useState(true);
  const [enviando, setEnviando]       = useState(false);
  const [error, setError]             = useState("");
  const [plantillaCargada, setPlantillaCargada] = useState("");
  const [plantillaCargadaId, setPlantillaCargadaId] = useState("");

  const [empresaId, setEmpresaId]         = useState<string>(d.empresaId ?? "");
  const [contactoId, setContactoId]       = useState<string>(d.contactoId ?? "");
  const [oportunidadId, setOportunidadId] = useState<string>(d.oportunidadId ?? "");
  const [salonId, setSalonId]         = useState<string>(d.salonId ?? "");
  const [numeroManual, setNumeroManual] = useState<string>(d.numeroManual ?? "");
  const [sede, setSede]               = useState<string>(d.sede ?? "");
  const [fechaEvento, setFechaEvento] = useState<string>(d.fechaEvento ?? "");
  const [horaInicio, setHoraInicio] = useState<string>(d.horaInicio ?? "");
  const [horaFin, setHoraFin]       = useState<string>(d.horaFin ?? "");
  const [fechaValidez, setFechaValidez] = useState<string>(d.fechaValidez ?? "");
  const [notas, setNotas]             = useState<string>(d.notas ?? "");
  const [condicionesComerciales, setCondicionesComerciales] = useState<string>(d.condicionesComerciales ?? "");
  // Marca si el usuario editó a mano las condiciones; si no, al cambiar de
  // cliente se reemplazan con las del cliente elegido sin miedo a pisar algo.
  const [condicionesTocadas, setCondicionesTocadas] = useState<boolean>(d.condicionesComerciales != null && d.condicionesComerciales !== "");
  const [impuestoNombre, setImpuestoNombre] = useState<string>(d.impuestoNombre ?? "IVA");
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState<string>(d.impuestoPorcentaje ?? "");
  const [impuesto2Nombre, setImpuesto2Nombre] = useState<string>(d.impuesto2Nombre ?? "");
  const [impuesto2Porcentaje, setImpuesto2Porcentaje] = useState<string>(d.impuesto2Porcentaje ?? "");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const disponibilidadClaveRef = useRef("");

  const [modoEmpresa, setModoEmpresa] = useState<"existente" | "nueva">(d.modoEmpresa ?? "existente");
  const [nuevaEmpresaForm, setNuevaEmpresaForm] = useState<{ nombre: string; email: string; telefono: string }>(d.nuevaEmpresaForm ?? { nombre: "", email: "", telefono: "" });
  const [creandoEmpresaLoading, setCreandoEmpresaLoading] = useState(false);
  const [creandoEmpresaError, setCreandoEmpresaError] = useState("");

  const [modoContacto, setModoContacto] = useState<"existente" | "nuevo">(d.modoContacto ?? "existente");
  const [nuevoContactoForm, setNuevoContactoForm] = useState<{ nombre: string; email: string; telefono: string; cargo: string }>(d.nuevoContactoForm ?? { nombre: "", email: "", telefono: "", cargo: "" });
  const [creandoContactoLoading, setCreandoContactoLoading] = useState(false);
  const [creandoContactoError, setCreandoContactoError] = useState("");

  const [modoOportunidad, setModoOportunidad] = useState<"existente" | "nueva">(d.modoOportunidad ?? "existente");
  const [nuevaOportunidadForm, setNuevaOportunidadForm] = useState<{ titulo: string }>(d.nuevaOportunidadForm ?? { titulo: "" });
  const [creandoOportunidadLoading, setCreandoOportunidadLoading] = useState(false);
  const [creandoOportunidadError, setCreandoOportunidadError] = useState("");

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
    setEmpresas(prev => [{ id: nueva.id, nombre: nueva.nombre, condicionesComerciales: nueva.condicionesComerciales ?? null }, ...prev]);
    setEmpresaId(nueva.id);
    setContactoId("");
    setOportunidadId("");
    setModoEmpresa("existente");
    // Un cliente recién creado no tiene contactos existentes: guiamos al usuario
    // directo a "+ Nuevo" para que pueda crear el contacto de ese cliente.
    setModoContacto("nuevo");
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
      body: JSON.stringify({ ...nuevoContactoForm, empresaId: empresaId || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreandoContactoError(data.error ?? "No se pudo crear el contacto");
      setCreandoContactoLoading(false);
      return;
    }
    const nuevo = await res.json();
    setContactos(prev => [nuevo, ...prev]);
    setContactoId(nuevo.id);
    setModoContacto("existente");
    setNuevoContactoForm({ nombre: "", email: "", telefono: "", cargo: "" });
    setCreandoContactoLoading(false);
  }

  async function crearOportunidadInline() {
    if (!nuevaOportunidadForm.titulo.trim()) return;
    setCreandoOportunidadLoading(true);
    setCreandoOportunidadError("");
    const res = await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: nuevaOportunidadForm.titulo.trim(),
        empresaId: empresaId || null,
        contactoId: contactoId || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreandoOportunidadError(data.error ?? "No se pudo crear la oportunidad");
      setCreandoOportunidadLoading(false);
      return;
    }
    const nueva = await res.json();
    setOportunidades(prev => [{ id: nueva.id, titulo: nueva.titulo, empresa: empresaId ? { id: empresaId } : null }, ...prev]);
    setOportunidadId(nueva.id);
    setModoOportunidad("existente");
    setNuevaOportunidadForm({ titulo: "" });
    setCreandoOportunidadLoading(false);
  }

  useEffect(() => {
    if (!salonId || !fechaEvento) { setDisponibilidad(null); return; }
    const clave = `${salonId}|${fechaEvento}|${horaInicio}|${horaFin}`;
    const t = setTimeout(async () => {
      disponibilidadClaveRef.current = clave;
      const params = new URLSearchParams({ salonId, fecha: fechaEvento });
      if (horaInicio && horaFin) { params.set("horaInicio", horaInicio); params.set("horaFin", horaFin); }
      const res = await fetch(`/api/salones/disponibilidad?${params.toString()}`);
      const data = await res.json();
      // Ignora la respuesta si el usuario ya cambió salón/fecha/hora (evita que una
      // respuesta lenta y vieja sobreescriba el resultado de una selección más reciente).
      if (disponibilidadClaveRef.current === clave) setDisponibilidad(data);
    }, 300);
    return () => clearTimeout(t);
  }, [salonId, fechaEvento, horaInicio, horaFin]);

  const [lineas, setLineas] = useState<Linea[]>(d.lineas ?? [
    { descripcion: "", cantidad: "1", precioUnit: "" },
  ]);

  // Modalidad de cobro (módulo "Facturación por resultados").
  const [moduloAhorros, setModuloAhorros] = useState(false);
  const [modalidad, setModalidad] = useState<"FEE_FIJO" | "SUCCESS_FEE" | "FEE_MENSUAL">(d.modalidad ?? "FEE_FIJO");
  const [lineasAhorro, setLineasAhorro] = useState<LineaAhorro[]>(d.lineasAhorro ?? [
    { area: "", gastoBaseMensual: "", ahorroEstimadoMensual: "" },
  ]);
  const [porcentajeHonorarios, setPorcentajeHonorarios] = useState<string>(d.porcentajeHonorarios ?? "50");
  const [horizonteMeses, setHorizonteMeses] = useState<string>(d.horizonteMeses ?? "18");
  const [feeMensual, setFeeMensual] = useState<string>(d.feeMensual ?? "");

  const dirty =
    empresaId !== "" || contactoId !== "" || oportunidadId !== "" || salonId !== "" ||
    numeroManual !== "" ||
    sede !== "" || fechaEvento !== "" || horaInicio !== "" || horaFin !== "" || fechaValidez !== "" || notas !== "" || condicionesComerciales !== "" ||
    impuestoNombre !== "IVA" || impuestoPorcentaje !== "" || impuesto2Nombre !== "" || impuesto2Porcentaje !== "" ||
    lineas.some(l => l.descripcion !== "" || l.cantidad !== "1" || l.precioUnit !== "") || lineas.length > 1 ||
    modoEmpresa !== "existente" || nuevaEmpresaForm.nombre !== "" || nuevaEmpresaForm.email !== "" || nuevaEmpresaForm.telefono !== "" ||
    modoContacto !== "existente" || nuevoContactoForm.nombre !== "" || nuevoContactoForm.email !== "" || nuevoContactoForm.telefono !== "" || nuevoContactoForm.cargo !== "" ||
    modoOportunidad !== "existente" || nuevaOportunidadForm.titulo !== "" ||
    modalidad !== "FEE_FIJO" ||
    lineasAhorro.some(l => l.area !== "" || l.gastoBaseMensual !== "" || l.ahorroEstimadoMensual !== "") || lineasAhorro.length > 1 ||
    porcentajeHonorarios !== "50" || horizonteMeses !== "18" || feeMensual !== "";

  useEffect(() => {
    function avisarSiHayCambios(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", avisarSiHayCambios);
    return () => window.removeEventListener("beforeunload", avisarSiHayCambios);
  }, [dirty]);

  // Autoguarda el borrador en el navegador mientras haya cambios, para que no
  // se pierda al devolverse (atrás, "Cancelar" o enlace). Se limpia al guardar.
  useEffect(() => {
    if (!dirty) {
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
      return;
    }
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        empresaId, contactoId, oportunidadId, salonId, numeroManual, sede,
        fechaEvento, horaInicio, horaFin, fechaValidez, notas, condicionesComerciales,
        impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje,
        modoEmpresa, nuevaEmpresaForm, modoContacto, nuevoContactoForm,
        modoOportunidad, nuevaOportunidadForm,
        lineas, modalidad, lineasAhorro, porcentajeHonorarios, horizonteMeses, feeMensual,
      }));
    } catch {}
  }, [
    dirty, empresaId, contactoId, oportunidadId, salonId, numeroManual, sede,
    fechaEvento, horaInicio, horaFin, fechaValidez, notas,
    impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje,
    modoEmpresa, nuevaEmpresaForm, modoContacto, nuevoContactoForm,
    modoOportunidad, nuevaOportunidadForm,
    lineas, modalidad, lineasAhorro, porcentajeHonorarios, horizonteMeses, feeMensual,
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/empresas").then(r => r.json()),
      fetch("/api/contactos").then(r => r.json()),
      fetch("/api/oportunidades?todas=1").then(r => r.json()),
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/plantillas-cotizacion").then(r => r.json()),
      fetch("/api/configuracion").then(r => r.json()),
    ]).then(([emp, con, opo, prod, plant, config]) => {
      setEmpresas(Array.isArray(emp) ? emp : []);
      setContactos(Array.isArray(con) ? con : []);
      setOportunidades(Array.isArray(opo) ? opo : []);
      setProductos(Array.isArray(prod) ? prod : []);
      setPlantillas(Array.isArray(plant) ? plant : []);
      const salonesActivo = !!config?.modulos?.salones;
      setModuloSalones(salonesActivo);
      if (salonesActivo) {
        fetch("/api/salones").then(r => r.json()).then(s => setSalones(Array.isArray(s) ? s : []));
      }
      setModuloAhorros(!!config?.modulos?.ahorros);
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

  function updateLineaAhorro(i: number, field: keyof LineaAhorro, val: string) {
    setLineasAhorro(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }
  function addLineaAhorro() {
    setLineasAhorro(prev => [...prev, { area: "", gastoBaseMensual: "", ahorroEstimadoMensual: "" }]);
  }
  function removeLineaAhorro(i: number) {
    setLineasAhorro(prev => prev.filter((_, idx) => idx !== i));
  }

  // Cálculos en vivo de las modalidades de honorarios.
  const ahorroMensualTot = lineasAhorro.reduce((a, l) => a + (parseFloat(l.ahorroEstimadoMensual) || 0), 0);
  const gastoBaseTot = lineasAhorro.reduce((a, l) => a + (parseFloat(l.gastoBaseMensual) || 0), 0);
  const meses = parseInt(horizonteMeses) || 0;
  const valorSuccessFee = ahorroMensualTot * ((parseFloat(porcentajeHonorarios) || 0) / 100) * meses;
  const valorFeeMensualCalc = (parseFloat(feeMensual) || 0) * meses;

  const subtotal = lineas.reduce((acc, l) => {
    const q = parseFloat(l.cantidad) || 0;
    const p = parseFloat(l.precioUnit) || 0;
    return acc + q * p;
  }, 0);
  const pctImpuesto = parseFloat(impuestoPorcentaje) || 0;
  const valorImpuesto = subtotal * (pctImpuesto / 100);
  const pctImpuesto2 = parseFloat(impuesto2Porcentaje) || 0;
  const valorImpuesto2 = subtotal * (pctImpuesto2 / 100);
  const totalGeneral = subtotal + valorImpuesto + valorImpuesto2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const lineasValidas = lineas.filter(l => l.descripcion.trim());
    const lineasAhorroValidas = lineasAhorro.filter(l => l.area.trim());
    if (modalidad === "FEE_FIJO" && lineasValidas.length === 0) {
      setError("Agrega al menos una línea de servicio con descripción.");
      return;
    }
    if (modalidad === "SUCCESS_FEE") {
      if (lineasAhorroValidas.length === 0) { setError("Agrega al menos una línea de ahorro con su área."); return; }
      if (!(parseFloat(porcentajeHonorarios) > 0)) { setError("Indica el % de honorarios."); return; }
      if (!meses) { setError("Indica el horizonte en meses."); return; }
    }
    if (modalidad === "FEE_MENSUAL") {
      if (!(parseFloat(feeMensual) > 0)) { setError("Indica el fee mensual."); return; }
      if (!meses) { setError("Indica el horizonte en meses."); return; }
    }
    if (modoEmpresa === "nueva" && !empresaId && nuevaEmpresaForm.nombre.trim()) {
      setError("Tienes datos de un cliente nuevo sin crear. Haz clic en \"Crear cliente\" o cambia a \"Existente\".");
      return;
    }
    if (modoContacto === "nuevo" && !contactoId && nuevoContactoForm.nombre.trim()) {
      setError("Tienes datos de un contacto nuevo sin crear. Haz clic en \"Crear contacto\" o cambia a \"Existente\".");
      return;
    }
    if (modoOportunidad === "nueva" && !oportunidadId && nuevaOportunidadForm.titulo.trim()) {
      setError("Tienes datos de una oportunidad nueva sin crear. Haz clic en \"Crear oportunidad\" o cambia a \"Existente\".");
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
        salonId:      salonId      || null,
        numeroManual: numeroManual.trim() || null,
        sede:         sede.trim()  || null,
        condicionesComerciales: condicionesComerciales.trim() || null,
        fechaEvento:  fechaEvento  || null,
        horaInicio:   horaInicio   || null,
        horaFin:      horaFin      || null,
        fechaValidez: fechaValidez || null,
        notas:        notas.trim() || null,
        impuestoNombre: impuestoNombre.trim() || null,
        impuestoPorcentaje: impuestoPorcentaje || null,
        impuesto2Nombre: impuesto2Nombre.trim() || null,
        impuesto2Porcentaje: impuesto2Porcentaje || null,
        modalidad,
        items: modalidad === "FEE_FIJO" ? lineasValidas.map(l => ({
          descripcion: l.descripcion.trim(),
          cantidad:    parseInt(l.cantidad) || 1,
          precioUnit:  parseFloat(l.precioUnit) || 0,
        })) : [],
        lineasAhorro: modalidad === "SUCCESS_FEE" ? lineasAhorroValidas.map(l => ({
          area: l.area.trim(),
          gastoBaseMensual: parseFloat(l.gastoBaseMensual) || 0,
          ahorroEstimadoMensual: parseFloat(l.ahorroEstimadoMensual) || 0,
        })) : [],
        porcentajeHonorarios: modalidad === "SUCCESS_FEE" ? (porcentajeHonorarios || null) : null,
        horizonteMeses: (modalidad === "SUCCESS_FEE" || modalidad === "FEE_MENSUAL") ? (horizonteMeses || null) : null,
        feeMensual: modalidad === "FEE_MENSUAL" ? (feeMensual || null) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      setEnviando(false);
      return;
    }

    const cot = await res.json();
    try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
    router.push(`/dashboard/cotizaciones-formales/${cot.id}`);
  }

  if (cargando) return <p className="text-sm text-slate-400 p-6">Cargando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/cotizaciones-formales" className="text-slate-400 hover:text-slate-700 text-sm inline-flex items-center gap-1">
          <IconArrowLeft size={14} stroke={1.75} /> Cotizaciones
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Nueva cotización</h1>
      </div>

      {borradorRestaurado && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
          <span>Recuperamos el borrador que estabas escribiendo.</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={empezarEnBlanco} className="font-medium text-brand-700 hover:underline">
              Empezar en blanco
            </button>
            <button type="button" onClick={() => setBorradorRestaurado(false)} className="text-brand-400 hover:text-brand-600" aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Cargar plantilla — destacado para que no pase desapercibido */}
        {plantillas.length > 0 && (
          <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <IconTemplate size={20} stroke={1.75} />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-violet-900">¿Empezar desde una plantilla?</h2>
                <p className="text-xs text-violet-700 mt-0.5 mb-3">
                  Carga los ítems y notas de una plantilla guardada y ahorra tiempo. Luego ajusta lo que sea específico de este cliente.
                </p>
                <label className="block text-xs font-medium text-violet-800 mb-1">Elegir plantilla</label>
                <select
                  value={plantillaCargadaId}
                  className="w-full rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-sm text-violet-900 font-medium outline-none focus:border-violet-500"
                  onChange={e => {
                    const p = plantillas.find(x => x.id === e.target.value);
                    if (!p) { setPlantillaCargada(""); setPlantillaCargadaId(""); return; }
                    setLineas(p.items.map(it => ({
                      descripcion: it.descripcion,
                      cantidad: String(it.cantidad),
                      precioUnit: String(it.precioUnit),
                    })));
                    if (p.notas) setNotas(p.notas);
                    setPlantillaCargada(p.nombre);
                    setPlantillaCargadaId(p.id);
                  }}>
                  <option value="">— Selecciona una plantilla para cargarla —</option>
                  {plantillas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.items.length} ítems)</option>
                  ))}
                </select>
                {plantillaCargada && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <IconCheck size={14} stroke={2} /> Plantilla «{plantillaCargada}» cargada. Revisa los ítems y notas abajo antes de guardar.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cliente */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Cliente y oportunidad</h2>
          <div className="flex flex-col gap-5">

            {/* Empresa */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-600">Cliente</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoEmpresa("existente")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoEmpresa === "existente" ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoEmpresa("nueva")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoEmpresa === "nueva" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    + Nuevo
                  </button>
                </div>
              </div>
              {modoEmpresa === "existente" ? (
                <select value={empresaId} onChange={e => {
                    const id = e.target.value;
                    setEmpresaId(id); setContactoId(""); setOportunidadId("");
                    // Precarga las condiciones comerciales del cliente elegido,
                    // salvo que el usuario ya las haya editado a mano.
                    if (!condicionesTocadas) {
                      const emp = empresas.find(x => x.id === id);
                      setCondicionesComerciales(emp?.condicionesComerciales ?? "");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-brand-500">
                  <option value="">— Sin empresa —</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              ) : (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
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

            {/* Contacto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-600">Contacto</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoContacto("existente")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoContacto === "existente" ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoContacto("nuevo")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoContacto === "nuevo" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    + Nuevo
                  </button>
                </div>
              </div>
              {modoContacto === "existente" ? (
                <select value={contactoId} onChange={e => setContactoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-brand-500">
                  <option value="">— Sin contacto —</option>
                  {contactosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
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

            {/* Oportunidad */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-600">Oportunidad vinculada</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoOportunidad("existente")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoOportunidad === "existente" ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoOportunidad("nueva")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${modoOportunidad === "nueva" ? "bg-accent-600 text-white" : "bg-slate-300 text-slate-800 hover:bg-slate-400"}`}>
                    + Nueva
                  </button>
                </div>
              </div>
              {modoOportunidad === "existente" ? (
                <select value={oportunidadId} onChange={e => setOportunidadId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-brand-500">
                  <option value="">— Sin oportunidad —</option>
                  {oportunidadesFiltradas.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                </select>
              ) : (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Título de la oportunidad *" value={nuevaOportunidadForm.titulo}
                      onChange={e => setNuevaOportunidadForm(f => ({ ...f, titulo: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    {creandoOportunidadError && <p className="text-xs text-red-600">{creandoOportunidadError}</p>}
                    <button type="button" onClick={crearOportunidadInline} disabled={creandoOportunidadLoading || !nuevaOportunidadForm.titulo.trim()}
                      className="self-start rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                      {creandoOportunidadLoading ? "Creando..." : "Crear oportunidad"}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Detalles del evento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Detalles del evento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moduloSalones && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Salón</label>
                <select value={salonId} onChange={e => setSalonId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-brand-500">
                  <option value="">— Sin salón del catálogo (usar texto libre abajo) —</option>
                  {salones.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}{s.capacidad ? ` (${s.capacidad} pers.)` : ""}</option>
                  ))}
                </select>
                {salones.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Aún no tienes salones en el catálogo. <Link href="/dashboard/salones" className="underline">Agrega uno</Link>.
                  </p>
                )}
                {disponibilidad && disponibilidad.aceptadas.length > 0 && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <p className="font-semibold inline-flex items-center gap-1"><IconAlertTriangle size={13} stroke={1.75} /> Ya reservado ese día:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {disponibilidad.aceptadas.map(c => <li key={c.id}>{c.empresa?.nombre ?? "Sin empresa"} (cotización aceptada)</li>)}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Sede / Lugar</label>
              <input type="text" value={sede} onChange={e => setSede(e.target.value)}
                placeholder="Teatro Nacional, Sala A..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha del evento</label>
              <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {moduloSalones && salonId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Horario</label>
                <div className="flex items-center gap-2">
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <span className="text-slate-400 text-xs">a</span>
                  <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Opcional — déjalo vacío para reservar el día completo.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de validez</label>
              <input type="date" value={fechaValidez} onChange={e => setFechaValidez(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número del cliente</label>
              <input type="text" value={numeroManual} onChange={e => setNumeroManual(e.target.value)}
                placeholder="Automático" maxLength={40}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <p className="text-[11px] text-slate-400 mt-1">Opcional — si el cliente lleva su propio consecutivo (ej. COT-2026-045). Vacío usa el automático.</p>
            </div>
          </div>
        </div>

        {/* Selector de modalidad (módulo Facturación por resultados) */}
        {moduloAhorros && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">Modalidad de cobro</h2>
            <p className="text-xs text-slate-400 mb-3">Cómo se cobra esta cotización.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { k: "FEE_FIJO", t: "Fee fijo", d: "Líneas de servicio con precio" },
                { k: "SUCCESS_FEE", t: "Success fee", d: "% del ahorro estimado × meses" },
                { k: "FEE_MENSUAL", t: "Fee mensual", d: "Honorario fijo mensual × meses" },
              ] as const).map(op => (
                <button type="button" key={op.k} onClick={() => setModalidad(op.k)}
                  className={`text-left rounded-xl border p-3 transition-colors ${modalidad === op.k ? "border-brand-400 ring-2 ring-brand-100 bg-brand-50/40" : "border-slate-200 hover:border-slate-300"}`}>
                  <p className="text-sm font-semibold text-slate-800">{op.t}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{op.d}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Líneas de servicio (fee fijo) */}
        {modalidad === "FEE_FIJO" && (
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  min={1}
                  value={linea.cantidad}
                  onChange={e => updateLinea(i, "cantidad", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-center"
                />
                <MoneyInput
                  placeholder="0"
                  value={linea.precioUnit}
                  onChange={v => updateLinea(i, "precioUnit", v)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-right"
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
              className="text-sm text-brand-600 hover:underline">
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
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-500">
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

          {/* Impuestos */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Impuesto</label>
                  <input type="text" value={impuestoNombre} onChange={e => setImpuestoNombre(e.target.value)}
                    placeholder="Ej: IVA"
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                  <input type="number" min={0} max={100} step="0.01" value={impuestoPorcentaje}
                    onChange={e => setImpuestoPorcentaje(e.target.value)}
                    placeholder="0"
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">2º impuesto (opcional)</label>
                  <input type="text" value={impuesto2Nombre} onChange={e => setImpuesto2Nombre(e.target.value)}
                    placeholder="Ej: Retención"
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">%</label>
                  <input type="number" min={0} max={100} step="0.01" value={impuesto2Porcentaje}
                    onChange={e => setImpuesto2Porcentaje(e.target.value)}
                    placeholder="0"
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Subtotal: <span className="font-medium text-slate-600">{fmt(subtotal)}</span></p>
              {pctImpuesto > 0 && (
                <p className="text-xs text-slate-400">{impuestoNombre || "Impuesto"} ({pctImpuesto}%): <span className="font-medium text-slate-600">{fmt(valorImpuesto)}</span></p>
              )}
              {pctImpuesto2 > 0 && (
                <p className="text-xs text-slate-400">{impuesto2Nombre || "Impuesto"} ({pctImpuesto2}%): <span className="font-medium text-slate-600">{fmt(valorImpuesto2)}</span></p>
              )}
              <p className="text-xs text-slate-400 uppercase tracking-wide mt-1">Total</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(totalGeneral)}</p>
            </div>
          </div>
        </div>
        )}

        {/* Ahorro estimado (success fee) */}
        {modalidad === "SUCCESS_FEE" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">Ahorro estimado por área</h2>
            <p className="text-xs text-slate-400 mb-3">Los honorarios son un % de este ahorro durante el horizonte del contrato.</p>
            <div className="mb-2 grid grid-cols-[1fr_120px_120px_28px] gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
              <span>Área de gasto</span><span className="text-right">Gasto base/mes</span><span className="text-right">Ahorro/mes</span><span />
            </div>
            <div className="flex flex-col gap-2">
              {lineasAhorro.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_120px_28px] gap-2 items-center">
                  <input type="text" placeholder="Ej: Telecomunicaciones" value={l.area}
                    onChange={e => updateLineaAhorro(i, "area", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <MoneyInput placeholder="0" value={l.gastoBaseMensual}
                    onChange={v => updateLineaAhorro(i, "gastoBaseMensual", v)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-right" />
                  <MoneyInput placeholder="0" value={l.ahorroEstimadoMensual}
                    onChange={v => updateLineaAhorro(i, "ahorroEstimadoMensual", v)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-right" />
                  <button type="button" onClick={() => removeLineaAhorro(i)} disabled={lineasAhorro.length === 1}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-30 text-lg font-bold leading-none">×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLineaAhorro} className="mt-3 text-sm text-brand-600 hover:underline">+ Área de gasto</button>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-4">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">% honorarios</label>
                  <input type="number" min={0} max={100} step="1" value={porcentajeHonorarios}
                    onChange={e => setPorcentajeHonorarios(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Horizonte (meses)</label>
                  <input type="number" min={1} step="1" value={horizonteMeses}
                    onChange={e => setHorizonteMeses(e.target.value)}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Ahorro mensual: <span className="font-medium text-slate-600">{fmt(ahorroMensualTot)}</span> · Gasto base: <span className="font-medium text-slate-600">{fmt(gastoBaseTot)}</span></p>
                <p className="text-xs text-slate-400 uppercase tracking-wide mt-1">Honorario estimado</p>
                <p className="text-2xl font-bold text-slate-900">{fmt(valorSuccessFee)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fee mensual */}
        {modalidad === "FEE_MENSUAL" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Fee mensual</h2>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fee mensual (COP)</label>
                  <MoneyInput placeholder="0" value={feeMensual}
                    onChange={v => setFeeMensual(v)}
                    className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Horizonte (meses)</label>
                  <input type="number" min={1} step="1" value={horizonteMeses}
                    onChange={e => setHorizonteMeses(e.target.value)}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Total del contrato</p>
                <p className="text-2xl font-bold text-slate-900">{fmt(valorFeeMensualCalc)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Condiciones comerciales (por cliente, salen en el PDF y el enlace público) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-700">Condiciones comerciales</h2>
            {empresaId && (
              <span className="text-[11px] text-slate-400">
                {condicionesComerciales ? "Precargadas del cliente — editables" : "Este cliente no tiene condiciones guardadas"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Forma de pago, plazos, cláusulas específicas de este cliente. Salen en el PDF y el enlace público.
          </p>
          <textarea
            value={condicionesComerciales}
            onChange={e => { setCondicionesComerciales(e.target.value); setCondicionesTocadas(true); }}
            rows={5}
            placeholder="Ej: Forma de pago 50% anticipo y 50% contra entrega. Vigencia 30 días. Retención en la fuente según ley..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* Notas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Notas / Observaciones</h2>
          <textarea
            value={notas} onChange={e => setNotas(e.target.value)}
            rows={3}
            placeholder="Condiciones especiales, información adicional..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <div className="flex items-center gap-3 justify-end pb-6">
          <Link href="/dashboard/cotizaciones-formales"
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </Link>
          <button type="submit" disabled={enviando}
            className="rounded-xl bg-accent-600 px-5 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60">
            {enviando ? "Guardando..." : "Guardar como borrador"}
          </button>
        </div>
      </form>
    </div>
  );
}
