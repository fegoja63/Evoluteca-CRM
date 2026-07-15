import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorReporter } from "@/components/error-reporter";

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
    <html lang="es">
      <body className="antialiased">
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
