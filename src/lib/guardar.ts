// Helper de guardado para el cliente: hace fetch y LANZA si la respuesta no
// fue exitosa, para que quien llama pueda revertir el cambio optimista o
// avisar al usuario. Evita el patrón "await fetch(...)" sin verificar, que
// dejaba pasar guardados fallidos como si hubieran persistido.
//
// Uso:
//   try { await guardarJson(`/api/x/${id}`, "PATCH", { campo }); }
//   catch { /* revertir + avisar */ }

export async function guardarJson(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    let mensaje = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
    try {
      const data = await res.json();
      if (data?.error) mensaje = data.error;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(mensaje);
  }
  return res.json().catch(() => ({}));
}
