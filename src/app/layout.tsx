import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorReporter } from "@/components/error-reporter";

// next/font descarga la fuente en el build y la sirve desde el mismo dominio:
// sin petición extra a Google al abrir la página y sin el salto de texto
// mientras carga (reserva el espacio con una fuente de respaldo ajustada).
const fuente = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="es" className={fuente.variable}>
      <body className="antialiased">
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
