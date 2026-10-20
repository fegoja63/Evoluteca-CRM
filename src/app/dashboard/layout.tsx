import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PaletaComandos } from "@/components/paleta-comandos";
import { auth } from "@/lib/auth";
import { estadoActivacion } from "@/lib/activacion";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Fab } from "@/components/fab";
import { Toaster } from "@/lib/toast";
import { prisma } from "@/lib/prisma";
import { estadoLicencia } from "@/lib/licencias";
import { INICIO_FINANZAS, rutaPermitidaSoloFinanzas } from "@/lib/cuenta-finanzas";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Gate de activación de cuenta (cambio de clave temporal y, para el titular,
  // aceptación del contrato). Se consulta la DB directa (el JWT puede estar
  // desactualizado). Se excluye la propia pantalla de activación para no
  // redirigirla a sí misma en bucle; el pathname llega por cabecera del middleware.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const esDemo = session.user.tenantNombre?.toLowerCase().includes("demo");
  if (!esDemo && pathname !== "/dashboard/terminos") {
    const { necesitaActivar } = await estadoActivacion(session.user.id);
    if (necesitaActivar) {
      redirect("/dashboard/terminos");
    }
  }

  // Cuenta solo Finanzas (compró el Gerente Financiero sin el CRM): las
  // pantallas del CRM la llevan al módulo. Si tiene licencia del Gerente
  // Financiero (vigente o vencida), en una cuenta con CRM aparece en el menú.
  const [tenant, licenciaFinanzas] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { soloFinanzas: true } }),
    estadoLicencia(session.user.tenantId, "FINANZAS"),
  ]);
  const soloFinanzas = tenant?.soloFinanzas ?? false;
  if (soloFinanzas && pathname && !rutaPermitidaSoloFinanzas(pathname)) {
    redirect(INICIO_FINANZAS);
  }
  const conFinanzas = soloFinanzas || licenciaFinanzas.estado !== "SIN_LICENCIA";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar: solo desktop */}
      <div className="hidden sm:flex">
        <Sidebar tenantNombre={session.user.tenantNombre} soloFinanzas={soloFinanzas} conFinanzas={conFinanzas} />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 pb-20 sm:pb-8">
          {children}
        </div>
      </main>
      {/* Nav inferior + FAB: solo móvil */}
      <MobileNav soloFinanzas={soloFinanzas} />
      {/* El botón flotante y la paleta crean registros del CRM. */}
      {!soloFinanzas && <Fab />}
      <Toaster />
      {!soloFinanzas && <PaletaComandos />}
    </div>
  );
}
