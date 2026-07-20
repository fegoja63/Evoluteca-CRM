import { defineConfig } from "vitest/config";
import path from "path";

const src = path.resolve(__dirname, "src");

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Carga .env.test y aborta si apunta a una base que no sea la de pruebas.
    setupFiles: [path.resolve(src, "test/setup.ts")],
    // Los archivos de prueba comparten una sola base y cada uno la resiembra,
    // asi que corren de a uno. Sin esto, dos archivos en paralelo se borrarian
    // los datos entre si y los fallos serian intermitentes e imposibles de leer.
    fileParallelism: false,
    // Las rutas hablan con Neon por red; el timeout por defecto (5s) se queda
    // corto cuando el compute estaba suspendido y tiene que despertar.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    // El orden importa: los alias especificos van ANTES del generico "@/".
    alias: [
      // Toda ruta que importe el cliente de Prisma recibe el vigilado, que
      // revienta si una consulta se olvida del tenantId. No hace falta un
      // vi.mock() en cada archivo de prueba ni tocar el codigo de produccion.
      { find: /^@\/lib\/prisma$/, replacement: path.resolve(src, "test/prisma-vigilado.ts") },
      // Y el auth real se cambia por la sesion simulada.
      { find: /^@\/lib\/auth$/, replacement: path.resolve(src, "test/auth-falso.ts") },
      { find: /^@\//, replacement: src + "/" },
    ],
  },
});
