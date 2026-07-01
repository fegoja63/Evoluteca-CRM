"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BienvenidaPage() {
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(d => { if (d.tenantNombre) setNombre(d.tenantNombre); });
  }, []);

  const pasos = [
    {
      num: 1,
      emoji: "📥",
      titulo: "Importa tus datos desde Excel",
      desc: "Si tienes una base de datos en Excel, impórtala en un clic. El CRM creará automáticamente clientes, contactos y oportunidades vinculados.",
      accion: "Ir a importación",
      href: "/dashboard/datos/importar-completo",
      color: "border-blue-200 bg-blue-50",
      btnColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      num: 2,
      emoji: "🏢",
      titulo: "Agrega tu primer cliente manualmente",
      desc: "¿Prefieres empezar desde cero? Crea un cliente, agrégale contactos y registra tus oportunidades de venta.",
      accion: "Nuevo cliente",
      href: "/dashboard/cuentas",
      color: "border-violet-200 bg-violet-50",
      btnColor: "bg-violet-600 hover:bg-violet-700",
    },
    {
      num: 3,
      emoji: "◈",
      titulo: "Gestiona tu pipeline de ventas",
      desc: "Mueve oportunidades entre etapas con drag & drop, registra actividades y lleva el control de cada negocio.",
      accion: "Ver pipeline",
      href: "/dashboard/pipeline",
      color: "border-emerald-200 bg-emerald-50",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
    },
  ];

  const modulos = [
    { emoji: "🏢", label: "Clientes", desc: "Empresas y cuentas", href: "/dashboard/cuentas" },
    { emoji: "👤", label: "Contactos", desc: "Personas de tus clientes", href: "/dashboard/contactos" },
    { emoji: "◈", label: "Pipeline", desc: "Oportunidades de venta", href: "/dashboard/pipeline" },
    { emoji: "📄", label: "Cotizaciones", desc: "Negocios activos", href: "/dashboard/cotizaciones" },
    { emoji: "📅", label: "Agenda", desc: "Actividades y tareas", href: "/dashboard/agenda" },
    { emoji: "📊", label: "Reportes", desc: "KPIs y métricas", href: "/dashboard/reportes" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4">
          ✓ Cuenta creada exitosamente
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          ¡Bienvenido{nombre ? ` a ${nombre}` : ""}! 👋
        </h1>
        <p className="text-slate-500 text-base">
          Tu CRM está listo. Sigue estos pasos para empezar en minutos.
        </p>
      </div>

      {/* Pasos */}
      <div className="flex flex-col gap-4 mb-8">
        {pasos.map(paso => (
          <div key={paso.num} className={`rounded-2xl border p-5 ${paso.color}`}>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                {paso.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{paso.emoji}</span>
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
        ))}
      </div>

      {/* Módulos disponibles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Módulos disponibles en tu CRM</h2>
        <div className="grid grid-cols-3 gap-3">
          {modulos.map(m => (
            <Link key={m.href} href={m.href}
              className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 hover:border-blue-200 transition-all group">
              <span className="text-xl block mb-1">{m.emoji}</span>
              <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">{m.label}</p>
              <p className="text-xs text-slate-400">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Manual de usuario */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl shrink-0">📖</div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Manual de usuario</h2>
            <p className="text-xs text-slate-500 mb-4">
              Descarga la guía completa del CRM. Incluye todos los módulos, paso a paso con capturas y consejos de uso.
            </p>
            <div className="flex gap-3">
              <a href="/api/manual/pdf" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                <span>⬇</span> Descargar PDF
              </a>
              <a href="/api/manual/word" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                <span>⬇</span> Descargar Word
              </a>
            </div>
          </div>
        </div>
      </div>

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
