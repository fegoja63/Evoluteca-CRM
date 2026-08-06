// Detección de duplicados — utilidades compartidas por la importación (que
// deduplica al vuelo) y por la pantalla de limpieza (que agrupa y fusiona lo ya
// acumulado). La lógica de "qué cuenta como el mismo registro" vive aquí, en un
// solo lugar, para que importar y fusionar coincidan siempre.

/**
 * Normaliza un correo para comparar: minúsculas y sin espacios alrededor.
 * Devuelve "" cuando no hay correo utilizable, para que el llamador pueda
 * ignorarlo (dos registros "sin correo" NO son el mismo por no tener correo).
 */
export function normalizarEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Normaliza un nombre para comparar: minúsculas, sin acentos y con los espacios
 * internos colapsados. Así "José  Pérez" y "jose perez" caen en el mismo grupo.
 * Devuelve "" cuando el nombre es demasiado corto para ser una señal confiable
 * (evita agrupar por iniciales sueltas).
 */
export function normalizarNombre(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita los acentos combinados
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return limpio.length >= 3 ? limpio : "";
}

/**
 * Agrupa una lista en racimos de posibles duplicados usando union-find.
 *
 * `clavesDe` extrae, de cada elemento, una o más claves normalizadas por las que
 * podría coincidir con otro (ej. su correo y su nombre). Dos elementos quedan en
 * el mismo racimo si comparten AL MENOS UNA clave no vacía — así un contacto que
 * comparte correo con uno y nombre con otro los une a todos en un solo racimo.
 *
 * Devuelve solo los racimos con 2 o más elementos (los únicos que hay que
 * revisar), preservando el orden en que aparecieron los elementos.
 */
export function agruparDuplicados<T>(items: T[], clavesDe: (item: T) => string[]): T[][] {
  const padre = items.map((_, i) => i);

  function raiz(i: number): number {
    while (padre[i] !== i) {
      padre[i] = padre[padre[i]]; // compresión de camino
      i = padre[i];
    }
    return i;
  }
  function unir(a: number, b: number) {
    const ra = raiz(a), rb = raiz(b);
    if (ra !== rb) padre[ra] = rb;
  }

  // Primer índice visto para cada clave: al reaparecer, une ambos.
  const primeraAparicion = new Map<string, number>();
  items.forEach((item, i) => {
    for (const clave of clavesDe(item)) {
      if (!clave) continue;
      const previo = primeraAparicion.get(clave);
      if (previo === undefined) primeraAparicion.set(clave, i);
      else unir(previo, i);
    }
  });

  // Reagrupa por raíz, conservando el orden de aparición.
  const racimos = new Map<number, T[]>();
  items.forEach((item, i) => {
    const r = raiz(i);
    const grupo = racimos.get(r);
    if (grupo) grupo.push(item);
    else racimos.set(r, [item]);
  });

  return Array.from(racimos.values()).filter((g) => g.length >= 2);
}
