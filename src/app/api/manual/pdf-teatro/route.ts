import { NextResponse } from "next/server";
import {
  renderToBuffer, Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const C = {
  azul:      "#1e3a8a",
  azulClarito: "#dbeafe",
  azulMedio: "#2563eb",
  verde:     "#059669",
  verdeClarito: "#d1fae5",
  gris:      "#64748b",
  grisClaro: "#f1f5f9",
  grisBorde: "#e2e8f0",
  negro:     "#1e293b",
  blanco:    "#ffffff",
  amarillo:  "#f59e0b",
  violeta:   "#7c3aed",
};

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: C.negro, backgroundColor: C.blanco, paddingBottom: 50 },
  portada:     { flex: 1, flexDirection: "column" },
  portadaLogos:{ backgroundColor: C.blanco, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 60, paddingVertical: 20 },
  portadaAzul: { backgroundColor: C.violeta, flex: 1, paddingHorizontal: 60, paddingTop: 60, paddingBottom: 60, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 15, color: "#ddd6fe", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#c4b5fd", borderTopWidth: 1, borderTopColor: "#6d28d9", paddingTop: 16 },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  seccion:     { paddingHorizontal: 40, paddingTop: 32 },
  h1:          { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.violeta, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.violeta, borderRadius: 2, marginBottom: 16, width: 60 },
  h2:          { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: "#fefce8", borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.violeta, fontFamily: "Helvetica-Bold", fontSize: 12 },
  liTxt:       { flex: 1, fontSize: 10, color: C.negro, lineHeight: 1.5 },
  tabla:       { borderWidth: 1, borderColor: C.grisBorde, borderRadius: 6, overflow: "hidden", marginVertical: 8 },
  tablaHead:   { flexDirection: "row", backgroundColor: C.grisClaro, paddingVertical: 6, paddingHorizontal: 10 },
  tablaHCell:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gris, textTransform: "uppercase" },
  tablaRow:    { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.grisClaro },
  tablaCell:   { fontSize: 9, color: C.negro },
  footer:      { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.grisBorde, paddingTop: 6 },
  footerTxt:   { fontSize: 7, color: C.gris },
  sep:         { height: 1, backgroundColor: C.grisBorde, marginVertical: 16, marginHorizontal: 40 },
  paso:        { flexDirection: "row", marginBottom: 10, gap: 10 },
  pasoNum:     { width: 22, height: 22, backgroundColor: C.violeta, borderRadius: 11, alignItems: "center", justifyContent: "center", shrink: 0 },
  pasoNumTxt:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blanco },
  pasoBody:    { flex: 1 },
  pasoTit:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  pasoTxt:     { fontSize: 9, color: C.gris, lineHeight: 1.5 },
});

function PageHeader() {
  return React.createElement(View, { style: s.pageHeader, fixed: true },
    React.createElement(Image, { style: s.pageHeaderLogo, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
    React.createElement(Image, { style: s.pageHeaderFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
  );
}
function Footer() {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Anexo Teatros y Espacios de Espectáculos v1.0"),
    React.createElement(Text, { style: s.footerTxt, render: ({ pageNumber }: { pageNumber: number }) => `Página ${pageNumber}` } as object),
  );
}
function H1({ children }: { children: string }) {
  return React.createElement(View, { style: s.seccion },
    React.createElement(Text, { style: s.h1 }, children),
    React.createElement(View, { style: s.h1Line }),
  );
}
function H2({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(Text, { style: s.h2 }, children),
  );
}
function P({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(Text, { style: s.p }, children),
  );
}
function Tip({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.tip },
      React.createElement(Text, { style: s.tipTxt },
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, "Tip: "),
        children,
      ),
    ),
  );
}
function Nota({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.nota },
      React.createElement(Text, { style: s.notaTxt },
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, "Importante: "),
        children,
      ),
    ),
  );
}
function LI({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.li },
      React.createElement(Text, { style: s.bullet }, "•"),
      React.createElement(Text, { style: s.liTxt }, children),
    ),
  );
}
function Paso({ n, titulo, desc }: { n: number; titulo: string; desc: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.paso },
      React.createElement(View, { style: s.pasoNum },
        React.createElement(Text, { style: s.pasoNumTxt }, String(n)),
      ),
      React.createElement(View, { style: s.pasoBody },
        React.createElement(Text, { style: s.pasoTit }, titulo),
        React.createElement(Text, { style: s.pasoTxt }, desc),
      ),
    ),
  );
}
function Sep() {
  return React.createElement(View, { style: s.sep });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "funciones") && !moduloActivo(tenant?.modulos, "audiencia")) {
    return NextResponse.json({ error: "Este anexo aplica solo a tenants con el módulo Funciones o Audiencia activo" }, { status: 403 });
  }

  const doc = React.createElement(Document,
    { title: "Anexo — Teatros y Espacios de Espectáculos — Evoluteca CRM", author: "Evoluteca", subject: "Guía de módulos Funciones y Audiencia" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        React.createElement(View, { style: s.portadaAzul },
          React.createElement(Text, { style: s.portadaTit }, "Anexo — Teatros y"),
          React.createElement(Text, { style: s.portadaTit }, "Espacios de Espectáculos"),
          React.createElement(Text, { style: s.portadaSub }, "Módulos Funciones y Audiencia — Evoluteca CRM"),
          React.createElement(View, { style: { marginTop: 60 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#ddd6fe", marginBottom: 6 } }, "Contenido de este anexo:"),
            ...[
              "1. Para quién es este anexo",
              "2. Módulo Funciones — asistencia, importación y temporadas",
              "3. Alerta de ocupación baja",
              "4. Módulo Audiencia — retención y recencia",
              "5. Niveles de membresía (club de fidelización)",
              "6. Cola de encuestas NPS por WhatsApp",
              "7. Preguntas frecuentes",
            ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#e9d5ff", marginBottom: 3 } }, item)),
          ),
          React.createElement(View, { style: { marginTop: 40 } },
            React.createElement(Text, { style: s.portadaVer }, `Versión 1.1 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
          ),
        ),
      ),
    ),

    // ── CAPÍTULO 1 y 2 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "1. Para quién es este anexo"),
      React.createElement(P, null, "Este documento complementa el Manual de Usuario general de Evoluteca CRM y describe únicamente las funcionalidades adicionales pensadas para teatros, salas de espectáculos y espacios que venden boletería por función. Si tu empresa no gestiona funciones ni público asistente, este anexo no te aplica — todo lo que necesitas está en el manual general."),
      React.createElement(Nota, null, "Los módulos Funciones y Audiencia son opcionales y se activan desde Configuración > Módulos opcionales. Si no los ves en tu menú lateral, pide a tu Administrador que los active."),

      React.createElement(H1, null, "2. Módulo Funciones — asistencia, importación y temporadas"),
      React.createElement(P, null, "Cada función registrada (título, fecha, aforo, canal de venta e ingreso estimado) ahora incluye una sección de Asistentes para registrar quién estuvo en la sala, no solo cuántas sillas se vendieron. Este dato es la base de todo lo demás en este anexo: sin asistencia registrada por persona no es posible medir retención."),

      React.createElement(H2, null, "2.1 Registrar un asistente"),
      React.createElement(Paso, { n: 1, titulo: "Abrir la función", desc: "Ve a Funciones y haz clic en la función correspondiente para abrir su ficha." }),
      React.createElement(Paso, { n: 2, titulo: "Sección Asistentes", desc: "En el formulario, elige un espectador ya existente en el selector, o escribe el nombre (y teléfono si lo tienes) para crear uno nuevo en el momento." }),
      React.createElement(Paso, { n: 3, titulo: "Registrar", desc: "Haz clic en '+ Registrar asistencia'. El sistema no permite duplicar al mismo espectador dos veces en la misma función." }),
      React.createElement(P, null, "Cada asistente registrado aparece como una etiqueta con su nombre y un badge: 'nuevo' si es su primera función registrada, o 'recurrente' si ya había asistido antes a otra función."),
      React.createElement(Tip, null, "No necesitas capturar el 100% del aforo. Con registrar el teléfono de quienes compran boletería en taquilla o por WhatsApp ya empiezas a construir el historial de retención."),

      React.createElement(H2, null, "2.2 KPI de asistentes en la ficha de función"),
      React.createElement(P, null, "La ficha de cada función muestra, junto a la ocupación, el número de 'Asistentes registrados' y cuántos de ellos son recurrentes — una primera señal de fidelización función por función."),

      React.createElement(H2, null, "2.3 Importar asistentes desde Excel"),
      React.createElement(P, null, "Cuando tienes la planilla de público de una obra en Excel (por ejemplo, la lista de compradores de boletería), puedes cargarla completa a una función sin digitar uno por uno. En la sección Asistentes de la ficha de la función usa la opción de importar asistentes:"),
      React.createElement(Paso, { n: 1, titulo: "Subir el Excel", desc: "Abre la función, entra a importar asistentes y sube la planilla (.xlsx) del público de la obra." }),
      React.createElement(Paso, { n: 2, titulo: "Asignar columnas", desc: "Indica qué columna del Excel corresponde al nombre del asistente (obligatorio) y, si la tienes, al email y teléfono. El sistema confirma \"Columna de nombre asignada\" cuando ya puedes continuar." }),
      React.createElement(Paso, { n: 3, titulo: "Importar", desc: "El sistema registra la asistencia de cada persona a esa función y da de alta en Audiencia a quienes no existían todavía." }),
      React.createElement(P, null, "Para no duplicar, el importador busca coincidencia primero por email y, si no hay, por nombre; a quien ya estaba registrado en esa misma función lo salta. Al terminar muestra el desglose: asistencias registradas, espectadores nuevos, duplicados saltados y errores."),
      React.createElement(Nota, null, "Importar asistentes a una función registra la asistencia solo a esa función. Si la misma persona asiste a varias funciones, impórtala (o regístrala) en cada una — así el historial de recompra y recencia queda correcto."),
      React.createElement(Tip, null, "Es la forma más rápida de cargar el histórico: sube la planilla de cada función pasada y en minutos tendrás la base de retención y recencia (ver capítulo 4) construida sobre datos reales."),

      React.createElement(H2, null, "2.4 Crear una temporada completa de una vez"),
      React.createElement(P, null, "Cuando una obra se presenta muchas veces (por ejemplo, todos los fines de semana durante dos meses), no hace falta crear cada función a mano. En Funciones, al crear una función nueva, cambia del modo \"Función única\" al modo \"Temporada\":"),
      React.createElement(Paso, { n: 1, titulo: "Definir el patrón", desc: "Ingresa el título de la obra, el rango de fechas (Desde / Hasta), los días de la semana en que hay función y uno o varios horarios (con \"+ Agregar horario\")." }),
      React.createElement(Paso, { n: 2, titulo: "Datos comunes", desc: "Define el canal de venta, las sillas totales, el ingreso estimado por función y notas — se aplican a todas las funciones generadas." }),
      React.createElement(Paso, { n: 3, titulo: "Revisar y generar", desc: "El sistema muestra cuántas funciones se crearán y las fechas de la primera y la última. Haz clic en \"Generar temporada\"." }),
      React.createElement(P, null, "Cada función generada queda como una función individual e independiente: puedes editarla, registrar su ocupación, sus asistentes y su NPS por separado."),
      React.createElement(Nota, null, "Una temporada puede generar hasta 100 funciones de una vez. Si el patrón supera ese tope (por ejemplo, un rango muy largo con varios horarios diarios), el sistema te avisa y no genera hasta que acortes el rango o reduzcas los horarios."),
    ),

    // ── CAPÍTULO 3 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "3. Alerta de ocupación baja"),
      React.createElement(P, null, "El sistema revisa automáticamente las funciones programadas para los próximos 5 días. Si una función tiene menos del 60% de ocupación (sillas vendidas sobre sillas totales), se marca como urgente en tres lugares distintos, para que el equipo comercial tenga tiempo de reaccionar con una campaña de último momento."),

      React.createElement(H2, null, "3.1 Dónde aparece la alerta"),
      React.createElement(LI, null, "Dashboard principal: bloque '🎭 función(es) con ocupación baja' dentro del panel de Alertas, con el nombre, el % de ocupación y la fecha"),
      React.createElement(LI, null, "Lista de Funciones: la función aparece con un badge '⚠ urgente' junto al título"),
      React.createElement(LI, null, "Email diario automático (8am): si tienes las notificaciones activas en Configuración, recibirás un correo con el listado de funciones en riesgo"),
      React.createElement(Nota, null, "El umbral (60% de ocupación, 5 días de anticipación) es fijo en esta versión del sistema. No requiere configuración — se calcula automáticamente cada vez que cargas el Dashboard o se ejecuta el correo diario."),
      React.createElement(Tip, null, "Usa esta alerta como disparador de una campaña puntual: descuento de última hora, publicación en redes o mensaje directo al Club de fidelización (ver capítulo 5)."),
    ),

    // ── CAPÍTULO 4 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Módulo Audiencia — retención y recencia"),
      React.createElement(P, null, "Con el registro de asistencia por función (capítulo 2), Audiencia calcula automáticamente qué tan activo está cada espectador y qué porcentaje de tu público realmente regresa — dos datos que antes no existían en el CRM y que antes solo se podían estimar de forma manual."),

      React.createElement(H2, null, "4.1 Tasa de recompra"),
      React.createElement(P, null, "En la parte superior de Audiencia aparece el KPI 'Tasa de recompra': de todos los espectadores que asistieron a al menos una función en los últimos 90 días, qué porcentaje asistió a 2 o más funciones dentro de esa misma ventana de tiempo. Es el indicador central de fidelización de audiencia."),
      React.createElement(Tip, null, "Una meta de referencia razonable para empezar es 25% — si menos de 1 de cada 4 espectadores repite en 90 días, vale la pena invertir en el Club de fidelización del capítulo 5."),

      React.createElement(H2, null, "4.2 Segmentación por recencia (A / B / C)"),
      React.createElement(P, null, "Cada espectador con al menos una asistencia registrada recibe automáticamente una etiqueta de recencia, visible como columna en la tabla de Audiencia y como filtro rápido en la parte superior:"),
      React.createElement(View, { style: { paddingHorizontal: 40 } },
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHead },
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "Etiqueta"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "Última asistencia"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 2 }] }, "Qué significa"),
          ),
          ...[
            ["Activo",  "0 a 3 meses",   "Espectador reciente — prioridad para invitaciones y novedades"],
            ["Tibio",   "3 a 12 meses",  "No ha vuelto en un tiempo — candidato para campaña de reactivación"],
            ["Frío",    "Más de 12 meses", "Riesgo alto de pérdida — requiere un incentivo fuerte para regresar"],
          ].map(([tag, rango, desc], i) => React.createElement(View, { key: tag, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, tag),
            React.createElement(Text, { style: [s.tablaCell, { flex: 1 }] }, rango),
            React.createElement(Text, { style: [s.tablaCell, { flex: 2 }] }, desc),
          )),
        ),
      ),
      React.createElement(P, null, "Un espectador sin ninguna asistencia registrada aparece como 'Sin visitas' — normalmente porque solo tiene datos de contacto pero aún no se ha vinculado a ninguna función."),
      React.createElement(Tip, null, "Filtra por 'Frío' antes de una temporada baja para armar una lista de reactivación dirigida en vez de escribirle a toda la base por igual."),

      React.createElement(H2, null, "4.3 Historial de asistencias en la ficha del espectador"),
      React.createElement(P, null, "Al abrir la ficha de cualquier espectador verás el KPI 'Funciones asistidas' (conteo real de asistencia, no solo de encuestas NPS respondidas) y, debajo, la lista completa de funciones a las que ha ido con su fecha."),
    ),

    // ── CAPÍTULO 5 y 6 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "5. Niveles de membresía"),
      React.createElement(P, null, "Cada espectador puede tener asignado un nivel dentro de tu club de fidelización, editable desde su ficha o desde la tabla de Audiencia. El sistema trae tres niveles predefinidos, pensados como punto de partida:"),
      React.createElement(LI, null, "Espectador — nivel de entrada, típicamente con descuento base"),
      React.createElement(LI, null, "Fanático — nivel intermedio, típicamente con mayor descuento y acceso a beneficios adicionales (ej. invitación a ensayos)"),
      React.createElement(LI, null, "Mecenas — nivel más alto, para tus espectadores más comprometidos"),
      React.createElement(P, null, "El nombre y el beneficio exacto de cada nivel es una decisión comercial tuya — el sistema solo guarda la etiqueta. Los espectadores sin membresía asignada simplemente no muestran ningún badge."),
      React.createElement(Tip, null, "Combina el nivel de membresía con el filtro de recencia: identifica a tus 'Mecenas' que han pasado a 'Frío' y contáctalos de forma prioritaria — son el segmento de mayor valor en riesgo de irse."),

      React.createElement(H1, null, "6. Cola de encuestas NPS por WhatsApp"),
      React.createElement(P, null, "Antes, enviar la encuesta de satisfacción a cada asistente era un proceso manual y fácil de olvidar. Ahora el sistema identifica automáticamente a quién le falta enviarla y arma el mensaje por ti."),

      React.createElement(H2, null, "6.1 Cómo funciona"),
      React.createElement(P, null, "En Audiencia, el botón '💬 Cola de NPS' (con un contador cuando hay pendientes) lleva a una lista de asistentes que cumplen tres condiciones: la función terminó hace 24 horas o más, la persona tiene teléfono registrado, y todavía no se le ha enviado ni ha respondido la encuesta."),
      React.createElement(Paso, { n: 1, titulo: "Abrir la Cola de NPS", desc: "Ve a Audiencia y haz clic en el botón con el contador de pendientes." }),
      React.createElement(Paso, { n: 2, titulo: "Clic en WhatsApp", desc: "Por cada persona pendiente, haz clic en el botón de WhatsApp. El mensaje de encuesta ya viene redactado (puedes editarlo antes de enviar)." }),
      React.createElement(Paso, { n: 3, titulo: "Abrir WhatsApp y enviar", desc: "Se abre WhatsApp Web o la app con el mensaje listo. Al hacer clic en 'Abrir WhatsApp', el sistema marca automáticamente a esa persona como 'ya contactada' y desaparece de la cola." }),
      React.createElement(Nota, null, "El envío no es automático en segundo plano: WhatsApp Business API requiere una cuenta verificada y costo mensual que hoy no está contratado. Esta cola reduce el trabajo a un clic por persona, sin necesidad de esa integración paga."),
      React.createElement(P, null, "Cuando la persona responde con su puntuación, regístrala manualmente en la sección Encuesta NPS dentro de la ficha de la función correspondiente, igual que ya se hacía antes de este anexo."),
    ),

    // ── CAPÍTULO 7: FAQ ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "7. Preguntas frecuentes"),

      React.createElement(H2, null, "¿Qué pasa si registro dos veces al mismo espectador en la misma función?"),
      React.createElement(P, null, "El sistema lo impide automáticamente y muestra un mensaje de error — no es posible duplicar la asistencia de una misma persona en la misma función."),

      React.createElement(H2, null, "¿La tasa de recompra y la recencia se actualizan solas?"),
      React.createElement(P, null, "Sí. Ambas se recalculan en tiempo real cada vez que abres Audiencia o el Dashboard, a partir de las asistencias registradas — no requieren ningún proceso manual."),

      React.createElement(H2, null, "¿Puedo cambiar el umbral de ocupación baja (60%) o los días de anticipación (5)?"),
      React.createElement(P, null, "No en esta versión — son valores fijos pensados como punto de partida razonable. Si tu operación necesita otros umbrales, coméntalo con el equipo de Evoluteca."),

      React.createElement(H2, null, "¿Qué pasa si borro una función que ya tiene asistentes registrados?"),
      React.createElement(P, null, "Al eliminar una función se eliminan también sus registros de asistencia asociados, pero los espectadores en sí no se borran — solo pierden esa función de su historial. Esta acción no se puede deshacer."),

      React.createElement(H2, null, "¿Los espectadores del módulo Audiencia son lo mismo que los Contactos del CRM general?"),
      React.createElement(P, null, "No. Contactos es para personas dentro de tus clientes B2B (colegios, empresas que alquilan la sala). Espectadores es tu público B2C que compra boletería individual. Son dos bases independientes."),

      React.createElement(Sep, null),

      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 20 }, wrap: false },
        React.createElement(View, { style: { backgroundColor: C.violeta, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Necesitas ayuda adicional?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#ddd6fe", lineHeight: 1.6 } },
            "Este anexo complementa el Manual de Usuario general de Evoluteca CRM.\nPlataforma: crm.evoluteca.com\n\nPara soporte técnico o nuevas funcionalidades, contacta directamente al equipo Evoluteca."
          ),
        ),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="anexo-teatros-evoluteca-crm-${new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }).slice(0, 16).replace(" ", "-").replace(":", "")}.pdf"`,
    },
  });
}
