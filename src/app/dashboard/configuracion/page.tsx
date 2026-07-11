"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  IconTheater, IconTicket, IconScale, IconBuildingPavilion,
  IconBuilding, IconUsers, IconChartFunnel, IconCalendar, IconFileText,
  IconReportAnalytics, IconUsersGroup, IconDownload, IconTrash, IconCheck,
  IconKey, IconCopy, IconRefresh, IconGripVertical,
  type Icon,
} from "@tabler/icons-react";

type EtapaPipeline = { id: string; key: string; nombre: string; orden: number };

type Modulos = {
  funciones?: boolean;
  audiencia?: boolean;
  expedientes?: boolean;
  salones?: boolean;
};

const MODULOS_DISPONIBLES: { key: string; titulo: string; descripcion: string; icon: Icon }[] = [
  {
    key: "funciones",
    titulo: "Módulo Funciones / Eventos",
    descripcion: "Registra cada función, obra o evento: fecha, ocupación de sillas, canal de venta e ingresos estimados. Ideal para teatros, auditorios, salones de eventos y academias.",
    icon: IconTheater,
  },
  {
    key: "audiencia",
    titulo: "Módulo Audiencia (B2C)",
    descripcion: "Gestiona tu público: espectadores individuales, grupos, colegios y empresas. Incluye captura de NPS post-función para medir satisfacción y retención.",
    icon: IconTicket,
  },
  {
    key: "expedientes",
    titulo: "Módulo Expedientes (jurídico)",
    descripcion: "Gestiona casos jurídicos: radicado, juzgado, contraparte, plazos procesales con alertas, bitácora de actuaciones y registro de horas por abogado. Ideal para despachos de abogados.",
    icon: IconScale,
  },
  {
    key: "salones",
    titulo: "Módulo Salones (alquiler de espacios)",
    descripcion: "Catálogo de salones con capacidad y descripción, selector de salón en cada cotización, calendario mensual de reservas y aviso de choque de fechas cuando dos cotizaciones apuntan al mismo salón el mismo día. Ideal para negocios con varios espacios en alquiler.",
    icon: IconBuildingPavilion,
  },
];

const MODULOS_ESTANDAR: { titulo: string; icon: Icon; desc: string }[] = [
  { titulo: "Clientes", icon: IconBuilding, desc: "Empresas y organizaciones B2B" },
  { titulo: "Contactos", icon: IconUsers, desc: "Personas de tus clientes" },
  { titulo: "Pipeline", icon: IconChartFunnel, desc: "Oportunidades de venta" },
  { titulo: "Agenda", icon: IconCalendar, desc: "Tareas, llamadas y reuniones" },
  { titulo: "Cotizaciones", icon: IconFileText, desc: "Cotizaciones activas" },
  { titulo: "Reportes", icon: IconReportAnalytics, desc: "KPIs y métricas del negocio" },
  { titulo: "Equipo", icon: IconUsersGroup, desc: "Usuarios y roles" },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [modulos, setModulos] = useState<Modulos>({});
  const [logoUrl, setLogoUrl] = useState("");
  const [logoInput, setLogoInput] = useState("");
  const [emailsActivos, setEmailsActivos] = useState(true);
  const [guardandoEmails, setGuardandoEmails] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [logoOk, setLogoOk] = useState(false);
  const [logoError, setLogoError] = useState("");

  const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2MB

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    setLogoError("");
    if (!file.type.startsWith("image/")) {
      setLogoError("El archivo debe ser una imagen (PNG, JPG, etc).");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("La imagen no puede pesar más de 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoInput(String(reader.result));
    reader.onerror = () => setLogoError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  }

  const esAdmin = session?.user?.rol === "ADMINISTRADOR";
  const [limpiando, setLimpiando] = useState(false);
  const [apiKeyLeads, setApiKeyLeads] = useState<string | null>(null);
  const [generandoKey, setGenerandoKey] = useState(false);
  const [keyCopiada, setKeyCopiada] = useState(false);
  const [etapas, setEtapas] = useState<EtapaPipeline[]>([]);
  const [guardandoEtapas, setGuardandoEtapas] = useState(false);
  const [etapasOk, setEtapasOk] = useState(false);
  const [draggingEtapaId, setDraggingEtapaId] = useState<string | null>(null);

  function cargarEtapas() {
    fetch("/api/etapas-pipeline").then(res => res.json()).then(data => setEtapas(Array.isArray(data) ? data : []));
  }

  async function guardarEtapas(nuevasEtapas: EtapaPipeline[]) {
    setGuardandoEtapas(true);
    await fetch("/api/etapas-pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapas: nuevasEtapas.map((e, i) => ({ id: e.id, nombre: e.nombre, orden: i + 1 })) }),
    });
    setGuardandoEtapas(false);
    setEtapasOk(true);
    setTimeout(() => setEtapasOk(false), 2000);
  }

  function renombrarEtapa(id: string, nombre: string) {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, nombre } : e));
  }

  function onDropEtapa(idDestino: string) {
    if (!draggingEtapaId || draggingEtapaId === idDestino) { setDraggingEtapaId(null); return; }
    const nuevas = [...etapas];
    const origenIdx = nuevas.findIndex(e => e.id === draggingEtapaId);
    const destinoIdx = nuevas.findIndex(e => e.id === idDestino);
    const [movida] = nuevas.splice(origenIdx, 1);
    nuevas.splice(destinoIdx, 0, movida);
    setDraggingEtapaId(null);
    setEtapas(nuevas);
    guardarEtapas(nuevas);
  }

  async function generarApiKey() {
    if (apiKeyLeads && !confirm("¿Rotar la clave? Cualquier integración que use la clave actual dejará de funcionar de inmediato.")) return;
    setGenerandoKey(true);
    const res = await fetch("/api/configuracion/api-key", { method: "POST" });
    const data = await res.json();
    setApiKeyLeads(data.apiKeyLeads ?? null);
    setGenerandoKey(false);
  }

  function copiarApiKey() {
    if (!apiKeyLeads) return;
    navigator.clipboard.writeText(apiKeyLeads);
    setKeyCopiada(true);
    setTimeout(() => setKeyCopiada(false), 2000);
  }

  async function handleLimpiar() {
    if (!confirm("¿Estás seguro? Esto borrará TODAS las empresas, contactos, oportunidades, actividades, cotizaciones, funciones y espectadores. Tu usuario y configuración se conservan.")) return;
    if (!confirm("Segunda confirmación: ¿borrar todos los datos de prueba?")) return;
    setLimpiando(true);
    await fetch("/api/configuracion/limpiar", { method: "DELETE" });
    setLimpiando(false);
    alert("✓ Datos eliminados. El CRM está limpio.");
  }

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => {
        setModulos((data.modulos as Modulos) ?? {});
        setLogoUrl(data.logoUrl ?? "");
        setLogoInput(data.logoUrl ?? "");
        setEmailsActivos(data.emailsActivos ?? true);
        setCargando(false);
      });
  }, []);

  useEffect(() => {
    if (session?.user?.rol !== "ADMINISTRADOR") return;
    fetch("/api/configuracion/api-key")
      .then(res => res.json())
      .then(data => setApiKeyLeads(data.apiKeyLeads ?? null));
  }, [session?.user?.rol]);

  useEffect(() => { cargarEtapas(); }, []);

  async function guardarLogo() {
    setGuardandoLogo(true);
    await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: logoInput }),
    });
    setLogoUrl(logoInput);
    setGuardandoLogo(false);
    setLogoOk(true);
    setTimeout(() => setLogoOk(false), 2500);
  }

  async function toggleEmails(valor: boolean) {
    if (!esAdmin) return;
    setGuardandoEmails(true);
    setEmailsActivos(valor);
    await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailsActivos: valor }),
    });
    setGuardandoEmails(false);
  }

  async function toggleModulo(key: string, valor: boolean) {
    if (!esAdmin) return;
    const nuevos = { ...modulos, [key]: valor };
    setModulos(nuevos);
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modulos: nuevos }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">Personaliza los módulos activos de tu CRM</p>
      </div>

      {!esAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-6">
          Solo un administrador puede cambiar la configuración.
        </div>
      )}

      {/* Logo de la empresa */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Logo de la empresa</h2>
        <p className="text-xs text-slate-400 mb-4">
          Se muestra en el encabezado de tus cotizaciones en PDF. Sube una imagen desde tu computador (PNG o JPG, máx. 2MB, fondo transparente recomendado).
        </p>
        <div className="flex flex-col sm:flex-row items-start gap-3">
          {(logoInput || logoUrl) && (
            <img src={logoInput || logoUrl} alt="Logo" className="h-14 w-auto rounded-lg border border-slate-200 bg-slate-50 p-1 object-contain" />
          )}
          <div className="flex-1 w-full">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoFile}
              disabled={!esAdmin}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-50 mb-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            {logoError && <p className="text-xs text-red-600 mb-2">{logoError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={guardarLogo}
                disabled={!esAdmin || guardandoLogo || logoInput === logoUrl}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 transition-colors"
              >
                {guardandoLogo ? "Guardando..." : "Guardar logo"}
              </button>
              {logoOk && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <IconCheck size={14} stroke={2} /> Logo guardado
                </span>
              )}
              {(logoInput || logoUrl) && (
                <button
                  onClick={() => { setLogoInput(""); setLogoError(""); }}
                  disabled={!esAdmin}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  Quitar logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Módulos estándar</h2>
        <p className="text-xs text-slate-400 mb-4">Siempre activos para todos los tipos de negocio.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULOS_ESTANDAR.map((m) => {
            const Icono = m.icon;
            return (
              <div key={m.titulo} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Icono size={18} stroke={1.75} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.titulo}</p>
                    <p className="text-xs text-slate-400">{m.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Activo</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Módulos opcionales</h2>
        <p className="text-xs text-slate-400 mb-4">Actívalos según el tipo de negocio.</p>
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {MODULOS_DISPONIBLES.map((m) => {
              const activo = !!(modulos as Record<string, boolean>)[m.key];
              const Icono = m.icon;
              return (
                <div key={m.key} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Icono size={20} stroke={1.75} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg">{m.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {guardando && <span className="text-xs text-slate-400">Guardando...</span>}
                    {guardado && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <IconCheck size={14} stroke={2} /> Guardado
                      </span>
                    )}
                    <button
                      disabled={!esAdmin}
                      onClick={() => toggleModulo(m.key, !activo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        activo ? "bg-accent-600" : "bg-slate-200"
                      } ${!esAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          activo ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notificaciones por email */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Notificaciones automáticas por email</h2>
        <p className="text-xs text-slate-400 mb-4">
          Cuando está activo, el CRM envía correos diarios a cada vendedor con sus actividades vencidas, negocios estancados y cierres próximos.
          Desactívalo si prefieres que nadie reciba estos recordatorios.
        </p>
        <div className="flex items-center gap-4">
          <button
            disabled={!esAdmin || guardandoEmails}
            onClick={() => toggleEmails(!emailsActivos)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              emailsActivos ? "bg-accent-600" : "bg-slate-200"
            } ${!esAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                emailsActivos ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-slate-700">
            {guardandoEmails ? "Guardando..." : emailsActivos ? "Emails activados" : "Emails desactivados"}
          </span>
          {!emailsActivos && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">Los vendedores no recibirán recordatorios</span>
          )}
        </div>
      </div>

      {/* Exportar datos */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Exportar datos</h2>
        <p className="text-xs text-slate-400 mb-4">
          Descarga toda la información del CRM en un solo archivo Excel con múltiples hojas (Clientes, Contactos, Pipeline, Actividades, Cotizaciones). Ideal para backup o análisis externo.
        </p>
        <a
          href="/api/exportar/completo"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <IconDownload size={16} stroke={1.75} /> Descargar Excel completo
        </a>
      </div>

      {esAdmin && etapas.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <IconChartFunnel size={16} stroke={1.75} />Etapas del pipeline
            </h2>
            {etapasOk && <span className="text-xs text-emerald-600 font-medium">✓ Guardado</span>}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Cambia el nombre visible de cada etapa y arrástralas para reordenarlas. El orden y los nombres se reflejan en el Pipeline y en Reportes.
          </p>
          <div className="flex flex-col gap-1.5">
            {etapas.map(e => (
              <div key={e.id}
                draggable
                onDragStart={() => setDraggingEtapaId(e.id)}
                onDragOver={ev => ev.preventDefault()}
                onDrop={() => onDropEtapa(e.id)}
                onDragEnd={() => setDraggingEtapaId(null)}
                className={`flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-white cursor-grab active:cursor-grabbing ${draggingEtapaId === e.id ? "opacity-40" : ""}`}>
                <IconGripVertical size={16} stroke={1.75} className="text-slate-300 shrink-0" />
                <input
                  value={e.nombre}
                  onChange={ev => renombrarEtapa(e.id, ev.target.value)}
                  onBlur={() => guardarEtapas(etapas)}
                  className="flex-1 text-sm text-slate-800 outline-none border-b border-transparent focus:border-brand-400 py-0.5"
                />
              </div>
            ))}
          </div>
          {guardandoEtapas && <p className="text-xs text-slate-400 mt-2">Guardando...</p>}
        </div>
      )}

      {esAdmin && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <IconKey size={16} stroke={1.75} />Captura externa de leads
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Conecta un formulario web, WhatsApp Business o una campaña de ads para crear leads (cliente + contacto + oportunidad) directo en el Pipeline, sin acceso al CRM. Envía un <code className="bg-slate-100 rounded px-1">POST</code> a{" "}
            <code className="bg-slate-100 rounded px-1 break-all">{typeof window !== "undefined" ? window.location.origin : ""}/api/publico/leads</code>{" "}
            con el header <code className="bg-slate-100 rounded px-1">x-api-key</code> y un body JSON (mínimo <code className="bg-slate-100 rounded px-1">empresaNombre</code>).
          </p>

          {apiKeyLeads ? (
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 break-all">{apiKeyLeads}</code>
              <button onClick={copiarApiKey}
                className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Copiar">
                {keyCopiada ? <IconCheck size={16} stroke={1.75} className="text-emerald-600" /> : <IconCopy size={16} stroke={1.75} />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mb-3 italic">Todavía no has generado una clave.</p>
          )}

          <button onClick={generarApiKey} disabled={generandoKey}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <IconRefresh size={16} stroke={1.75} />
            {generandoKey ? "Generando..." : apiKeyLeads ? "Rotar clave" : "Generar clave"}
          </button>
        </div>
      )}

      {esAdmin && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold text-red-800 mb-1">Zona de peligro</h2>
          <p className="text-xs text-red-600 mb-4">
            Borra todos los datos del CRM (empresas, contactos, oportunidades, cotizaciones, actividades, funciones y espectadores). Tu usuario y configuración se conservan. Útil para limpiar datos de prueba antes de empezar en producción.
          </p>
          <button
            onClick={handleLimpiar}
            disabled={limpiando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <IconTrash size={16} stroke={1.75} />
            {limpiando ? "Limpiando..." : "Limpiar todos los datos de prueba"}
          </button>
        </div>
      )}
    </div>
  );
}
