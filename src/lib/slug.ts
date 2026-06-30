export function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function generarSlugUnico(nombre: string): string {
  const base = generarSlug(nombre);
  const sufijo = Math.random().toString(36).slice(2, 7);
  return `${base}-${sufijo}`;
}
