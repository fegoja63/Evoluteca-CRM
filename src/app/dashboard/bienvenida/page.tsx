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
      emoji: "ðŸ“¥",
      titulo: "Importa tus datos desde Excel",
      desc: "Si tienes una base de datos en Excel, impÃ³rtala en un clic. El CRM crearÃ¡ automÃ¡ticamente clientes, contactos y oportunidades vinculados.",
      accion: "Ir a importaciÃ³n",
      href: "/dashboard/datos/importar-completo",
      color: "border-blue-200 bg-blue-50",
      btnColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      num: 2,
      emoji: "ðŸ¢",
      titulo: "Agrega tu primer cliente manualmente",
      desc: "Â¿Prefieres empezar desde cero? Crea un cliente, agrÃ©gale contactos y registra tus oportunidades de venta.",
      accion: "Nuevo cliente",
      href: "/dashboard/cuentas",
      color: "border-violet-200 bg-violet-50",
      btnColor: "bg-violet-600 hover:bg-violet-700",
    },
    {
      num: 3,
      emoji: "â—ˆ",
      titulo: "Gestiona tu pipeline de ventas",
      desc: "Mueve oportunidades entre etapas con drag & drop, registra actividades y lleva el control de cada negocio.",
      accion: "Ver pipeline",
      href: "/dashboard/pipeline",
      color: "border-emerald-200 bg-emerald-50",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
    },
  ];

  const modulos = [
    { emoji: "ðŸ¢", label: "Clientes", desc: "Empresas y cuentas", href: "/dashboard/cuentas" },
    { emoji: "ðŸ‘¤", label: "Contactos", desc: "Personas de tus clientes", href: "/dashboard/contactos" },
    { emoji: "â—ˆ", label: "Pipeline", desc: "Oportunidades de venta", href: "/dashboard/pipeline" },
    { emoji: "ðŸ“„", label: "Cotizaciones", desc: "Negocios activos", href: "/dashboard/cotizaciones" },
    { emoji: "ðŸ“…", label: "Agenda", desc: "Actividades y tareas", href: "/dashboard/agenda" },
    { emoji: "ðŸ“Š", label: "Reportes", desc: "KPIs y mÃ©tricas", href: "/dashboard/reportes" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4">
          âœ“ Cuenta creada exitosamente
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Â¡Bienvenido{nombre ? ` a ${nombre}` : ""}! ðŸ‘‹
        </h1>
        <p className="text-slate-500 text-base">
          Tu CRM estÃ¡ listo. Sigue estos pasos para empezar en minutos.
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
                  {paso.accion} â†’
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MÃ³dulos disponibles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">MÃ³dulos disponibles en tu CRM</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="text-3xl shrink-0">ðŸ“–</div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Manual de usuario</h2>
            <p className="text-xs text-slate-500 mb-4">
              Descarga la guÃ­a completa del CRM. Incluye todos los mÃ³dulos, paso a paso con capturas y consejos de uso.
            </p>
            <div className="flex gap-3">
              <a href="/api/manual/pdf" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                <span>â¬‡</span> Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Puedes volver a esta guÃ­a desde el menÃº en cualquier momento.
        </p>
        <Link href="/dashboard"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Ir al Dashboard â†’
        </Link>
      </div>
    </div>
  );
}
