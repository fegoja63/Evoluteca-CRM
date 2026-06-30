import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex">
      <Sidebar tenantNombre={session.user.tenantNombre} />
      <main className="flex-1 bg-white p-6">{children}</main>
    </div>
  );
}
