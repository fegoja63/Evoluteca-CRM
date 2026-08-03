import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { estadoActivacion } from "@/lib/activacion";
import { ActivarCuenta } from "@/components/activar-cuenta";

// Pantalla de activación de cuenta (primer ingreso): cambio de la clave temporal
// y, solo para el titular, aceptación del Acuerdo de Licencia en nombre de la
// empresa. Si no hace falta nada, se vuelve al dashboard.
export default async function ActivarCuentaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { necesitaActivar, necesitaPassword, necesitaTerminos } = await estadoActivacion(session.user.id);
  if (!necesitaActivar) redirect("/dashboard");

  return <ActivarCuenta necesitaPassword={necesitaPassword} necesitaTerminos={necesitaTerminos} />;
}
