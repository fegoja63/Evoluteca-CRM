import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname   = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // La verificación de términos se hace en el layout del dashboard (consulta la
  // DB, que es la fuente de verdad aunque el JWT esté desactualizado). Como los
  // layouts del servidor no reciben el pathname, se lo pasamos por cabecera:
  // así el gate NO se redirige a la propia página de términos y no entra en
  // bucle infinito de redirecciones.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
