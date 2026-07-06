import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname   = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isTerminos  = pathname === "/dashboard/terminos";

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Si está logueado, está en el dashboard y NO ha aceptado los términos → redirigir a términos
  // El tenant demo está exento (es para demostración, no firma contrato)
  if (isDashboard && isLoggedIn && !isTerminos) {
    const user = (req.auth as any)?.user;
    const esDemo = user?.tenantNombre?.toLowerCase().includes("demo") ||
                   user?.tenantId === process.env.DEMO_TENANT_ID;
    if (!esDemo && !user?.aceptoTerminosEn) {
      return NextResponse.redirect(new URL("/dashboard/terminos", req.url));
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
