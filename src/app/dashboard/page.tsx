import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">
            Hola, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-neutral-500">
            {session?.user?.tenantNombre} · Rol: {session?.user?.rol}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
        <p className="text-sm text-neutral-500">
          Sprint 1 completo: autenticación y multi-tenant funcionando.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Los KPIs, el pipeline y la IA comercial llegan en los siguientes
          sprints.
        </p>
      </div>
    </div>
  );
}
