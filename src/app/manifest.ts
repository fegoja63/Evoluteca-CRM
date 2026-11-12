import type { MetadataRoute } from "next";

// Hace el CRM instalable como app (Android, iPhone, computador): ícono propio,
// ventana sin barra del navegador y arranque directo en el CRM.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evoluteca CRM",
    short_name: "Evoluteca",
    description: "Tu pipeline, tus clientes y tus tareas, en el bolsillo.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b1c26",
    lang: "es-CO",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Bandeja Hoy", url: "/dashboard/hoy", icons: [{ src: "/iconos/icono-96.png", sizes: "96x96" }] },
      { name: "Pipeline", url: "/dashboard/pipeline", icons: [{ src: "/iconos/icono-96.png", sizes: "96x96" }] },
      { name: "Agenda", url: "/dashboard/agenda", icons: [{ src: "/iconos/icono-96.png", sizes: "96x96" }] },
    ],
  };
}
