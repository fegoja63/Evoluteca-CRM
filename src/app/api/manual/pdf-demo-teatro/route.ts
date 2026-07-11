import { NextResponse } from "next/server";
import {
  renderToBuffer, Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const C = {
  ambar:      "#b45309",
  ambarClarito: "#fef3c7",
  azulMedio:  "#2563eb",
  azulClarito:"#dbeafe",
  verde:      "#059669",
  gris:       "#64748b",
  grisClaro:  "#f1f5f9",
  grisBorde:  "#e2e8f0",
  negro:      "#1e293b",
  blanco:     "#ffffff",
  amarillo:   "#f59e0b",
  rojo:       "#dc2626",
};

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: C.negro, backgroundColor: C.blanco, paddingBottom: 50 },
  portada:     { flex: 1, flexDirection: "column" },
  portadaLogos:{ backgroundColor: C.blanco, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 60, paddingVertical: 20 },
  portadaAmbar:{ backgroundColor: C.ambar, flex: 1, paddingHorizontal: 60, paddingTop: 60, paddingBottom: 60, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 30, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 14, color: "#fde68a", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#fcd34d", borderTopWidth: 1, borderTopColor: "#92400e", paddingTop: 16 },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  seccion:     { paddingHorizontal: 40, paddingTop: 32 },
  h1:          { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.ambar, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.ambar, borderRadius: 2, marginBottom: 16, width: 60 },
  h2:          { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: C.ambarClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.ambar, fontFamily: "Helvetica-Bold", fontSize: 12 },
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
  pasoNum:     { width: 22, height: 22, backgroundColor: C.ambar, borderRadius: 11, alignItems: "center", justifyContent: "center", shrink: 0 },
  pasoNumTxt:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blanco },
  pasoBody:    { flex: 1 },
  pasoTit:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  pasoTxt:     { fontSize: 9, color: C.gris, lineHeight: 1.5 },
  credBox:     { backgroundColor: C.negro, borderRadius: 8, padding: 16, marginVertical: 10 },
  credRow:     { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#334155" },
  credLabel:   { fontSize: 9, color: "#94a3b8" },
  credValue:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.blanco },
});

function PageHeader() {
  return React.createElement(View, { style: s.pageHeader, fixed: true },
    React.createElement(Image, { style: s.pageHeaderLogo, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
    React.createElement(Image, { style: s.pageHeaderFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
  );
}
function Footer() {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Pruebas · Cuenta Demo v1.0"),
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
function Credenciales() {
  const filas: [string, string][] = [
    ["URL", "crm.evoluteca.com/login"],
    ["Administrador", "admin@demo-teatro.com"],
    ["Gerente", "gerente@demo-teatro.com"],
    ["Comercial / Taquilla", "comercial@demo-teatro.com"],
    ["Contraseña (los tres)", "Demo2026!"],
  ];
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.credBox },
      ...filas.map(([label, value], i) => React.createElement(View, { key: label, style: i === filas.length - 1 ? { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 } : s.credRow },
        React.createElement(Text, { style: s.credLabel }, label),
        React.createElement(Text, { style: s.credValue }, value),
      )),
    ),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const doc = React.createElement(Document,
    { title: "Manual de Pruebas — Cuenta Demo Teatro — Evoluteca CRM", author: "Evoluteca", subject: "Recorrido guiado de la cuenta de demostración" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        React.createElement(View, { style: s.portadaAmbar },
          React.createElement(Text, { style: s.portadaTit }, "Manual de Pruebas"),
          React.createElement(Text, { style: s.portadaTit }, "Cuenta Demo Teatro"),
          React.createElement(Text, { style: s.portadaSub }, "Recorrido guiado — conoce el alcance completo antes de decidir"),
          React.createElement(View, { style: { marginTop: 60 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#fde68a", marginBottom: 6 } }, "Contenido de este manual:"),
            ...[
              "1. Qué es esta cuenta y qué vas a encontrar",
              "2. Credenciales de acceso",
              "3. Recorrido guiado — CRM general (10 min)",
              "4. Recorrido guiado — Funciones y Audiencia (15 min)",
              "5. Cómo probar la cola de NPS en vivo",
              "6. Preguntas frecuentes de la prueba",
              "7. Próximos pasos",
            ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#fef3c7", marginBottom: 3 } }, item)),
          ),
          React.createElement(View, { style: { marginTop: 40 } },
            React.createElement(Text, { style: s.portadaVer }, `Versión 1.0 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
          ),
        ),
      ),
    ),

    // ── CAPÍTULO 1 y 2 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "1. Qué es esta cuenta y qué vas a encontrar"),
      React.createElement(P, null, "Esta es una cuenta de demostración de Evoluteca CRM, cargada con datos ficticios pero realistas para que puedas explorar de primera mano el alcance completo del producto: la parte comercial general (clientes, pipeline, cotizaciones, agenda, reportes) que usa cualquier empresa, y la parte específica para teatros y espacios de espectáculos (funciones, ocupación, audiencia, retención, membresías)."),
      React.createElement(P, null, "La idea es simple: que veas con datos reales de ejemplo — no capturas de pantalla ni promesas — exactamente qué recibirías si decides implementarlo, y que puedas hacer clic en todo sin miedo a dañar nada."),
      React.createElement(Nota, null, "Todos los datos de esta cuenta son ficticios (nombres, empresas, funciones, espectadores). Puedes crear, editar y borrar libremente — es un entorno de prueba aislado, no afecta ninguna cuenta real."),

      React.createElement(H1, null, "2. Credenciales de acceso"),
      React.createElement(P, null, "Te recomendamos iniciar sesión primero como Administrador para ver el sistema completo, incluyendo Configuración y Equipo. Los tres usuarios comparten los mismos datos — la diferencia es lo que cada rol puede ver y hacer."),
      React.createElement(Credenciales, null),
      React.createElement(Tip, null, "Inicia con el usuario Administrador. Si luego quieres ver cómo se ve el sistema para un vendedor o para quien atiende taquilla, cierra sesión y entra con el usuario Comercial — notarás que solo ve sus propios registros."),
    ),

    // ── CAPÍTULO 3: RECORRIDO CRM GENERAL ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "3. Recorrido guiado — CRM general (aprox. 10 min)"),
      React.createElement(P, null, "Esta parte del sistema es idéntica a la que usan empresas de servicios, agencias o cualquier negocio B2B. En un teatro corresponde a la gestión de alquiler de sala y eventos corporativos — la 'palanca dormida' que casi nunca se trabaja con sistema."),

      React.createElement(Paso, { n: 1, titulo: "Dashboard", desc: "Al entrar verás el tablero principal: meta del mes, pipeline activo, ranking de vendedores y un panel de Alertas. Fíjate en el bloque de alertas — ahí es donde en el paso 8 verás también la alerta de ocupación de funciones." }),
      React.createElement(Paso, { n: 2, titulo: "Clientes", desc: "Ve a Clientes. Verás 6 empresas B2B: 2 colegios, 2 corporativos, 1 agencia de eventos y 1 ONG — el tipo de cliente que alquila la sala, no el público que compra boletería (eso vive en Audiencia, capítulo 4)." }),
      React.createElement(Paso, { n: 3, titulo: "Pipeline", desc: "Ve a Pipeline. Verás 6 oportunidades de alquiler en distintas etapas: una graduación ya ganada, un kickoff corporativo en negociación, una función privada de colegio en propuesta, etc. Arrastra una tarjeta entre columnas para ver cómo se actualiza." }),
      React.createElement(Paso, { n: 4, titulo: "Cotizaciones", desc: "Ve a Nueva cotización o al detalle de una oportunidad para ver una cotización formal ya generada, con el desglose de alquiler de sala, catering y producción técnica. Descarga el PDF para ver cómo le llega al cliente." }),
      React.createElement(Paso, { n: 5, titulo: "Agenda", desc: "Revisa la Agenda: hay actividades vencidas (para que veas cómo se ven las alertas rojas) y próximas, vinculadas a los negocios del pipeline." }),
      React.createElement(Paso, { n: 6, titulo: "Reportes", desc: "Ve a Reportes para ver el embudo de conversión, top de clientes y el cumplimiento de la meta mensual y anual ya configuradas en esta cuenta." }),
      React.createElement(Tip, null, "Todo lo anterior funciona exactamente igual sin importar el tipo de negocio. Es la base que ya tendrías funcionando desde el primer día, incluso antes de activar nada específico de teatros."),
    ),

    // ── CAPÍTULO 4: RECORRIDO FUNCIONES + AUDIENCIA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Recorrido guiado — Funciones y Audiencia (aprox. 15 min)"),
      React.createElement(P, null, "Esta es la parte diseñada específicamente para teatros. Ve a Funciones en el menú lateral — verás 16 funciones: 13 ya realizadas en los últimos 5 meses y 3 próximas."),

      React.createElement(Paso, { n: 7, titulo: "Explorar la lista de Funciones", desc: "Fíjate en la barra de ocupación de cada función (verde/ámbar/rojo). Ordénalas por fecha para ver el histórico." }),
      React.createElement(Paso, { n: 8, titulo: "Encontrar la alerta de ocupación baja", desc: "Busca la función 'Réquiem — Concierto Coral', programada en pocos días con apenas 19% de ocupación. Tiene el badge 'urgente'. Ahora ve al Dashboard: la misma alerta aparece en el panel de Alertas — así se enteraría tu equipo comercial a tiempo para lanzar una campaña de último momento." }),
      React.createElement(Paso, { n: 9, titulo: "Abrir la ficha de una función pasada", desc: "Entra a 'Don Quijote — Adaptación Teatral'. Verás la ocupación, ingresos, respuestas NPS y la lista de Asistentes registrados — con el badge 'nuevo' o 'recurrente' según si esa persona ya había ido a otra función." }),
      React.createElement(Paso, { n: 10, titulo: "Registrar un asistente tú mismo", desc: "En esa misma ficha, en la sección Asistentes, escribe tu propio nombre y regístrate como asistente nuevo. Verás cómo aparece de inmediato en la lista." }),
      React.createElement(Paso, { n: 11, titulo: "Ir a Audiencia", desc: "Ve a Audiencia en el menú. El KPI 'Tasa de recompra' ya tiene un valor calculado a partir de las 75 asistencias cargadas en esta cuenta — no es un número inventado, sale de la asistencia real registrada función por función." }),
      React.createElement(Paso, { n: 12, titulo: "Usar el filtro de recencia", desc: "Haz clic en los filtros 'Activo', 'Tibio' y 'Frío' encima de la tabla. Verás cómo cambia la lista — son los espectadores que fueron recientemente, los que llevan meses sin volver, y los que probablemente ya se perdieron." }),
      React.createElement(Paso, { n: 13, titulo: "Ver un Mecenas", desc: "Busca a 'Camila Torres' en Audiencia — tiene el badge morado 'Mecenas'. Abre su ficha: verás su historial completo de asistencias a lo largo de varios meses, el patrón de un espectador altamente fidelizado." }),
      React.createElement(Nota, null, "Los 3 niveles de membresía (Espectador, Fanático, Mecenas) vienen predefinidos, pero el beneficio real de cada uno — descuentos, acceso a ensayos, naming, etc. — lo defines tú. El sistema solo guarda la etiqueta y te permite filtrar y priorizar por ella."),
    ),

    // ── CAPÍTULO 5 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "5. Cómo probar la cola de NPS en vivo"),
      React.createElement(P, null, "Esta cuenta se dejó preparada a propósito con encuestas NPS pendientes de las dos funciones más recientes, para que puedas ver el flujo completo en acción, no solo leerlo."),
      React.createElement(Paso, { n: 14, titulo: "Ir a la Cola de NPS", desc: "En Audiencia, haz clic en el botón 'Cola de NPS' (verás un contador con los pendientes)." }),
      React.createElement(Paso, { n: 15, titulo: "Enviar una encuesta de prueba", desc: "Haz clic en el botón de WhatsApp de cualquier persona de la lista. Verás el mensaje de encuesta ya redactado, listo para editar y enviar." }),
      React.createElement(Paso, { n: 16, titulo: "Confirmar que desaparece de la cola", desc: "Al hacer clic en 'Abrir WhatsApp', esa persona se marca automáticamente como contactada y desaparece de la lista de pendientes — sin ningún paso manual adicional." }),
      React.createElement(Tip, null, "Este flujo reduce el envío de encuestas a un clic por persona, sin necesitar contratar la API de WhatsApp Business. Si más adelante quieren automatizarlo 100%, es una integración adicional que se puede evaluar por separado."),
    ),

    // ── CAPÍTULO 6: FAQ ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "6. Preguntas frecuentes de la prueba"),

      React.createElement(H2, null, "¿Puedo dañar algo si hago pruebas libremente?"),
      React.createElement(P, null, "No. Esta cuenta está completamente aislada de cualquier cuenta real — crea, edita y borra lo que quieras."),

      React.createElement(H2, null, "¿Los números que veo (tasa de recompra, ocupación, etc.) son reales o inventados?"),
      React.createElement(P, null, "Los datos base (asistencias, funciones, NPS) son ficticios, pero los cálculos son exactamente los mismos que correrían sobre tus datos reales. Lo que ves es el sistema funcionando de verdad, no una maqueta."),

      React.createElement(H2, null, "¿Cuánto tiempo va a estar disponible esta cuenta?"),
      React.createElement(P, null, "Mientras la estés usando para evaluar. Si necesitas más tiempo o quieres que se recarguen los datos a su estado inicial, solo pide que se vuelva a ejecutar la carga de prueba."),

      React.createElement(H2, null, "Si decidimos avanzar, ¿migran nuestros datos reales a esta misma cuenta?"),
      React.createElement(P, null, "No — se crea una cuenta nueva, limpia, solo con tus datos reales. Esta cuenta demo se puede desactivar en ese momento."),

      React.createElement(H2, null, "¿Qué pasa con los módulos que no necesitamos?"),
      React.createElement(P, null, "Funciones y Audiencia son opcionales — se activan o desactivan desde Configuración sin afectar el resto del CRM. Si tu operación no los necesita, simplemente no aparecen en el menú y nadie los ve."),

      React.createElement(Sep, null),

      React.createElement(H1, null, "7. Próximos pasos"),
      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 4 }, wrap: false },
        React.createElement(View, { style: { backgroundColor: C.ambar, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Listo para dar el siguiente paso?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#fde68a", lineHeight: 1.6 } },
            "Después de tu recorrido, agenda una llamada corta para resolver dudas puntuales y definir el plan de arranque con tus datos reales.\n\nEste CRM fue desarrollado por el Equipo Evoluteca.com y felipegomezjaramillo.com.\nPlataforma: crm.evoluteca.com\n\nPara soporte técnico o para avanzar con la implementación, contacta directamente al equipo."
          ),
        ),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="manual-pruebas-demo-teatro.pdf"',
    },
  });
}
