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
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Pruebas · Cuenta Demo Evoluteca v1.0"),
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
    ["Administrador", "admin@demo-evoluteca.com"],
    ["Gerente", "gerente@demo-evoluteca.com"],
    ["Comercial", "sofia@demo-evoluteca.com"],
    ["Contraseña (todos)", "Demo2026!"],
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
    { title: "Manual de Pruebas — Cuenta Demo Evoluteca — Evoluteca CRM", author: "Evoluteca", subject: "Recorrido guiado de la cuenta de demostración" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        React.createElement(View, { style: s.portadaAmbar },
          React.createElement(Text, { style: s.portadaTit }, "Manual de Pruebas"),
          React.createElement(Text, { style: s.portadaTit }, "Cuenta Demo Evoluteca"),
          React.createElement(Text, { style: s.portadaSub }, "Recorrido guiado — CRM comercial general + novedades recientes"),
          React.createElement(View, { style: { marginTop: 60 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#fde68a", marginBottom: 6 } }, "Contenido de este manual:"),
            ...[
              "1. Qué es esta cuenta y qué vas a encontrar",
              "2. Credenciales de acceso",
              "3. Recorrido guiado — CRM general (10 min)",
              "4. Recorrido guiado — Novedades recientes (10 min)",
              "5. Preguntas frecuentes de la prueba",
              "6. Próximos pasos",
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
      React.createElement(P, null, "Esta es una cuenta de demostración de Evoluteca CRM cargada con datos ficticios pero realistas de una empresa de consultoría y servicios B2B: 21 clientes, 23 contactos y 59 oportunidades en distintas etapas del pipeline, con reportes, metas y un equipo de 5 usuarios ya configurado."),
      React.createElement(P, null, "A diferencia de otras cuentas demo de Evoluteca (por ejemplo, la de un teatro), esta usa únicamente los módulos estándar del CRM — no tiene activado Funciones ni Audiencia — para que veas exactamente lo que recibiría cualquier empresa de servicios, consultoría, tecnología o similar."),
      React.createElement(Nota, null, "Todos los datos de esta cuenta son ficticios (nombres, empresas, negocios). Puedes crear, editar y borrar libremente — es un entorno de prueba aislado, no afecta ninguna cuenta real."),

      React.createElement(H1, null, "2. Credenciales de acceso"),
      React.createElement(P, null, "Te recomendamos iniciar sesión primero como Administrador para ver el sistema completo, incluyendo Configuración y Equipo. Los usuarios comparten los mismos datos — la diferencia es lo que cada rol puede ver y hacer."),
      React.createElement(Credenciales, null),
      React.createElement(Tip, null, "Inicia con el usuario Administrador (Laura Mendoza). Si luego quieres ver cómo se ve el sistema para un vendedor, cierra sesión y entra con el usuario Comercial (Sofía Restrepo) — notarás que solo ve sus propios registros y no tiene acceso a Configuración."),
    ),

    // ── CAPÍTULO 3: RECORRIDO CRM GENERAL ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "3. Recorrido guiado — CRM general (aprox. 10 min)"),
      React.createElement(P, null, "Este recorrido cubre lo mismo que usaría cualquier negocio B2B: gestión de clientes, pipeline de ventas, cotizaciones, agenda y reportes."),

      React.createElement(Paso, { n: 1, titulo: "Dashboard", desc: "Al entrar verás el tablero principal: meta del mes, pipeline activo, ranking de vendedores y el panel de Alertas con actividades vencidas y negocios estancados." }),
      React.createElement(Paso, { n: 2, titulo: "Clientes", desc: "Ve a Clientes. Verás 21 empresas de sectores variados: tecnología, educación, salud, hospitalidad, ONG. Abre 'Tech Solutions Colombia' para ver su ficha completa con oportunidades, contactos y un archivo adjunto de ejemplo." }),
      React.createElement(Paso, { n: 3, titulo: "Pipeline", desc: "Ve a Pipeline. Verás 59 oportunidades repartidas en las 6 etapas — desde consultorías recién prospectadas hasta proyectos ya ganados o perdidos. Arrastra una tarjeta entre columnas para ver cómo se actualiza." }),
      React.createElement(Paso, { n: 4, titulo: "Cotizaciones", desc: "Ve a Nueva cotización o al detalle de una oportunidad ganada para ver cómo se arma una cotización formal, con desglose de servicios, impuesto y total, lista para descargar en PDF." }),
      React.createElement(Paso, { n: 5, titulo: "Agenda", desc: "Revisa la Agenda: hay actividades vencidas (para que veas cómo se ven las alertas rojas) y próximas, vinculadas a los negocios del pipeline." }),
      React.createElement(Paso, { n: 6, titulo: "Reportes", desc: "Ve a Reportes para ver el embudo de conversión, top de clientes, tasa de cierre y el cumplimiento de metas ya configuradas en esta cuenta." }),
      React.createElement(Tip, null, "Todo lo anterior es exactamente lo que verías desde el primer día con tus propios datos — sin necesitar activar ningún módulo adicional."),
    ),

    // ── CAPÍTULO 4: RECORRIDO NOVEDADES ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Recorrido guiado — Novedades recientes (aprox. 10 min)"),
      React.createElement(P, null, "Esta cuenta se dejó preparada a propósito con ejemplos reales de las 5 funciones más recientes del CRM, para que las veas en acción con datos concretos, no solo leerlas."),

      React.createElement(Paso, { n: 7, titulo: "Filtro por vendedor", desc: "Ve a Pipeline o Reportes (con el usuario Administrador o Gerente). En la barra de filtros verás un selector 'Vendedor' — elige 'Sofía Restrepo' o 'Andrés Castillo' para ver solo el pipeline de esa persona." }),
      React.createElement(Paso, { n: 8, titulo: "Motivo de pérdida", desc: "En Clientes, abre 'Tech Solutions Colombia'. En su lista de Oportunidades verás 'Cultura ágil Tech Solutions · PERDIDA (Precio)' — el motivo aparece entre paréntesis. Entra a esa oportunidad para verlo también destacado en rojo bajo el título." }),
      React.createElement(Paso, { n: 9, titulo: "Archivos adjuntos", desc: "En esa misma ficha de 'Tech Solutions Colombia' verás la sección Archivos adjuntos con un logo de ejemplo ya cargado. Ve también a la oportunidad 'Innovación pedagógica Colegio San Marcos' (Ganada) para ver una cotización firmada adjunta — descárgala para confirmar que es un PDF real." }),
      React.createElement(Paso, { n: 10, titulo: "Captura externa de leads", desc: "Con el usuario Administrador, ve a Configuración, sección 'Captura externa de leads'. Ahí verás la clave ya generada para esta cuenta — es la que usaría un formulario web o una automatización de WhatsApp/Ads para crear leads automáticamente en el Pipeline." }),
      React.createElement(Paso, { n: 11, titulo: "Etapas de pipeline configurables", desc: "En Configuración, sección 'Etapas del pipeline', prueba a renombrar una etapa (por ejemplo, cambiar 'Cotización' por 'Propuesta enviada') y arrastrarla a otra posición. Ve luego a Pipeline y Reportes — el cambio se refleja al instante en ambos." }),
      React.createElement(Nota, null, "Estas 5 funciones se sumaron para resolver necesidades reales detectadas en cuentas ya operando: visibilidad por vendedor, aprender de por qué se pierde un negocio, trazabilidad documental, captura automática de leads externos, y un pipeline que se adapta al vocabulario de cada negocio."),
    ),

    // ── CAPÍTULO 5: FAQ ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "5. Preguntas frecuentes de la prueba"),

      React.createElement(H2, null, "¿Puedo dañar algo si hago pruebas libremente?"),
      React.createElement(P, null, "No. Esta cuenta está completamente aislada de cualquier cuenta real — crea, edita y borra lo que quieras."),

      React.createElement(H2, null, "¿Los números que veo (metas, tasa de cierre, forecast) son reales o inventados?"),
      React.createElement(P, null, "Los datos base (clientes, oportunidades, actividades) son ficticios, pero los cálculos son exactamente los mismos que correrían sobre tus datos reales."),

      React.createElement(H2, null, "¿Cuánto tiempo va a estar disponible esta cuenta?"),
      React.createElement(P, null, "Mientras la estés usando para evaluar. Si necesitas más tiempo o quieres que se recarguen los datos a su estado inicial, solo pide que se vuelva a ejecutar la carga de prueba."),

      React.createElement(H2, null, "Si decidimos avanzar, ¿migran nuestros datos reales a esta misma cuenta?"),
      React.createElement(P, null, "No — se crea una cuenta nueva, limpia, solo con tus datos reales. Esta cuenta demo se puede desactivar en ese momento."),

      React.createElement(H2, null, "¿Puedo probar módulos específicos como Funciones o Salones aquí?"),
      React.createElement(P, null, "Esta cuenta no los tiene activados a propósito, para mostrar el CRM genérico sin ruido de funciones sectoriales. Si tu negocio necesita alguno de esos módulos, pide una cuenta demo específica (por ejemplo, la de Demo Teatro)."),

      React.createElement(Sep, null),

      React.createElement(H1, null, "6. Próximos pasos"),
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
      "Content-Disposition": 'attachment; filename="manual-pruebas-demo-evoluteca.pdf"',
    },
  });
}
