import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  // Verificar aceptación de términos directamente en DB (el JWT puede estar desactualizado)
  const esDemo = session.user.tenantNombre?.toLowerCase().includes("demo");
  if (!esDemo) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { aceptoTerminosEn: true },
    });
    if (!usuario?.aceptoTerminosEn) {
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
