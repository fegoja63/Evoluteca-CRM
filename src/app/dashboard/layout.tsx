import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { estadoActivacion } from "@/lib/activacion";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Fab } from "@/components/fab";
import { Toaster } from "@/lib/toast";

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar: solo desktop */}
      <div className="hidden sm:flex">
        <Sidebar tenantNombre={session.user.tenantNombre} />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 pb-20 sm:pb-8">
          {children}
        </div>
      </main>
      {/* Nav inferior + FAB: solo móvil */}
      <MobileNav />
      <Fab />
      <Toaster />
    </div>
  );
}
