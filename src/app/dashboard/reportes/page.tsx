"use client";

import { useEffect, useState } from "react";

type Reporte = {
  totalEmpresas: number;
  totalContactos: number;
  totalOportunidades: number;
  valorPipeline: number;
  oportunidadesPorEtapa: Record<string, number>;
  totalCotizaciones: number;
  valorCotizado: number;
  cotizacionesPorEstado: Record<string, number>;
  actividadesPendientes: number;
};

const ETAPAS_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto",
  CALIFICADO: "Calificado",
  PROPUESTA: "Propuesta",
  NEGOCIACION: "Negociación",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
};

const ESTADOS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className="mt-1 text-2xl font-medium text-neutral-900">{valor}</p>
    </div>
  );
}

export default function ReportesPage() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/reportes")
      .then((res) => res.json())
      .then((data) => {
        setReporte(data);
        setCargando(false);
      });
  }, []);

  function formatoMoneda(valor: number) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(valor);
  }

  if (cargando || !reporte) {
    return <p className="text-sm text-neutral-400">Cargando...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Reportes</h1>
        <p className="text-sm text-neutral-500">Resumen del estado comercial</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <Card titulo="Cuentas" valor={reporte.totalEmpresas} />
        <Card titulo="Contactos" valor={reporte.totalContactos} />
        <Card titulo="Valor en pipeline" valor={formatoMoneda(reporte.valorPipeline)} />
        <Card titulo="Tareas pendientes" valor={reporte.actividadesPendientes} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Oportunidades por etapa ({reporte.totalOportunidades} total)
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(ETAPAS_LABEL).map(([key, label]) => {
              const cantidad = reporte.oportunidadesPorEtapa[key] ?? 0;
              const pct = reporte.totalOportunidades
                ? (cantidad / reporte.totalOportunidades) * 100
                : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>{label}</span>
                    <span>{cantidad}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Cotizaciones por estado ({reporte.totalCotizaciones} total · {formatoMoneda(reporte.valorCotizado)})
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(ESTADOS_LABEL).map(([key, label]) => {
              const cantidad = reporte.cotizacionesPorEstado[key] ?? 0;
              const pct = reporte.totalCotizaciones
                ? (cantidad / reporte.totalCotizaciones) * 100
                : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>{label}</span>
                    <span>{cantidad}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                    <div
                      className="h-1.5 rounded-full bg-green-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
