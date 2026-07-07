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

  // La verificación de términos se hace en el layout del dashboard (consulta DB directa)
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
