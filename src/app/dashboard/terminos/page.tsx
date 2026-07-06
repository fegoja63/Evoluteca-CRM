"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VERSION = "1.0";

export default function TerminosPage() {
  const router = useRouter();
  const [acepto, setAcepto]       = useState(false);
  const [enviando, setEnviando]   = useState(false);

  async function handleAceptar() {
    if (!acepto) return;
    setEnviando(true);
    await fetch("/api/terminos", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl">

        {/* Cabecera */}
        <div className="bg-blue-950 rounded-2xl px-8 py-6 mb-6 text-center">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Evoluteca CRM</p>
          <h1 className="text-white text-2xl font-bold">Acuerdo de Licencia de Uso</h1>
          <p className="text-blue-300 text-sm mt-1">Versión {VERSION} — Debes aceptar para continuar</p>
        </div>

        {/* Contrato */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="h-[560px] overflow-y-auto px-8 py-6 text-sm text-slate-700 leading-relaxed space-y-4">

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 font-medium">
              ⚠️ LEA ESTE ACUERDO DETENIDAMENTE. AL ACEPTARLO, QUEDA VINCULADO LEGALMENTE A ESTOS TÉRMINOS.
            </div>

            <Section title="1. Identificación de las Partes">
              <p>El presente Acuerdo de Licencia de Uso se celebra entre:</p>
              <InfoBox label="Proveedor">Felipe Gómez Jaramillo, empresario individual, operando bajo la marca comercial <strong>Evoluteca</strong>, con domicilio en Bogotá D.C., Colombia. Correo: felipe.gomez@evoluteca.com</InfoBox>
              <InfoBox label="Cliente">La persona natural o jurídica que acepta este Acuerdo al activar, registrar o utilizar el servicio Evoluteca CRM.</InfoBox>
            </Section>

            <Section title="2. Objeto del Acuerdo">
              <p>El Proveedor otorga al Cliente una licencia de uso <strong>no exclusiva, intransferible y revocable</strong> para acceder y utilizar la plataforma Evoluteca CRM a través de Internet, en modalidad Software como Servicio (SaaS), conforme a los términos del presente Acuerdo y al plan de suscripción contratado.</p>
            </Section>

            <Section title="3. Alcance de la Licencia">
              <p className="font-semibold text-slate-800">3.1 Derechos otorgados</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Acceder al Servicio mediante credenciales personales de usuario.</li>
                <li>Registrar, almacenar y gestionar datos propios de su operación comercial.</li>
                <li>Exportar los datos ingresados en formatos disponibles (Excel, PDF).</li>
                <li>Crear múltiples usuarios dentro del número permitido por su plan.</li>
                <li>Utilizar el Servicio para sus propósitos comerciales internos.</li>
              </ul>
              <p className="font-semibold text-slate-800 mt-3">3.2 Restricciones</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Prohibido sublicenciar, vender o transferir el acceso a terceros sin autorización escrita.</li>
                <li>Prohibido realizar ingeniería inversa, descompilar o copiar el código fuente.</li>
                <li>Prohibido usar el Servicio para desarrollar un producto competidor.</li>
                <li>Prohibido introducir virus, malware o código malicioso en la plataforma.</li>
                <li>Prohibido intentar acceder sin autorización a sistemas o datos del Proveedor.</li>
              </ul>
            </Section>

            <Section title="4. Datos del Cliente y Privacidad">
              <p><strong>Propiedad:</strong> Los datos ingresados por el Cliente son y seguirán siendo propiedad exclusiva del Cliente.</p>
              <p><strong>Uso:</strong> El Proveedor accederá a los datos únicamente para prestar el Servicio, brindar soporte técnico o cumplir obligaciones legales. No venderá ni compartirá datos con terceros con fines comerciales.</p>
              <p><strong>Portabilidad:</strong> Al terminar el Acuerdo, el Cliente podrá exportar sus datos. Transcurridos 30 días desde la cancelación, el Proveedor podrá eliminarlos definitivamente.</p>
              <p><strong>Ley 1581/2012:</strong> El Proveedor actúa como Encargado del Tratamiento de datos personales. El Cliente es el Responsable y debe contar con las autorizaciones de los titulares.</p>
            </Section>

            <Section title="5. Obligaciones de las Partes">
              <p className="font-semibold text-slate-800">5.1 Del Proveedor</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Disponibilidad objetivo del 99% mensual, salvo mantenimientos y fuerza mayor.</li>
                <li>Notificar mantenimientos programados con 48 horas de anticipación.</li>
                <li>Implementar actualizaciones de seguridad oportunamente.</li>
                <li>Realizar copias de respaldo (backups) periódicas.</li>
              </ul>
              <p className="font-semibold text-slate-800 mt-3">5.2 Del Cliente</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pagar oportunamente la suscripción contratada.</li>
                <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>No compartir credenciales entre usuarios no registrados.</li>
                <li>Usar el Servicio conforme a la legislación colombiana aplicable.</li>
              </ul>
            </Section>

            <Section title="6. Condiciones Económicas y Pago">
              <ul className="list-disc pl-5 space-y-1">
                <li>El acceso está sujeto al pago de una suscripción periódica (mensual o anual).</li>
                <li>El Proveedor puede modificar precios con aviso previo de 30 días.</li>
                <li>La mora de más de 15 días hábiles faculta al Proveedor a suspender el acceso.</li>
                <li>Los pagos realizados no son reembolsables, salvo acuerdo escrito entre las Partes.</li>
                <li>Precios en COP incluyendo IVA, salvo indicación contraria.</li>
              </ul>
            </Section>

            <Section title="7. Vigencia y Terminación">
              <p>El Acuerdo entra en vigor al aceptar estos términos y permanece vigente mientras exista suscripción activa. El Cliente puede cancelar en cualquier momento; la cancelación aplica al final del período facturado.</p>
              <p>El Proveedor puede terminar el Acuerdo con efecto inmediato ante: incumplimiento grave, uso ilegal del Servicio, o mora superior a 30 días.</p>
            </Section>

            <Section title="8. Propiedad Intelectual">
              <p>El Servicio, código fuente, diseño, interfaces y marca comercial "Evoluteca" son propiedad del Proveedor y están protegidos por las normas de propiedad intelectual colombianas e internacionales. Este Acuerdo no transfiere ningún derecho de propiedad intelectual al Cliente.</p>
            </Section>

            <Section title="9. Confidencialidad">
              <p>Ambas Partes mantendrán en estricta confidencialidad la información no pública recibida de la otra Parte. Esta obligación subsiste dos (2) años tras la terminación del Acuerdo.</p>
            </Section>

            <Section title="10. Garantías y Exclusiones">
              <p>El Servicio se presta <strong>"tal como está"</strong> (as-is). El Proveedor no garantiza disponibilidad ininterrumpida, ausencia total de errores, ni resultados comerciales específicos derivados del uso del Servicio.</p>
            </Section>

            <Section title="11. Limitación de Responsabilidad">
              <p>El Proveedor no será responsable por daños indirectos, incidentales, pérdida de ingresos o datos. La responsabilidad total del Proveedor no excederá el valor pagado por el Cliente en los tres (3) meses anteriores al evento que origina la reclamación.</p>
            </Section>

            <Section title="12. Fuerza Mayor">
              <p>Ninguna Parte será responsable por incumplimientos causados por eventos fuera de su control razonable (desastres naturales, fallas masivas de Internet, pandemias, actos de autoridad). La Parte afectada debe notificar dentro de 5 días hábiles.</p>
            </Section>

            <Section title="13. Modificaciones al Acuerdo">
              <p>El Proveedor puede modificar estos términos con aviso de 15 días. El uso continuado del Servicio después de la fecha de vigencia implica aceptación. Si el Cliente no está de acuerdo, puede cancelar sin penalidad antes de dicha fecha.</p>
            </Section>

            <Section title="14. Ley Aplicable y Resolución de Disputas">
              <p>Este Acuerdo se rige por las leyes de la República de Colombia. Las controversias se intentarán resolver amigablemente en 30 días hábiles. De no lograrse, se someterán a los jueces y tribunales competentes de Bogotá D.C.</p>
            </Section>

          </div>

          {/* Indicador de scroll */}
          <div className="border-t border-slate-100 px-8 py-2 bg-slate-50 flex items-center gap-2">
            <span className="text-xs text-slate-400">↕ Desplázate para leer el contrato completo</span>
          </div>
        </div>

        {/* Aceptación */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acepto}
              onChange={e => setAcepto(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              He leído y entendido el <strong>Acuerdo de Licencia de Uso versión {VERSION}</strong> en su totalidad, tengo capacidad legal para aceptarlo, y acepto quedar vinculado por todos sus términos y condiciones.
            </span>
          </label>
        </div>

        <button
          onClick={handleAceptar}
          disabled={!acepto || enviando}
          className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {enviando ? "Registrando aceptación..." : "Acepto los términos y condiciones — Ingresar al CRM"}
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">
          Tu aceptación queda registrada con fecha, hora y versión del contrato.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 text-base mb-2 border-b border-slate-100 pb-1">{title}</h2>
      <div className="space-y-2 text-slate-600">{children}</div>
    </div>
  );
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mt-2">
      <p className="text-xs font-semibold text-blue-700 mb-0.5">{label}</p>
      <p className="text-slate-700 text-xs">{children}</p>
    </div>
  );
}
