import type { Metadata, Viewport } from "next";
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
  // App instalada en iPhone: nombre bajo el ícono y barra de estado del sistema.
  appleWebApp: { capable: true, title: "Evoluteca", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b1c26",
  width: "device-width",
  initialScale: 1,
  // En iPhone, tocar un campo con letra de menos de 16 px hace que Safari
  // amplíe la página y la deje así (se veía cortada por la derecha).
  // maximumScale evita ese zoom automático; iOS sigue permitiendo pellizcar
  // para ampliar, así que no se pierde accesibilidad.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: SCRIPT_TEMA agrega la clase `dark` antes de hidratar.
    // translate="no" + meta notranslate: el traductor del navegador cambiaba "Pipeline" por "Tubería".
    <html lang="es" translate="no" className={fuente.variable} suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
