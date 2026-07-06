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
  if (isDashboard && isLoggedIn && !isTerminos) {
    const aceptoTerminos = (req.auth as any)?.user?.aceptoTerminosEn;
    if (!aceptoTerminos) {
      return NextResponse.redirect(new URL("/dashboard/terminos", req.url));
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
