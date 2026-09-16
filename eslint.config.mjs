// Flat config de ESLint 9 (Next 16 quitó `next lint`).
// eslint-config-next 16 ya exporta arrays de flat config listos para spread:
//   · core-web-vitals → reglas de React/Next + accesibilidad
//   · typescript      → reglas de @typescript-eslint
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    // Artefactos generados y dependencias: no se lintan.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
      "prisma/migrations/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    // El linter nunca había corrido (Next 16 quitó `next lint`), así que hay un
    // backlog acumulado. Para que `npm run lint` quede verde YA sin refactors
    // arriesgados, se bajan a "warning" las familias de reglas nuevas o
    // cosméticas: quedan VISIBLES como deuda a limpiar por lotes, pero no
    // bloquean build ni CI. El resto de reglas sigue en "error", así el linter
    // sí atrapa problemas nuevos de aquí en adelante.
    rules: {
      // Reglas nuevas del React Compiler (Next 16): marcan patrones que eran
      // válidos en React 18 (cargar al montar, componentes en render, refs).
      // Su limpieza es un refactor por pantalla, va en PRs aparte.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      // Cosméticas / de tipado incremental:
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // Navegación con <a> a rutas internas: preferir <Link>. Backlog de UX.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default config;
