/**
 * Mini gráfica de tendencia (sin ejes): una línea con área suave y un punto en
 * el último valor. Toma el color del texto (`currentColor`), así que se pinta
 * con una clase `text-*` del contenedor.
 */
export function Sparkline({
  valores, ancho = 96, alto = 28, className, etiqueta,
}: { valores: number[]; ancho?: number; alto?: number; className?: string; etiqueta?: string }) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const pad = 3; // deja aire para el punto final y el grosor de la línea
  const x = (i: number) => pad + (i * (ancho - pad * 2)) / (valores.length - 1);
  const y = (v: number) => alto - pad - ((v - min) / rango) * (alto - pad * 2);
  const puntos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const area = `M${x(0).toFixed(1)},${alto} L${puntos.join(" L")} L${x(valores.length - 1).toFixed(1)},${alto} Z`;
  const ultimo = valores.length - 1;

  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className={className}
      role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}>
      <path d={area} fill="currentColor" opacity={0.15} />
      <polyline points={puntos.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.75}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo])} r={2.5} fill="currentColor" />
    </svg>
  );
}
