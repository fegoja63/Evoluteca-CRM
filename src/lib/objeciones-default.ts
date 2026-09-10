// Set de 15 objeciones de venta sugeridas (basado en el material de Luis Salinas)
// con la respuesta recomendada y "lo que no conviene responder". Sirve para
// precargar la Guía de objeciones de un tenant; luego el equipo la adapta.
export type ObjecionSugerida = {
  categoria: string;
  objecion: string;
  respuesta: string;
  loQueNoDecir: string;
};

export const OBJECIONES_SUGERIDAS: ObjecionSugerida[] = [
  {
    categoria: "Timing",
    objecion: "Escríbeme en 3 meses",
    respuesta: "Vale… solo una cosa más: ¿qué va a cambiar en esos 3 meses que hoy no tienes ya?",
    loQueNoDecir: "Vale, te aviso entonces.",
  },
  {
    categoria: "Presupuesto",
    objecion: "No hay presupuesto",
    respuesta: "Dejando el presupuesto aparte un segundo… ¿esto es prioridad este año o no?",
    loQueNoDecir: "¿O sea que no queréis resolver [problema]?",
  },
  {
    categoria: "Competencia",
    objecion: "Estamos atados a un contrato con la competencia",
    respuesta: "Vale. ¿Hay algo que cambiarías de lo que tenéis ahora mismo?",
    loQueNoDecir: "Te enseño algo mejor y vemos cómo salir del contrato.",
  },
  {
    categoria: "Competencia",
    objecion: "Ya usamos a la competencia",
    respuesta: "Es buena herramienta, sobre todo para ABC. ¿Te cuento 3 cosas en las que somos distintos?",
    loQueNoDecir: "Nosotros les damos mil vueltas en XYZ.",
  },
  {
    categoria: "Precio",
    objecion: "Es muy caro",
    respuesta: "Suena a que lo estás comparando con lo que ya tienes… o el valor simplemente no te ha llegado. ¿Cuál de las dos?",
    loQueNoDecir: "Te hago un descuento.",
  },
  {
    categoria: "Timing",
    objecion: "Mándame un email",
    respuesta: "No quiero ser pesado si esto no es tu prioridad ahora… ¿te cuento antes por qué llamé, y luego tú decides si vale la pena que te llene el correo?",
    loQueNoDecir: "Vale, te lo mando después de la llamada.",
  },
  {
    categoria: "Interés",
    objecion: "No me interesa",
    respuesta: "Lo pillo. Antes de colgar… ¿[problema] es prioridad ahora mismo? Si no, ¿cuál lo es?",
    loQueNoDecir: "O sea que [problema] no es prioridad.",
  },
  {
    categoria: "Objeción de fondo",
    objecion: "Ya lo probamos y no funcionó",
    respuesta: "Gracias por decirlo. ¿Qué fue exactamente lo que no funcionó?",
    loQueNoDecir: "Te enseño qué podrías haber hecho distinto.",
  },
  {
    categoria: "Proceso",
    objecion: "Tengo que hablarlo internamente",
    respuesta: "Claro. ¿Quién más entra ahí, para darte los detalles que necesiten?",
    loQueNoDecir: "Perfecto, espero tu respuesta.",
  },
  {
    categoria: "Competencia",
    objecion: "¿En qué os diferenciáis de [competidor]?",
    respuesta: "Si no te importa la pregunta… ¿qué es lo que mejor te funciona hoy de tu solución actual?",
    loQueNoDecir: "Tenemos cosas que ellos no tienen.",
  },
  {
    categoria: "Interés",
    objecion: "¿Y qué gano yo?",
    respuesta: "Buena pregunta. Si [reto] es prioridad para ti, te cuento cómo hemos ayudado a otros con eso.",
    loQueNoDecir: "Impacta en tu cuenta de resultados.",
  },
  {
    categoria: "Interés",
    objecion: "Por ahora estamos bien así",
    respuesta: "Vale. Solo para tenerlo claro… ¿qué es lo que te tiene tranquilo con cómo va todo ahora?",
    loQueNoDecir: "Vale… ¿pero has pensado en…?",
  },
  {
    categoria: "Precio",
    objecion: "¿Cuál es el precio?",
    respuesta: "Se mueve entre A y B, según lo que necesites. ¿Encaja con lo que esperabas o no?",
    loQueNoDecir: "Es confidencial hasta que sepamos tus necesidades.",
  },
  {
    categoria: "Timing",
    objecion: "Ahora mismo ando muy liado",
    respuesta: "Lo entiendo. ¿Hay mejor momento, o prefieres que te mande algo rápido por email?",
    loQueNoDecir: "Te llamo luego.",
  },
  {
    categoria: "Competencia",
    objecion: "Estamos contentos con nuestro proveedor",
    respuesta: "Me alegra que os funcione. ¿Te apetece ver otras opciones solo para comparar antes de renovar?",
    loQueNoDecir: "Ellos bien, pero nosotros mejor en XYZ.",
  },
];
