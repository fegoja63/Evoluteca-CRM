import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TerminosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { aceptoTerminosEn: true },
  });
  if (usuario?.aceptoTerminosEn) redirect("/dashboard");

  return <>{children}</>;
}
