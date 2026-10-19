// Gráficas para correos (Resumen del Lunes). Un correo no ejecuta JavaScript y
// Gmail quita los <svg>, así que las barras se arman con tablas HTML y anchos en
// porcentaje: es lo único que se ve igual en Gmail, Outlook y el celular. Tampoco
// se usan servicios externos de imágenes de gráficas: los datos del cliente no
// salen del CRM.

export type Barra = { etiqueta: string; valor: number; detalle?: string; color: string };
export type Segmento = { etiqueta: string; valor: number; color: string };

const GRIS = "#e2e8f0";

// Ancho en % de una barra respecto al máximo; lo que tiene valor nunca queda
// invisible (mínimo 3%).
export function anchoPct(valor: number, maximo: number): number {
  if (valor <= 0 || maximo <= 0) return 0;
  return Math.max(3, Math.round((valor / maximo) * 100));
}

// Una barra horizontal: tramo de color + resto gris.
function barra(pct: number, color: string, alto = 12) {
  const resto = 100 - pct;
  const celdaColor = pct > 0 ? `<td width="${pct}%" style="background:${color};height:${alto}px;line-height:${alto}px;font-size:0;border-radius:4px">&nbsp;</td>` : "";
  const celdaResto = resto > 0 ? `<td width="${resto}%" style="height:${alto}px;line-height:${alto}px;font-size:0">&nbsp;</td>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:${GRIS};border-radius:4px"><tr>${celdaColor}${celdaResto}</tr></table>`;
}

// Barras horizontales con etiqueta a la izquierda y cifra a la derecha.
export function barrasHorizontales(barras: Barra[]): string {
  const max = Math.max(0, ...barras.map(b => b.valor));
  const filas = barras.map(b => `<tr>
      <td width="30%" style="padding:4px 8px 4px 0;font-size:12px;color:#334155;white-space:nowrap">${b.etiqueta}</td>
      <td style="padding:4px 0">${barra(anchoPct(b.valor, max), b.color)}</td>
      <td width="26%" style="padding:4px 0 4px 8px;font-size:12px;color:#1e293b;font-weight:600;text-align:right;white-space:nowrap">${b.detalle ?? b.valor}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;
}

// Barra apilada (partes de un todo) con su leyenda debajo. Vacía si no hay datos.
export function barraApilada(segmentos: Segmento[]): string {
  const total = segmentos.reduce((a, s) => a + s.valor, 0);
  if (total <= 0) return "";
  const conValor = segmentos.filter(s => s.valor > 0);
  // Reparte el 100% entre los tramos; el último absorbe el redondeo.
  let usado = 0;
  const celdas = conValor.map((s, i) => {
    const pct = i === conValor.length - 1 ? 100 - usado : Math.max(1, Math.round((s.valor / total) * 100));
    usado += pct;
    return `<td width="${pct}%" style="background:${s.color};height:14px;line-height:14px;font-size:0">&nbsp;</td>`;
  }).join("");
  const leyenda = conValor.map(s =>
    `<span style="display:inline-block;margin:6px 12px 0 0;font-size:12px;color:#334155;white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.color};vertical-align:middle"></span>&nbsp;${s.etiqueta}: <strong>${s.valor}</strong></span>`,
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:4px;overflow:hidden"><tr>${celdas}</tr></table>
  <div>${leyenda}</div>`;
}

// Comparación de dos periodos por categoría (esta semana vs. la anterior):
// barra de color para la actual y gris para la anterior, con la flecha de cambio.
export function barrasComparadas(filas: { etiqueta: string; actual: number; anterior: number }[], color: string): string {
  const max = Math.max(0, ...filas.flatMap(f => [f.actual, f.anterior]));
  const html = filas.map(f => `<tr>
      <td width="30%" rowspan="2" style="padding:5px 8px 5px 0;font-size:12px;color:#334155;white-space:nowrap;vertical-align:middle">${f.etiqueta}</td>
      <td style="padding:5px 0 1px">${barra(anchoPct(f.actual, max), color, 10)}</td>
      <td width="26%" rowspan="2" style="padding:5px 0 5px 8px;font-size:12px;color:#1e293b;text-align:right;white-space:nowrap;vertical-align:middle"><strong>${f.actual}</strong> <span style="color:#94a3b8">vs ${f.anterior}</span></td>
    </tr><tr>
      <td style="padding:1px 0 5px">${barra(anchoPct(f.anterior, max), "#94a3b8", 6)}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${html}</table>`;
}

// "↑ 25% vs. la semana anterior" (o ↓ / =). Sin base anterior no hay porcentaje.
export function variacion(actual: number, anterior: number): { texto: string; color: string } {
  if (anterior === 0) {
    return actual > 0
      ? { texto: "↑ nueva actividad (la semana anterior no hubo)", color: "#059669" }
      : { texto: "= igual que la semana anterior", color: "#64748b" };
  }
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct > 0) return { texto: `↑ ${pct}% vs. la semana anterior`, color: "#059669" };
  if (pct < 0) return { texto: `↓ ${Math.abs(pct)}% vs. la semana anterior`, color: "#dc2626" };
  return { texto: "= igual que la semana anterior", color: "#64748b" };
}

// Título pequeño de una gráfica.
export function tituloGrafica(texto: string): string {
  return `<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#334155">${texto}</p>`;
}
