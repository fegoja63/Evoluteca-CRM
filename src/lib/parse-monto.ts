/**
 * Convierte un monto escrito por una persona a número.
 *
 * Acepta el formato colombiano, que es como los clientes escriben la plata en
 * sus Excel: punto como separador de miles ("4.800.000") y coma como decimal
 * ("1.200,50"), con o sin símbolo de moneda ("$ 4.800.000"). También acepta el
 * formato plano ("4800000").
 *
 * Antes se hacía `Number(v.replace(/[^0-9.]/g, ""))`, que tomaba el punto como
 * decimal: "4.800.000" -> "4.800.000" -> NaN -> se guardaba 0. Es decir, un
 * precio en formato colombiano se perdía en silencio al importar.
 *
 * Devuelve null si no hay un número reconocible (para que la ruta lo trate como
 * vacío/error según el campo).
 */
export function parseMonto(v: string | null | undefined): number | null {
  if (!v) return null;
  let s = v.replace(/[^0-9.,]/g, "");
  if (!s) return null;

  if (s.includes(",")) {
    // Hay coma: es el separador decimal (es-CO). Los puntos son de miles.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    // Varios puntos ("4.800.000"): todos son separadores de miles.
    s = s.replace(/\./g, "");
  } else if (/\.\d{3}$/.test(s)) {
    // Un solo punto seguido de exactamente 3 dígitos ("4.800"): son miles, no
    // decimales (un decimal de 3 cifras es rarísimo en pesos).
    s = s.replace(/\./g, "");
  }
  // Si queda un solo punto con 1-2 decimales ("4.5", "4.50"), se respeta.

  const n = Number(s);
  return isNaN(n) ? null : n;
}
