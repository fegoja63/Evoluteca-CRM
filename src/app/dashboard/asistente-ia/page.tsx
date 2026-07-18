"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconSparkles, IconBuilding, IconChartFunnel, IconTrendingUp,
  IconMail, IconMessageChatbot, IconReportAnalytics, type Icon,
} from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

// Pestaña "Asistente IA": un solo lugar que reúne todas las funciones de IA del
// CRM (vitrina + lanzador) y muestra el cupo mensual compartido. Las funciones
// ligadas a un registro (Resumen de cliente) siguen apareciendo también en su
// pantalla; aquí se enlazan. Las globales nacen desde aquí.
type Funcion = {
  titulo: string;
  desc: string;
  icon: Icon;
  href?: string;      // definido = disponible; ausente = próximamente
  cta?: string;
  contexto?: string;  // dónde más vive la función
};

const DISPONIBLES: Funcion[] = [
  {
    titulo: "Resumen de cliente",
    desc: "Informe accionable de 6 secciones sobre una cuenta: panorama, señales, contactos clave y próximas acciones.",
    icon: IconBuilding,
    href: "/dashboard/cuentas",
    cta: "Elegir cliente",
    contexto: "También en cada ficha de cliente",
  },
  {
    titulo: "Brief del pipeline",
    desc: "Resumen ejecutivo de tus oportunidades abiertas: calientes, en riesgo, avance de la meta y prioridades de la semana.",
    icon: IconChartFunnel,
    href: "/dashboard/pipeline",
    cta: "Abrir en Pipeline",
    contexto: "También en Pipeline",
  },
  {
    titulo: "Análisis de tendencias",
    desc: "Lee tus reportes de los últimos meses y explica qué cambió, por qué, la proyección y qué hacer.",
    icon: IconTrendingUp,
    href: "/dashboard/reportes",
    cta: "Abrir en Reportes",
    contexto: "También en Reportes",
  },
  {
    titulo: "Pregúntale a tus datos",
    desc: "Escribe una pregunta en lenguaje natural y obtén el dato con su gráfica al instante.",
    icon: IconMessageChatbot,
    href: "/dashboard/preguntar",
    cta: "Preguntar",
  },
  {
    titulo: "Redactor de correos",
    desc: "Redacta el correo de envío, el seguimiento y el cierre de una cotización, con tu tono.",
    icon: IconMail,
    href: "/dashboard/cotizaciones-formales",
    cta: "Elegir cotización",
    contexto: "También en cada cotización",
  },
  {
    titulo: "Informe ejecutivo mensual",
    desc: "El cierre del mes anterior con sus tendencias, generado solo, listo para la junta.",
    icon: IconReportAnalytics,
    href: "/dashboard/informe-mensual",
    cta: "Generar informe",
  },
];

const PROXIMAMENTE: Funcion[] = [];

export default function AsistenteIAPage() {
  const [uso, setUso] = useState<Uso | null>(null);

  useEffect(() => {
    fetch("/api/ia/uso", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(setUso)
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-7">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
              <IconSparkles size={26} stroke={1.75} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Asistente IA</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Todo lo que la inteligencia artificial puede hacer por tu equipo, en un solo lugar.
            </p>
          </div>
        </div>

        <UsoMeter uso={uso} />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Disponibles ahora</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {DISPONIBLES.map(f => <Tarjeta key={f.titulo} f={f} />)}
      </div>

      {PROXIMAMENTE.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Próximamente</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROXIMAMENTE.map(f => <Tarjeta key={f.titulo} f={f} />)}
          </div>
        </>
      )}
    </div>
  );
}

function UsoMeter({ uso }: { uso: Uso | null }) {
  if (!uso) {
    return <div className="h-[74px] w-full sm:w-56 rounded-2xl border border-brand-200 bg-brand-50/40 animate-pulse" />;
  }
  if (!uso.iaConfigurada) {
    return (
      <div className="w-full sm:w-56 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-800">IA no configurada</p>
        <p className="text-xs text-amber-700 mt-1">Falta la clave del servidor.</p>
      </div>
    );
  }
  const { limite, usados } = uso;
  const ilimitado = limite == null;
  const desactivado = limite === 0;
  const pct = ilimitado || desactivado ? 0 : Math.min(100, Math.round((usados / (limite as number)) * 100));
  const tope = !ilimitado && !desactivado && usados >= (limite as number);

  return (
    <div className="w-full sm:w-56 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Acciones de IA · este mes</p>
      {desactivado ? (
        <p className="text-sm font-semibold text-slate-500 mt-1">No incluido en tu plan</p>
      ) : (
        <>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {usados}
            {!ilimitado && <span className="text-sm font-semibold text-slate-400"> / {limite}</span>}
          </p>
          {!ilimitado && (
            <div className="mt-2 h-1.5 rounded-full bg-brand-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${tope ? "bg-accent-500" : "bg-gradient-to-r from-brand-600 to-brand-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tarjeta({ f }: { f: Funcion }) {
  const Icono = f.icon;
  const disponible = !!f.href;

  const cuerpo = (
    <div
      className={`h-full rounded-2xl border p-5 flex flex-col gap-2.5 transition-shadow ${
        disponible
          ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          disponible
            ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30"
            : "bg-brand-100 text-brand-600"
        }`}
      >
        <Icono size={20} stroke={1.75} />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{f.titulo}</h3>
      <p className="text-xs text-slate-500 leading-relaxed flex-1">{f.desc}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-slate-400">{f.contexto ?? ""}</span>
        {disponible ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            <IconSparkles size={13} stroke={2} /> {f.cta}
          </span>
        ) : (
          <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-700">
            Próximamente
          </span>
        )}
      </div>
    </div>
  );

  return disponible ? (
    <Link href={f.href as string} className="block">{cuerpo}</Link>
  ) : (
    cuerpo
  );
}
