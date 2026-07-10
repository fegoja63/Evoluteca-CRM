// Escape mínimo para texto libre interpolado en emails HTML — alcanza con
// neutralizar "<" (rompe cualquier intento de inyectar una etiqueta) sin
// tocar acentos/ñ ni forzar un escape completo que complique la lectura del
// correo en clientes de email que no siempre soportan entidades HTML.
export function escapeHtml(texto: string): string {
  return texto.replace(/</g, "&lt;");
}
