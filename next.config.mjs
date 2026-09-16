const isDev = process.env.NODE_ENV !== "production";

// CSP pragmática: Next.js App Router inyecta datos de hidratación como script
// inline (sin nonce configurado), así que 'unsafe-inline' en script-src es
// necesario para no romper la app. 'unsafe-eval' solo se permite en
// desarrollo (lo requiere el HMR de Next, no el build de producción).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer y sus dependencias nativas (fontkit, yoga) no se
  // empaquetan bien con Turbopack (el bundler por defecto de `next dev` en
  // Next 16): las rutas /api/manual/pdf* daban 404 en desarrollo aunque en
  // producción funcionaban. Marcarlo como paquete externo del servidor hace
  // que se cargue vía require de Node en vez de empaquetarse, y las rutas de
  // PDF sirven igual en dev y en prod.
  serverExternalPackages: ["@react-pdf/renderer"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
