// Coloca un "cuerpo de cotización" de EJEMPLO en los tenants de prueba/demo,
// para que un prospecto vea cómo queda una cotización con sus condiciones
// (información de la empresa, alcance, condiciones comerciales y legales,
// términos y plazos). Cada tenant puede cambiarlo luego desde
// Configuración → "Cuerpo y condiciones de la cotización".
//
// Idempotente: solo escribe en tenants cuyo cuerpo está vacío (null/[]), para
// no pisar personalizaciones ya hechas. Correr con:
//   node scripts/seed-cuerpo-cotizacion.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Bloques reutilizables entre verticales ---
const COMERCIALES = {
  titulo: "Condiciones comerciales",
  contenido: [
    "Vigencia de la cotización: 30 días calendario a partir de la fecha de emisión.",
    "Moneda: los precios están expresados en pesos colombianos e incluyen impuestos.",
    "Forma de pago: 50% de anticipo y 50% contra entrega.",
    "Modificaciones: cualquier cambio en el alcance será cotizado por separado.",
    "Aceptación: se formaliza mediante orden de compra o la aceptación de esta cotización.",
  ].join("\n"),
};
const LEGALES = {
  titulo: "Condiciones legales",
  contenido: [
    "Esta cotización y su contenido son confidenciales y de uso exclusivo del destinatario.",
    "Los precios pueden ajustarse ante cambios en impuestos o en la normativa aplicable.",
    "Cualquier controversia se resolverá conforme a la legislación colombiana.",
  ].join("\n"),
};
const TERMINOS = {
  titulo: "Términos y plazos de entrega",
  contenido: [
    "El tiempo de ejecución inicia una vez recibido el anticipo y la información requerida.",
    "Los plazos son estimados y pueden ajustarse por causas de fuerza mayor.",
  ].join("\n"),
};

function generico(nombre) {
  return [
    { titulo: "Sobre nosotros", contenido: `${nombre} acompaña a sus clientes con soluciones a la medida, un equipo experto y un servicio cercano. Nuestro compromiso es la calidad y el cumplimiento en cada proyecto.` },
    { titulo: "Solución propuesta", contenido: "Con base en las necesidades planteadas, proponemos la solución detallada en esta cotización, orientada a resolver el requerimiento del cliente de forma eficiente." },
    { titulo: "Alcance", contenido: "El alcance corresponde únicamente a los ítems descritos en esta cotización. Cualquier servicio o entregable no listado se considera fuera de alcance." },
    COMERCIALES, LEGALES, TERMINOS,
  ];
}

const teatro = [
  { titulo: "Sobre nosotros", contenido: "Somos un espacio escénico y cultural con amplia trayectoria en el montaje de funciones, eventos y espectáculos. Contamos con salas equipadas y personal técnico propio." },
  { titulo: "Alcance del servicio", contenido: "Incluye el alquiler del espacio en la fecha acordada, montaje básico de sonido e iluminación y acompañamiento de personal técnico.\nNo incluye catering, transporte ni servicios adicionales, salvo que se indiquen expresamente." },
  {
    titulo: "Condiciones comerciales",
    contenido: [
      "Vigencia de la cotización: 30 días calendario a partir de la fecha de emisión.",
      "Moneda: los precios están expresados en pesos colombianos e incluyen impuestos.",
      "Reserva: la fecha se garantiza con el pago del 50% de anticipo; el saldo se cancela el día del evento.",
      "Modificaciones: cualquier cambio en el alcance será cotizado por separado.",
    ].join("\n"),
  },
  { titulo: "Términos y plazos", contenido: "La disponibilidad de la fecha está sujeta a confirmación hasta recibir el anticipo.\nLas cancelaciones dentro de los 8 días previos al evento no son reembolsables." },
  LEGALES,
];

const oltc = [
  { titulo: "Sobre nosotros", contenido: "Somos una consultora especializada en optimización de gasto y eficiencia operativa. Ayudamos a las organizaciones a reducir costos identificando ahorros verificables, cobrando principalmente sobre los resultados obtenidos." },
  { titulo: "Alcance", contenido: "El alcance comprende el diagnóstico de las áreas de gasto acordadas, la propuesta de optimización y el acompañamiento durante el horizonte del contrato." },
  {
    titulo: "Condiciones comerciales",
    contenido: [
      "Modelo de cobro: honorarios calculados sobre el ahorro efectivamente verificado durante el horizonte del contrato.",
      "El ahorro estimado en esta propuesta es una proyección, no una garantía de resultado.",
      "Moneda: los valores están expresados en pesos colombianos e incluyen impuestos.",
      "Vigencia de la cotización: 30 días calendario a partir de la fecha de emisión.",
    ].join("\n"),
  },
  { titulo: "Términos y plazos", contenido: "El acompañamiento inicia una vez firmado el acuerdo y entregada la información de gasto requerida.\nLa medición del ahorro se realiza periódicamente durante el horizonte pactado." },
  LEGALES,
];

const abogados = [
  { titulo: "Sobre nosotros", contenido: "Somos una firma jurídica que brinda asesoría y representación legal a empresas y personas, con un equipo multidisciplinario y experiencia en distintas áreas del derecho." },
  { titulo: "Alcance de los servicios", contenido: "Los honorarios corresponden exclusivamente a los servicios jurídicos descritos en esta cotización.\nNo incluyen gastos procesales, expensas, honorarios de peritos ni costos notariales, que serán asumidos por el cliente." },
  COMERCIALES,
  {
    titulo: "Condiciones legales y de confidencialidad",
    contenido: [
      "La relación se rige por el secreto profesional y el deber de confidencialidad.",
      "La información compartida es de uso exclusivo para la prestación del servicio.",
      "Cualquier controversia se resolverá conforme a la legislación colombiana.",
    ].join("\n"),
  },
  { titulo: "Términos y plazos", contenido: "Los tiempos procesales dependen de los términos legales y de las autoridades competentes, por lo que son estimados." },
];

// slug -> cuerpo de ejemplo
const PORTENANT = {
  "demo-teatro": teatro,
  "demo-oltc": oltc,
};
// Por nombre (los slugs de prueba tienen sufijo aleatorio)
const PORNOMBRE = {
  "D&G Abogados": abogados,
};

const tenants = await prisma.tenant.findMany({
  select: { id: true, nombre: true, slug: true, cuerpoCotizacion: true },
});

let escritos = 0;
for (const t of tenants) {
  const yaTiene = Array.isArray(t.cuerpoCotizacion) && t.cuerpoCotizacion.length > 0;
  if (yaTiene) {
    console.log(`- ${t.nombre}: ya tiene cuerpo, se omite.`);
    continue;
  }
  const cuerpo = PORTENANT[t.slug] ?? PORNOMBRE[t.nombre] ?? generico(t.nombre);
  await prisma.tenant.update({ where: { id: t.id }, data: { cuerpoCotizacion: cuerpo } });
  console.log(`OK ${t.nombre}: cuerpo de ejemplo aplicado (${cuerpo.length} secciones).`);
  escritos++;
}
console.log(`\nListo. ${escritos} tenant(s) actualizados.`);
await prisma.$disconnect();
