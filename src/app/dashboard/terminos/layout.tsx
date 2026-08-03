import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { estadoActivacion } from "@/lib/activacion";

export default async function ActivarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Si la cuenta ya está activada (clave cambiada y, si es titular, términos
  // aceptados), no hay nada que hacer aquí: al dashboard.
  const { necesitaActivar } = await estadoActivacion(session.user.id);
  if (!necesitaActivar) redirect("/dashboard");

  return <>{children}</>;
}
