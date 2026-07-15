"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconDatabaseImport, IconBuilding, IconChartFunnel, IconUsers, IconFileText,
  IconCalendar, IconReportAnalytics, IconBooks, IconTheater, IconBuildingPavilion,
  IconFlask, IconDownload, IconCircleCheck, IconApi, IconReportMoney, type Icon,
} from "@tabler/icons-react";

export default function BienvenidaPage() {
  const [nombre, setNombre] = useState("");
  const [esTeatro, setEsTeatro] = useState(false);
  const [esSalones, setEsSalones] = useState(false);
  const [esAhorros, setEsAhorros] = useState(false);
  const [esDemoTeatro, setEsDemoTeatro] = useState(false);
  const [esDemoEvoluteca, setEsDemoEvoluteca] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(d => {
        if (d.tenantNombre) setNombre(d.tenantNombre);
        setEsTeatro(!!d.modulos?.funciones || !!d.modulos?.audiencia);
        setEsSalones(!!d.modulos?.salones);
        setEsAhorros(!!d.modulos?.ahorros);
        setEsDemoTeatro(d.tenantNombre === "Demo Teatro");
        setEsDemoEvoluteca(d.tenantNombre === "Demo Evoluteca");
      });
  }, []);

  const pasos: { num: number; icon: Icon; titulo: string; desc: string; accion: string; href: string; color: string; btnColor: string }[] = [
    {
      num: 1,
      icon: IconDatabaseImport,
      titulo: "Importa tus datos desde Excel",
      desc: "Si tienes una base de datos en Excel, impórtala en un clic. El CRM creará automáticamente clientes, contactos y oportunidades vinculados.",
      accion: "Ir a importación",
      href: "/dashboard/datos/importar-completo",
      color: "border-brand-200 bg-brand-50",
      btnColor: "bg-accent-600 hover:bg-accent-700",
    },
    {
      num: 2,
      icon: IconBuilding,
      titulo: "Agrega tu primer cliente manualmente",
      desc: "¿Prefieres empezar desde cero? Crea un cliente, agrégale contactos y registra tus oportunidades de venta.",
      accion: "Nuevo cliente",
      href: "/dashboard/cuentas",
      color: "border-violet-200 bg-violet-50",
      btnColor: "bg-violet-600 hover:bg-violet-700",
    },
    {
      num: 3,
      icon: IconChartFunnel,
      titulo: "Gestiona tu pipeline de ventas",
      desc: "Mueve oportunidades entre etapas con drag & drop, registra actividades y lleva el control de cada negocio.",
      accion: "Ver pipeline",
      href: "/dashboard/pipeline",
      color: "border-emerald-200 bg-emerald-50",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      num: 4,
      icon: IconApi,
      titulo: "Conecta la captura externa de leads (opcional)",
      desc: "¿Recibes leads desde un formulario web, WhatsApp Business o campañas de anuncios (Meta/Google Ads)? Genera una clave desde Configuración para que cada lead cree automáticamente un cliente, contacto y oportunidad en tu Pipeline, sin que nadie tenga que digitarlo a mano. Es la función más técnica del CRM: necesitas compartir la clave y la dirección del servicio con quien configure tu formulario o automatización — el manual de usuario explica el paso a paso completo.",
      accion: "Ir a Configuración",
      href: "/dashboard/configuracion",
      color: "border-amber-200 bg-amber-50",
      btnColor: "bg-amber-600 hover:bg-amber-700",
    },
  ];

  const modulos: { icon: Icon; label: string; desc: string; href: string }[] = [
    { icon: IconBuilding, label: "Clientes", desc: "Empresas y cuentas", href: "/dashboard/cuentas" },
    { icon: IconUsers, label: "Contactos", desc: "Personas de tus clientes", href: "/dashboard/contactos" },
    { icon: IconChartFunnel, label: "Pipeline", desc: "Oportunidades de venta", href: "/dashboard/pipeline" },
    { icon: IconFileText, label: "Cotizaciones", desc: "Propuestas en PDF", href: "/dashboard/cotizaciones-formales" },
    { icon: IconCalendar, label: "Agenda", desc: "Actividades y tareas", href: "/dashboard/agenda" },
    { icon: IconReportAnalytics, label: "Reportes", desc: "KPIs y métricas", href: "/dashboard/reportes" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4">
          <IconCircleCheck size={14} stroke={1.75} /> Cuenta creada exitosamente
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          ¡Bienvenido{nombre ? ` a ${nombre}` : ""}!
        </h1>
        <p className="text-slate-500 text-base">
          Tu CRM está listo. Sigue estos pasos para empezar en minutos.
        </p>
      </div>

      {/* Pasos */}
      <div className="flex flex-col gap-4 mb-8">
        {pasos.map(paso => {
          const IconoPaso = paso.icon;
          return (
          <div key={paso.num} className={`rounded-2xl border p-5 ${paso.color}`}>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                {paso.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <IconoPaso size={18} stroke={1.75} className="text-slate-600" />
                  <h2 className="text-sm font-bold text-slate-900">{paso.titulo}</h2>
                </div>
                <p className="text-xs text-slate-600 mb-3">{paso.desc}</p>
                <Link href={paso.href}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white ${paso.btnColor} transition-colors`}>
                  {paso.accion} →
                </Link>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Módulos disponibles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Módulos disponibles en tu CRM</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modulos.map(m => {
            const Icono = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 hover:border-brand-200 transition-all group">
                <Icono size={20} stroke={1.75} className="block mb-1 text-brand-600" />
                <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-600">{m.label}</p>
                <p className="text-xs text-slate-400">{m.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Manual de usuario */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <IconBooks size={22} stroke={1.75} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Manual de usuario</h2>
            <p className="text-xs text-slate-500 mb-4">
              Descarga la guía completa del CRM. Incluye todos los módulos, paso a paso con capturas y consejos de uso.
            </p>
            <div className="flex gap-3">
              <a href="/api/manual/pdf" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                <IconDownload size={16} stroke={1.75} /> Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Anexo Teatros — solo visible si el tenant tiene Funciones o Audiencia activo */}
      {esTeatro && (
        <div className="bg-white rounded-2xl border border-violet-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <IconTheater size={22} stroke={1.75} className="text-violet-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Anexo — Teatros y espacios de espectáculos</h2>
              <p className="text-xs text-slate-500 mb-4">
                Guía adicional solo con lo específico de tu operación: registro de asistencia, alerta de ocupación baja, tasa de recompra, segmentación por recencia, niveles de membresía y cola de encuestas NPS por WhatsApp.
              </p>
              <div className="flex gap-3">
                <a href="/api/manual/pdf-teatro" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
                  <IconDownload size={16} stroke={1.75} /> Descargar anexo PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anexo Salones — solo visible si el tenant tiene el módulo Salones activo */}
      {esSalones && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <IconBuildingPavilion size={22} stroke={1.75} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Anexo — Alquiler de Salones</h2>
              <p className="text-xs text-slate-500 mb-4">
                Guía adicional solo con lo específico de tu operación: catálogo de salones, vincular un salón a una cotización u oportunidad, horarios y choques de fecha, calendario de reservas con arrastrar y soltar, y la tabla de alquileres por día.
              </p>
              <div className="flex gap-3">
                <a href="/api/manual/pdf-salones" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
                  <IconDownload size={16} stroke={1.75} /> Descargar anexo PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anexo Facturación por resultados — solo si el módulo está activo */}
      {esAhorros && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <IconReportMoney size={22} stroke={1.75} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Anexo — Facturación por Resultados</h2>
              <p className="text-xs text-slate-500 mb-4">
                Guía adicional solo con lo específico de tu operación: las tres modalidades de cobro (fee fijo, success fee y fee mensual), cómo cotizar por % del ahorro o por fee mensual paso a paso, el cálculo del honorario, y cómo enviar la propuesta al cliente.
              </p>
              <div className="flex gap-3">
                <a href="/api/manual/pdf-ahorros" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                  <IconDownload size={16} stroke={1.75} /> Descargar anexo PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual de pruebas — solo visible en la cuenta demo de teatro */}
      {esDemoTeatro && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <IconFlask size={22} stroke={1.75} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Manual de pruebas — Cuenta Demo</h2>
              <p className="text-xs text-slate-500 mb-4">
                Recorrido guiado paso a paso por esta cuenta de demostración: la parte comercial general y la parte específica de teatros, con las credenciales de los 3 roles.
              </p>
              <div className="flex gap-3">
                <a href="/api/manual/pdf-demo-teatro" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
                  <IconDownload size={16} stroke={1.75} /> Descargar manual de pruebas
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual de pruebas — solo visible en la cuenta demo genérica de Evoluteca */}
      {esDemoEvoluteca && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <IconFlask size={22} stroke={1.75} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Manual de pruebas — Cuenta Demo</h2>
              <p className="text-xs text-slate-500 mb-4">
                Recorrido guiado paso a paso por esta cuenta de demostración: CRM comercial general y las 5 novedades recientes (filtro por vendedor, motivo de pérdida, archivos adjuntos, captura externa de leads y etapas de pipeline configurables), con las credenciales de los roles.
              </p>
              <div className="flex gap-3">
                <a href="/api/manual/pdf-demo-evoluteca" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
                  <IconDownload size={16} stroke={1.75} /> Descargar manual de pruebas
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Puedes volver a esta guía desde el menú en cualquier momento.
        </p>
        <Link href="/dashboard"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Ir al Dashboard →
        </Link>
      </div>
    </div>
  );
}
