import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorReporter } from "@/components/error-reporter";
import { SCRIPT_TEMA } from "@/components/selector-tema";

// Plus Jakarta Sans (variable, 200–800) desde el paquete npm
// @fontsource-variable/plus-jakarta-sans, no desde Google Fonts: así el build
// no depende de descargar la fuente de Google (falló dos veces el 2026-10-10 y
// tumbó builds de Vercel). next/font la sirve desde el mismo dominio, sin
// petición extra al abrir la página y con fuente de respaldo ajustada para que
// el texto no salte mientras carga. El archivo "latin" cubre todo el español.
const fuente = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Evoluteca CRM",
  description: "Organiza tus ventas en un día.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: SCRIPT_TEMA agrega la clase `dark` antes de hidratar.
    <html lang="es" className={fuente.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
