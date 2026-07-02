"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Item = { descripcion: string; cantidad: number; precioUnit: string };
type Cotizacion = {
  id: string;
  numero: number;
  estado: string;
  fechaEvento: string | null;
  fechaValidez: string | null;
  sede: string | null;
  notas: string | null;
  motivoRechazo: string | null;
  empresa:  { nombre: string } | null;
  contacto: { nombre: string; email: string | null } | null;
  tenant:   { nombre: string };
  items: Item[];
};

const MOTIVOS = [
  "Precio muy alto",
  "Eligió a la competencia",
  "El evento fue cancelado",
  "Sin presupuesto",
  "Fuera de fechas",
  "Otro",
];

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}
function fmtFecha(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CotizacionPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState<"ACEPTADA" | "RECHAZADA" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [otroMotivo, setOtroMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    fetch(`/api/publica/cotizacion/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setCot(data); setCargando(false); })
      .catch(() => { setError("Cotización no encontrada o enlace inválido."); setCargando(false); });
  }, [token]);

  async function responder() {
    if (!accion) return;
    const motivoFinal = accion === "RECHAZADA" ? (motivo === "Otro" ? otroMotivo : motivo) : undefined;
    if (accion === "RECHAZADA" && !motivoFinal) return;
    setProcesando(true);
    await fetch(`/api/publica/cotizacion/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, motivoRechazo: motivoFinal }),
    });
    setProcesando(false);
    setConfirmado(true);
    setCot(prev => prev ? { ...prev, estado: accion } : prev);
  }

  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-slate-700">{error}</p>
      </div>
    </div>
  );

  if (!cot) return null;

  const total = cot.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
  const yaRespondida = cot.estado === "ACEPTADA" || cot.estado === "RECHAZADA";

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-[#1e3a8a] rounded-2xl rounded-b-none px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-sm font-medium">{cot.tenant.nombre}</p>
            <h1 className="text-white text-2xl font-bold mt-1">
              Cotización #{String(cot.numero).padStart(4, "0")}
            </h1>
          </div>
          <img src="https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" alt="Logo"
            className="h-12 w-auto rounded-lg object-contain bg-white p-1" />
        </div>

        {/* Body */}
        <div className="bg-white rounded-2xl rounded-t-none border border-slate-200 border-t-0 px-8 py-6 space-y-6">

          {/* Info cliente */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Cliente",       valor: cot.empresa?.nombre ?? "—" },
              { label: "Contacto",      valor: cot.contacto?.nombre ?? "—" },
              { label: "Sede / Lugar",  valor: cot.sede ?? "—" },
              { label: "Fecha evento",  valor: fmtFecha(cot.fechaEvento) },
              { label: "Válida hasta",  valor: fmtFecha(cot.fechaValidez) },
            ].map(({ label, valor }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-slate-800 font-medium mt-0.5">{valor}</p>
              </div>
            ))}
          </div>

          {/* Tabla items */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                  <th className="px-4 py-3 text-center font-semibold">Cant.</th>
                  <th className="px-4 py-3 text-right font-semibold">P. Unit.</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cot.items.map((i, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="px-4 py-3 text-slate-800">{i.descripcion}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{i.cantidad}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(Number(i.precioUnit))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(i.cantidad * Number(i.precioUnit))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 text-sm">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-[#1e3a8a] text-lg">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {cot.notas && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              <strong className="text-slate-700">Notas:</strong> {cot.notas}
            </div>
          )}

          {/* Estado */}
          {confirmado || yaRespondida ? (
            <div className={`rounded-xl p-5 text-center ${cot.estado === "ACEPTADA" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className="text-2xl mb-2">{cot.estado === "ACEPTADA" ? "✅" : "❌"}</p>
              <p className={`font-bold text-lg ${cot.estado === "ACEPTADA" ? "text-emerald-700" : "text-red-700"}`}>
                {cot.estado === "ACEPTADA" ? "¡Cotización aceptada!" : "Cotización rechazada"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {cot.estado === "ACEPTADA"
                  ? "Hemos recibido tu respuesta. Nos pondremos en contacto pronto."
                  : "Gracias por avisarnos. Si cambias de opinión, contáctanos."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">¿Deseas aceptar o rechazar esta cotización?</p>
              <div className="flex gap-3 mb-4">
                <button onClick={() => setAccion("ACEPTADA")}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border-2 transition-all ${accion === "ACEPTADA" ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
                  ✓ Aceptar
                </button>
                <button onClick={() => { setAccion("RECHAZADA"); setMotivo(""); }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border-2 transition-all ${accion === "RECHAZADA" ? "bg-red-600 text-white border-red-600" : "border-red-300 text-red-600 hover:bg-red-50"}`}>
                  ✗ Rechazar
                </button>
              </div>

              {accion === "RECHAZADA" && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-500 font-medium">Motivo del rechazo:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MOTIVOS.map(m => (
                      <button key={m} onClick={() => setMotivo(m)}
                        className={`rounded-lg border px-3 py-2 text-xs text-left transition-all ${motivo === m ? "bg-red-50 border-red-400 text-red-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  {motivo === "Otro" && (
                    <input value={otroMotivo} onChange={e => setOtroMotivo(e.target.value)}
                      placeholder="Describe el motivo..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 mt-1" />
                  )}
                </div>
              )}

              {accion && (
                <button onClick={responder} disabled={procesando || (accion === "RECHAZADA" && !motivo)}
                  className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 ${accion === "ACEPTADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {procesando ? "Procesando..." : accion === "ACEPTADA" ? "Confirmar aceptación" : "Confirmar rechazo"}
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            Evoluteca CRM · {cot.tenant.nombre}
          </p>
        </div>
      </div>
    </div>
  );
}
