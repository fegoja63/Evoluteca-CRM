import { NextResponse } from "next/server";
import {
  renderToBuffer, Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";

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
  // Portada
  portada:     { flex: 1, flexDirection: "column" },
  portadaLogos:{ backgroundColor: C.blanco, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 60, paddingVertical: 20 },
  portadaAzul: { backgroundColor: C.azul, flex: 1, paddingHorizontal: 60, paddingTop: 60, paddingBottom: 60, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 36, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 16, color: "#93c5fd", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#64748b", borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 16 },
  logoBox:     { width: 60, height: 60, backgroundColor: "#2563eb", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  logoTxt:     { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.blanco },
  logosRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  // Header páginas internas
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  // Secciones
  seccion:     { paddingHorizontal: 40, paddingTop: 32 },
  h1:          { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.azulMedio, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.azulMedio, borderRadius: 2, marginBottom: 16, width: 60 },
  h2:          { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  h3:          { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.gris, marginBottom: 4, marginTop: 10 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  pSub:        { fontSize: 9, color: C.gris, lineHeight: 1.5, marginBottom: 4 },
  // Cajas
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: "#fefce8", borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  // Lista
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.azulMedio, fontFamily: "Helvetica-Bold", fontSize: 12 },
  liTxt:       { flex: 1, fontSize: 10, color: C.negro, lineHeight: 1.5 },
  // Módulo chip
  modulo:      { backgroundColor: C.grisClaro, borderRadius: 6, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.grisBorde },
  moduloTit:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  moduloSub:   { fontSize: 9, color: C.gris, lineHeight: 1.5 },
  // Tabla
  tabla:       { borderWidth: 1, borderColor: C.grisBorde, borderRadius: 6, overflow: "hidden", marginVertical: 8 },
  tablaHead:   { flexDirection: "row", backgroundColor: C.grisClaro, paddingVertical: 6, paddingHorizontal: 10 },
  tablaHCell:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gris, textTransform: "uppercase" },
  tablaRow:    { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.grisClaro },
  tablaCell:   { fontSize: 9, color: C.negro },
  // Matriz de roles (checkmarks)
  matriz:         { borderWidth: 1, borderColor: C.grisBorde, borderRadius: 6, overflow: "hidden", marginVertical: 8 },
  matrizHead:     { flexDirection: "row", backgroundColor: C.grisClaro, paddingVertical: 9, paddingHorizontal: 10, alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.grisBorde },
  matrizHCellFunc:{ flex: 3, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gris, textTransform: "uppercase" },
  matrizHCellRol: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center", textTransform: "uppercase" },
  matrizRow:      { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.grisClaro, alignItems: "center" },
  matrizFuncCell: { flex: 3, fontSize: 9, color: C.negro, lineHeight: 1.4, paddingRight: 8 },
  matrizRolCell:  { flex: 1, alignItems: "center", justifyContent: "center" },
  matrizCheck:    { width: 16, height: 16, borderRadius: 8, backgroundColor: C.verdeClarito, alignItems: "center", justifyContent: "center" },
  matrizCheckTxt: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.verde },
  matrizDash:     { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#cbd5e1" },
  // Footer
  footer:      { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.grisBorde, paddingTop: 6 },
  footerTxt:   { fontSize: 7, color: C.gris },
  // Separador
  sep:         { height: 1, backgroundColor: C.grisBorde, marginVertical: 16, marginHorizontal: 40 },
  // Paso numerado
  paso:        { flexDirection: "row", marginBottom: 10, gap: 10 },
  pasoNum:     { width: 22, height: 22, backgroundColor: C.azulMedio, borderRadius: 11, alignItems: "center", justifyContent: "center", shrink: 0 },
  pasoNumTxt:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blanco },
  pasoBody:    { flex: 1 },
  pasoTit:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  pasoTxt:     { fontSize: 9, color: C.gris, lineHeight: 1.5 },
  // Badge estado
  badge:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  badgeTxt:    { fontSize: 8, fontFamily: "Helvetica-Bold" },
});

function PageHeader() {
  return React.createElement(View, { style: s.pageHeader, fixed: true },
    React.createElement(Image, { style: s.pageHeaderLogo, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
    React.createElement(Image, { style: s.pageHeaderFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
  );
}

function Footer({ numero }: { numero: number }) {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Usuario v1.18"),
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
function H3({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(Text, { style: s.h3 }, children),
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
function RolCheck({ activo }: { activo: boolean }) {
  return React.createElement(View, { style: s.matrizRolCell },
    activo
      ? React.createElement(View, { style: s.matrizCheck }, React.createElement(Text, { style: [s.matrizCheckTxt, { fontSize: 7 }] }, "SI"))
      : React.createElement(Text, { style: s.matrizDash }, "–"),
  );
}
function MatrizRoles({ filas }: { filas: [string, boolean, boolean, boolean][] }) {
  const roles: [string, string][] = [["Comercial", C.gris], ["Gerente", C.azulMedio], ["Administrador", C.azul]];
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.matriz, wrap: false },
      React.createElement(View, { style: s.matrizHead },
        React.createElement(Text, { style: s.matrizHCellFunc }, "Funcionalidad"),
        ...roles.map(([nombre, color]) => React.createElement(Text, { key: nombre, style: [s.matrizHCellRol, { color }] }, nombre)),
      ),
      ...filas.map(([funcionalidad, comercial, gerente, administrador], i) =>
        React.createElement(View, { key: funcionalidad, style: [s.matrizRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
          React.createElement(Text, { style: s.matrizFuncCell }, funcionalidad),
          React.createElement(RolCheck, { activo: comercial }),
          React.createElement(RolCheck, { activo: gerente }),
          React.createElement(RolCheck, { activo: administrador }),
        ),
      ),
    ),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const doc = React.createElement(Document,
    { title: "Manual de Usuario — Evoluteca CRM", author: "Evoluteca", subject: "Guía de uso del CRM" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        // Franja blanca con logos — FUERA del azul
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        // Bloque azul que ocupa el resto de la página
        React.createElement(View, { style: s.portadaAzul },
        React.createElement(Text, { style: s.portadaTit }, "Evoluteca CRM"),
        React.createElement(Text, { style: s.portadaSub }, "Manual de Usuario — Guía completa"),
        React.createElement(View, { style: { marginTop: 60 } },
          React.createElement(Text, { style: { fontSize: 11, color: "#93c5fd", marginBottom: 6 } }, "Contenido de este manual:"),
          ...[
            "1. Primeros pasos y configuración",
            "2. Gestión de clientes y contactos",
            "3. Pipeline de ventas",
            "4. Agenda y actividades",
            "5. Cotizaciones formales",
            "6. Importación de datos desde Excel",
            "7. Reportes y metas",
            "8. Dashboard — alertas, salud comercial y productividad",
            "9. Configuración, equipo y perfiles",
            "10. Preguntas frecuentes",
          ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#cbd5e1", marginBottom: 3 } }, item)),
        ),
        React.createElement(View, { style: { marginTop: 40 } },
          React.createElement(Text, { style: s.portadaVer }, `Versión 1.18 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
        ),
        ), // cierre portadaAzul
      ),   // cierre portada
    ),     // cierre Page

    // ── CAPÍTULO 1: PRIMEROS PASOS ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 2 }),
      React.createElement(H1, null, "1. Primeros pasos"),
      React.createElement(P, null, "Evoluteca CRM es una herramienta diseñada para que pequeñas y medianas empresas gestionen sus clientes, oportunidades de venta y actividades comerciales desde un solo lugar. El dashboard principal muestra un resumen ejecutivo con banner de bienvenida, KPIs en tiempo real, pipeline visual, actividades del día, funciones próximas y accesos rápidos a las acciones más frecuentes."),

      React.createElement(H2, null, "1.1 Acceso inicial"),
      React.createElement(Paso, { n: 1, titulo: "Recibir tus credenciales", desc: "Tu asesor Evoluteca activa la cuenta de tu empresa y te envía tu correo y una contraseña temporal para ingresar a crm.evoluteca.com." }),
      React.createElement(Paso, { n: 2, titulo: "Primer ingreso", desc: "Ve a crm.evoluteca.com e inicia sesión con las credenciales que recibiste. Te recomendamos cambiar tu contraseña desde Mi perfil apenas entres." }),
      React.createElement(Paso, { n: 3, titulo: "Guía de inicio", desc: "Busca la Guía de inicio en el menú lateral. Te llevará paso a paso a importar datos, crear tu primer cliente o explorar el pipeline." }),
      React.createElement(Paso, { n: 4, titulo: "Configuración inicial", desc: "Si eres Administrador, ve a Configuración para personalizar el nombre de tu empresa y activar módulos opcionales como Funciones y Audiencia." }),

      React.createElement(Tip, null, "Puedes volver a la Guía de inicio en cualquier momento desde el menú lateral haciendo clic en Guía de inicio."),
      React.createElement(Nota, null, "El registro de cuentas nuevas no es autoservicio: solo tu asesor Evoluteca puede activar una empresa nueva en la plataforma."),

      React.createElement(H2, null, "1.2 Olvidé mi contraseña"),
      React.createElement(P, null, 'En la pantalla de inicio de sesión encontrarás el enlace "¿Olvidaste tu contraseña?". Al hacer clic, ingresa tu correo y recibirás un email con un enlace para restablecerla. El enlace es válido por 1 hora.'),
      React.createElement(Nota, null, "El administrador de tu organización también puede restablecer la contraseña de cualquier usuario desde el panel de Equipo, sin necesidad de email."),

      React.createElement(H2, null, "1.3 Navegación general"),
      React.createElement(P, null, "El menú lateral izquierdo contiene todos los módulos del CRM. El módulo activo se resalta en azul. Puedes navegar entre módulos en cualquier momento sin perder tu trabajo."),
      React.createElement(P, null, "En dispositivos móviles el menú lateral se oculta. Toca el ícono de menú (tres líneas) en la barra superior para abrirlo como panel deslizante. Toca fuera del panel o la × para cerrarlo."),
      React.createElement(Tip, null, "El CRM está optimizado para móvil. Puedes gestionar clientes, pipeline y agenda desde tu teléfono sin perder funcionalidad."),

      React.createElement(H2, null, "1.4 Uso desde el celular"),
      React.createElement(P, null, "En dispositivos móviles el CRM activa automáticamente una interfaz adaptada:"),
      React.createElement(LI, null, "Barra de navegación inferior — acceso rápido a Dashboard, Clientes, Pipeline, Agenda y Cotizaciones con un solo toque"),
      React.createElement(LI, null, "Botón flotante + (azul, esquina inferior derecha) — abre un menú con acciones rápidas: nueva actividad, nuevo cliente, nueva cotización y ver pipeline"),
      React.createElement(LI, null, "Contenido con margen inferior para que la barra no tape el contenido"),
      React.createElement(Tip, null, "El botón + se convierte en × al abrirse. Toca fuera del menú o toca × para cerrarlo sin navegar."),

      React.createElement(H2, null, "1.5 Base de ayuda dentro del sistema"),
      React.createElement(P, null, "Ve a Ayuda / Soporte en el menú lateral. La página abre con un buscador de preguntas frecuentes agrupadas por módulo (Primeros pasos, Pipeline, Cotizaciones, Reportes, Configuración, etc.) — escribe cualquier palabra clave, con o sin tildes, y haz clic en una pregunta para desplegar la respuesta."),
      React.createElement(Tip, null, "Si tu duda no está en la base de ayuda, debajo del buscador sigue disponible el formulario para reportar un error o enviar una sugerencia directamente al equipo de Evoluteca."),

      React.createElement(View, { style: { paddingHorizontal: 40 } },
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHead },
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "Módulo"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 3 }] }, "Para qué sirve"),
          ),
          ...[
            ["Dashboard",        "Resumen ejecutivo: alertas, actividades del día, salud comercial y productividad"],
            ["Clientes",          "Empresas y cuentas que gestionas. Cada cliente tiene su ficha 360°"],
            ["Contactos",         "Personas dentro de cada cliente. Vinculados a empresa, oportunidades y actividades"],
            ["Pipeline",          "Oportunidades de venta con indicadores de urgencia por color y drag & drop"],
            ["Agenda",            "Actividades: llamadas, reuniones, tareas y correos con fechas"],
            ["Cotizaciones",       "Vista de oportunidades activas con filtros por etapa y antigüedad"],
            ["Nueva cotización",   "Documentos formales con desglose de servicios, precios y total"],
            ["Catálogo",           "Servicios o productos reutilizables para crear cotizaciones más rápido"],
            ["Reportes",           "KPIs de ventas, embudo de conversión, top clientes y metas"],
            ["Datos",              "Importar bases de datos desde Excel, exportar cotizaciones"],
            ["Configuración",     "Nombre del tenant, módulos opcionales, configuraciones del sistema"],
            ["Mi perfil",          "Actualiza tu nombre, correo y contraseña personal"],
          ].map(([mod, desc], i) => React.createElement(View, { key: mod, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, mod),
            React.createElement(Text, { style: [s.tablaCell, { flex: 3 }] }, desc),
          )),
        ),
      ),

      React.createElement(H2, null, "1.6 Búsqueda global"),
      React.createElement(P, null, "En la parte superior del menú lateral hay un buscador (\"Buscar...\") que consulta toda tu organización en un solo lugar. Escribe al menos 2 letras y el sistema muestra, mientras tecleas, coincidencias en todos los tipos de registro a la vez:"),
      React.createElement(LI, null, "Clientes (empresas)"),
      React.createElement(LI, null, "Contactos (personas)"),
      React.createElement(LI, null, "Oportunidades del pipeline"),
      React.createElement(LI, null, "Cotizaciones"),
      React.createElement(LI, null, "Actividades de la agenda"),
      React.createElement(P, null, "Haz clic en cualquier resultado para ir directo a su ficha. La lupa junto a cada resultado indica de qué tipo es. Toca la × del buscador para limpiar el texto y cerrar los resultados."),
      React.createElement(Tip, null, "Es la forma más rápida de abrir un cliente o una cotización sin recorrer el listado: escribe parte del nombre y salta directo. El buscador respeta tus permisos — solo encuentra registros que tu rol puede ver."),

      React.createElement(H2, null, "1.7 Personalizar el orden del menú"),
      React.createElement(P, null, "Puedes reordenar los módulos del menú lateral para dejar arriba los que más usas. Junto al título \"Menú\" hay un botón \"Ordenar\":"),
      React.createElement(Paso, { n: 1, titulo: "Activar el modo ordenar", desc: "Haz clic en \"Ordenar\". Cada módulo muestra un ícono de puntos (agarradera) a la izquierda." }),
      React.createElement(Paso, { n: 2, titulo: "Arrastrar y soltar", desc: "Arrastra cada módulo a la posición que prefieras. El nuevo orden se guarda automáticamente en tu perfil." }),
      React.createElement(Paso, { n: 3, titulo: "Terminar", desc: "Haz clic en \"Listo\" para volver a la navegación normal. Con el botón \"Restablecer\" vuelves al orden original en cualquier momento." }),
      React.createElement(Nota, null, "El orden del menú es personal de cada usuario — no afecta a tus compañeros. Si se activa un módulo nuevo (por ejemplo Funciones o Salones), aparece automáticamente al final de tu menú sin alterar el orden que ya definiste."),

    ),

    // ── CAPÍTULO 2: CLIENTES Y CONTACTOS ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 3 }),
      React.createElement(H1, null, "2. Clientes y contactos"),

      React.createElement(H2, null, "2.1 Crear un cliente"),
      React.createElement(P, null, 'Ve a Clientes, botón "+ Nuevo cliente". Ingresa el nombre de la empresa (obligatorio) y opcionalmente email, teléfono, sector, sitio web y notas.'),
      React.createElement(Tip, null, "El sector ayuda a filtrar y segmentar clientes en reportes. Elige el más cercano a la actividad del cliente."),

      React.createElement(H2, null, "2.2 Ficha 360° del cliente"),
      React.createElement(P, null, "Haz clic en cualquier cliente para abrir su ficha completa. Verás:"),
      React.createElement(LI, null, "Datos generales (editable con botón Editar)"),
      React.createElement(LI, null, "Contactos vinculados con botón directo a WhatsApp si tienen teléfono"),
      React.createElement(LI, null, "Oportunidades de venta y su etapa actual"),
      React.createElement(LI, null, "Actividades registradas y opción de crear nuevas"),
      React.createElement(LI, null, "Cotizaciones formales emitidas con totales"),
      React.createElement(LI, null, "Timeline 360°: historial cronológico de todas las interacciones"),

      React.createElement(H2, null, "2.3 Acciones rápidas desde la ficha"),
      React.createElement(P, null, "En la sección de Actividades dentro de la ficha del cliente encontrarás tres botones de acción rápida: Llamada, Email y Reunión. Al hacer clic en cualquiera de ellos, el formulario de actividad se abre de inmediato con ese tipo pre-seleccionado, sin necesidad de ir a la Agenda."),
      React.createElement(Tip, null, "Registra una llamada en segundos: abre la ficha del cliente, clic en el botón Llamada, escribe el resumen y Guardar. Mucho más rápido que ir a la Agenda y seleccionar el cliente manualmente."),

      React.createElement(H2, null, "2.4 Timeline 360°"),
      React.createElement(P, null, "El timeline unifica en orden cronológico: actividades, oportunidades, cotizaciones y eventos manuales. Puedes registrar:"),
      React.createElement(LI, null, "NOTA: observaciones o recordatorios libres"),
      React.createElement(LI, null, "LLAMADA: resumen de una conversación telefónica"),
      React.createElement(LI, null, "EMAIL: registro de un correo enviado o recibido"),
      React.createElement(LI, null, "REUNION: acta o resumen de una reunión"),
      React.createElement(LI, null, "WHATSAPP: resumen de conversación por WhatsApp"),
      React.createElement(Tip, null, "Para eliminar un evento del timeline, pasa el cursor sobre él y haz clic en la × que aparece a la derecha."),

      React.createElement(H2, null, "2.5 Contactos"),
      React.createElement(P, null, 'Los contactos son personas dentro de un cliente. Ve a Contactos, "+ Nuevo contacto". Puedes vincular el contacto a una empresa y asignarle cargo, email y teléfono.'),
      React.createElement(P, null, "Si el contacto tiene teléfono, aparecerá un botón verde WhatsApp que abre la conversación directamente con ese número."),
      React.createElement(Nota, null, "Un contacto puede existir sin empresa (contacto independiente). También puede estar vinculado a múltiples oportunidades."),

      React.createElement(H2, null, "2.6 WhatsApp con plantillas"),
      React.createElement(P, null, "En las fichas de contacto y cliente, el botón WhatsApp abre un panel con plantillas de mensaje pre-llenadas. Elige la plantilla, edita el texto si quieres, y haz clic en 'Abrir WhatsApp' para enviar directamente desde tu app."),
      React.createElement(LI, null, "Saludo inicial — presentación general para primer contacto"),
      React.createElement(LI, null, "Seguimiento cotización — recordatorio amable sobre una propuesta enviada"),
      React.createElement(LI, null, "Confirmar reunión — verificación de fecha y hora de una reunión"),
      React.createElement(LI, null, "Recordatorio evento — mensaje previo a la fecha del evento"),
      React.createElement(LI, null, "Cierre de negocio — impulso final para cerrar una oportunidad"),
      React.createElement(LI, null, "Mensaje libre — escribe tu propio mensaje desde cero"),
      React.createElement(Tip, null, "Todas las plantillas incluyen el nombre del contacto automáticamente. Puedes editar el texto antes de enviarlo — el mensaje nunca se envía sin que lo veas primero."),

      React.createElement(H2, null, "2.7 Notas rápidas"),
      React.createElement(P, null, "En las fichas de cliente, contacto y oportunidad verás un área de notas internas. Haz clic en el texto (o en el área vacía si no hay notas) para activar la edición. Escribe tu nota y presiona Ctrl+Enter para guardar, o Esc para cancelar."),
      React.createElement(LI, null, "El botón Guardar también guarda la nota"),
      React.createElement(LI, null, "Al guardar aparece un mensaje 'Guardado' por 2 segundos"),
      React.createElement(LI, null, "Las notas son internas — no se muestran al cliente"),
      React.createElement(Tip, null, "Usa las notas rápidas para registrar contexto importante sobre el cliente o negocio: preferencias, restricciones de presupuesto, fechas clave, contactos adicionales."),

      React.createElement(H2, null, "2.8 Papelera"),
      React.createElement(P, null, 'Al eliminar un Cliente, Contacto, Oportunidad o Cotización, el registro no se borra de inmediato: se mueve a la Papelera (en el menú lateral), donde queda disponible para restaurarlo o eliminarlo definitivamente. La Papelera tiene una sección separada para cada uno de los cuatro tipos de registro.'),
      React.createElement(LI, null, "Restaurar — el registro vuelve a aparecer en su listado normal (Clientes, Contactos, Pipeline o Cotizaciones), con todos sus datos e historial intactos"),
      React.createElement(LI, null, "Eliminar definitivamente — borra el registro de forma permanente y no se puede deshacer"),
      React.createElement(Nota, null, "Solo Administrador y Gerente pueden eliminar y restaurar registros; el borrado definitivo es exclusivo del Administrador. La Papelera es por organización: cada empresa ve únicamente lo que ella misma eliminó."),
      React.createElement(Tip, null, "Si eliminaste algo por error, ve a Papelera antes de eliminarlo definitivamente — restaurarlo desde ahí es inmediato y no requiere volver a crearlo ni perder su historial."),

      React.createElement(H2, null, "2.9 Archivos adjuntos"),
      React.createElement(P, null, "En la ficha de un Cliente, un Contacto o una Oportunidad encontrarás la sección \"Archivos adjuntos\", donde puedes subir contratos, cédulas, fotos del evento, cotizaciones firmadas o cualquier otro documento relacionado, directamente desde tu computador."),
      React.createElement(LI, null, "Subir — botón \"+ Subir archivo\", elige el archivo desde tu equipo (máximo 5MB por archivo)"),
      React.createElement(LI, null, "Descargar — ícono de descarga junto a cada archivo de la lista"),
      React.createElement(LI, null, "Eliminar — ícono de papelera junto a cada archivo; pide confirmación antes de borrar"),
      React.createElement(P, null, "Cada archivo queda vinculado a un único registro (el cliente, contacto u oportunidad desde donde lo subiste) — no es necesario elegir dónde guardarlo ni organizarlo en carpetas."),
      React.createElement(Nota, null, "Los archivos se guardan de forma segura dentro del CRM, no en un servicio externo. No se comparten entre organizaciones distintas."),

      React.createElement(H2, null, "2.10 Resumen con IA"),
      React.createElement(P, null, "En la ficha de cada cliente encontrarás el panel \"Resumen con IA\". Al hacer clic en \"Generar resumen\", el CRM analiza toda la información de esa cuenta (contactos, oportunidades abiertas/ganadas/perdidas, actividades, cotizaciones y su estado) junto con métricas ya calculadas (valor ya ganado, valor en juego, tasa de conversión, cotizaciones vencidas, días desde la última interacción) y redacta en segundos un informe accionable. El texto va apareciendo a medida que se escribe."),
      React.createElement(P, null, "El informe trae seis secciones:"),
      React.createElement(LI, null, "Panorama de la cuenta — antigüedad de la relación, sector, valor ya ganado, valor en juego y recurrencia"),
      React.createElement(LI, null, "Relación y actividad — hace cuánto fue la última interacción y tareas pendientes o vencidas"),
      React.createElement(LI, null, "Oportunidades y cotizaciones — negocios abiertos con su etapa y probabilidad, y el estado de las cotizaciones (enviadas, aceptadas, vencidas)"),
      React.createElement(LI, null, "Señales — riesgos (inactividad, cotizaciones sin respuesta, negocios perdidos y su motivo) u oportunidades (recompra, negocios calientes)"),
      React.createElement(LI, null, "Contactos clave — con quién conviene hablar y quién parece decidir, según los cargos"),
      React.createElement(LI, null, "Próximas acciones — 2 o 3 gestiones concretas y priorizadas para ese cliente"),
      React.createElement(P, null, "Puedes volver a pulsar \"Regenerar\" para obtener una nueva versión con los datos más recientes. El panel muestra tu consumo del mes (por ejemplo \"12 / 100 este mes\")."),
      React.createElement(Nota, null, "Los Resúmenes con IA dependen del plan de tu organización: pueden ser ilimitados o tener un tope mensual. Ese cupo mensual es compartido con el Brief del pipeline con IA (ver 3.12): ambas funciones descuentan del mismo contador. Si tu plan no las incluye, o si ya alcanzaste el tope del mes, el botón aparece deshabilitado con el aviso correspondiente. Escríbenos para ampliar tu plan."),
      React.createElement(Tip, null, "Úsalo antes de una llamada o reunión para ponerte al día de una cuenta en 5 segundos sin tener que leer todo el historial. El informe se apoya solo en los datos reales del CRM — no inventa cifras."),

      React.createElement(H2, null, "2.11 Editar y eliminar desde las listas"),
      React.createElement(P, null, "No necesitas abrir la ficha completa para corregir o eliminar un registro. En las listas de Clientes, Contactos y Cotizaciones, cada fila tiene dos botones de acción rápida:"),
      React.createElement(LI, null, "Editar (ícono de lápiz) — abre una ventana para modificar los datos del registro sin salir del listado. Al guardar, la lista se actualiza al instante."),
      React.createElement(LI, null, "Eliminar (ícono de papelera) — pide confirmación y mueve el registro a la Papelera (ver 2.8), desde donde puedes restaurarlo."),
      React.createElement(Nota, null, "El botón Eliminar solo aparece para los roles con permiso (Administrador y Gerente). Al igual que en las fichas, eliminar desde la lista no borra el registro de inmediato: lo envía a la Papelera."),
    ),

    // ── CAPÍTULO 3: PIPELINE ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 4 }),
      React.createElement(H1, null, "3. Pipeline de ventas"),
      React.createElement(P, null, "El pipeline organiza visualmente las oportunidades de venta por etapa comercial. Cada tarjeta representa una oportunidad con cliente, valor y fecha."),

      React.createElement(H2, null, "3.1 Etapas del pipeline"),
      React.createElement(View, { style: { paddingHorizontal: 40 } },
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHead },
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "Etapa"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 3 }] }, "Significado"),
          ),
          ...[
            ["Prospecto",    "Lead identificado, aún sin calificar"],
            ["Calificado",   "Confirmado como cliente potencial real con necesidad y presupuesto"],
            ["Cotización",   "Se ha presentado una propuesta o cotización formal"],
            ["Negociación",  "En proceso de ajuste de condiciones, precios o alcance"],
            ["Ganada",       "Negocio cerrado exitosamente"],
            ["Perdida",      "No se cerró el negocio (competencia, presupuesto, timing, etc.)"],
          ].map(([etapa, desc], i) => React.createElement(View, { key: etapa, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, etapa),
            React.createElement(Text, { style: [s.tablaCell, { flex: 3 }] }, desc),
          )),
        ),
      ),
      React.createElement(Tip, null, "El nombre visible de cada etapa se puede personalizar (y el orden de las columnas, reordenar) desde Configuración > Etapas del pipeline — ver 9.5. El significado de fondo (activa, ganada o perdida) no cambia, solo cómo se ve en pantalla."),

      React.createElement(H2, null, "3.2 Crear una oportunidad"),
      React.createElement(P, null, 'Las oportunidades se crean desde la ficha de un cliente (pestaña Oportunidades), al vincular una cotización formal a un negocio, o con el botón "+ Nueva" del campo Oportunidad vinculada en Nueva cotización. El pipeline es la vista de gestión: arrastra las tarjetas entre etapas para actualizar el avance.'),
      React.createElement(Tip, null, "El valor de la oportunidad es fundamental para los reportes. Ingrésalo siempre aunque sea estimado."),
      React.createElement(Tip, null, "El título de la oportunidad debe describir el tipo de negocio (ej: \"Congreso anual\", \"Alquiler sala\", \"Función privada\"), no el nombre del cliente — el cliente ya queda registrado en el campo Empresa. Repetirlo en el título solo genera texto redundante en el pipeline y los reportes."),

      React.createElement(H2, null, "3.3 Indicadores de urgencia"),
      React.createElement(P, null, "Cada tarjeta del kanban muestra un borde de color en su lado izquierdo que indica la antigüedad de la oportunidad desde que fue creada:"),
      React.createElement(LI, null, "Verde — Menos de 15 días: oportunidad reciente, sin urgencia"),
      React.createElement(LI, null, "Amarillo — Entre 15 y 30 días: requiere seguimiento pronto"),
      React.createElement(LI, null, "Rojo — Más de 30 días: oportunidad estancada, acción urgente"),
      React.createElement(P, null, "Además, en la esquina inferior derecha de cada tarjeta aparece un badge con el número de días (ej: '22d'). Las oportunidades en etapa Ganada o Perdida no muestran indicador."),
      React.createElement(Tip, null, "Usa los colores para priorizar tu día: comienza por las tarjetas rojas."),

      React.createElement(H2, null, "3.4 Drag & Drop"),
      React.createElement(P, null, "Arrastra cualquier tarjeta de una columna a otra para cambiar su etapa. El cambio se guarda automáticamente. También puedes cambiar la etapa desde la ficha de la oportunidad."),

      React.createElement(H2, null, "3.5 Motivo de pérdida"),
      React.createElement(P, null, "Cuando muevas una oportunidad a la etapa Perdida — ya sea arrastrando la tarjeta en el kanban o cambiando la etapa desde la ficha de la oportunidad — el sistema muestra automáticamente un modal para registrar el motivo antes de completar el cambio. Opciones disponibles:"),
      React.createElement(LI, null, "Precio muy alto"),
      React.createElement(LI, null, "Eligió a la competencia"),
      React.createElement(LI, null, "El evento fue cancelado"),
      React.createElement(LI, null, "Sin respuesta del cliente"),
      React.createElement(LI, null, "Presupuesto insuficiente"),
      React.createElement(LI, null, "Fuera de fechas disponibles"),
      React.createElement(LI, null, "Otro — permite escribir un motivo personalizado"),
      React.createElement(P, null, "El motivo queda guardado como un dato propio de la oportunidad (no como texto dentro de las notas) y se muestra en rojo bajo el título en la ficha de la oportunidad, y junto a la oportunidad en la lista de \"Oportunidades\" de la ficha del cliente y del contacto. Este dato alimenta el desglose \"Motivos de pérdida\" en Reportes (ver 7.8) para analizar patrones de pérdida por período."),
      React.createElement(Nota, null, "Si cancelas el modal sin elegir un motivo, la oportunidad no se mueve a Perdida — el cambio de etapa solo se confirma junto con el motivo."),

      React.createElement(H2, null, "3.6 Ficha de oportunidad"),
      React.createElement(P, null, "Haz clic en el título de una oportunidad para abrir su ficha. Desde allí puedes:"),
      React.createElement(LI, null, "Editar todos los datos de la oportunidad"),
      React.createElement(LI, null, "Cambiar la etapa con un clic"),
      React.createElement(LI, null, "Crear actividades vinculadas a esta oportunidad"),
      React.createElement(LI, null, "Ver y crear cotizaciones formales asociadas"),
      React.createElement(LI, null, "Registrar notas internas con edición rápida"),

      React.createElement(H2, null, "3.7 Vista tabla del pipeline"),
      React.createElement(P, null, "Además del kanban, el pipeline tiene una vista de tabla. Usa el toggle Kanban / Tabla en la barra de filtros para cambiar entre vistas. La vista tabla muestra todas las oportunidades en filas con columnas ordenables:"),
      React.createElement(LI, null, "Oportunidad, empresa, etapa, valor, probabilidad, fecha de cierre"),
      React.createElement(LI, null, "Haz clic en el encabezado de cualquier columna para ordenar ascendente/descendente"),
      React.createElement(LI, null, "Combina el filtro de etapa con el orden para analizar oportunidades específicas"),
      React.createElement(Tip, null, "Usa la vista tabla cuando necesitas comparar valores o fechas entre múltiples oportunidades. El kanban es mejor para mover etapas visualmente."),

      React.createElement(H2, null, "3.8 Historial de etapas"),
      React.createElement(P, null, "Cada oportunidad registra automáticamente cada cambio de etapa. En la ficha de la oportunidad, el panel 'Historial de etapas' muestra una línea de tiempo con:"),
      React.createElement(LI, null, "Etapa anterior a etapa nueva"),
      React.createElement(LI, null, "Fecha y hora del cambio"),
      React.createElement(LI, null, "Días que estuvo en la etapa anterior"),
      React.createElement(LI, null, "Usuario que realizó el cambio"),
      React.createElement(Tip, null, "El historial de etapas es automático — no requiere ninguna acción del usuario. Se registra cada vez que se cambia la etapa, ya sea desde el kanban o desde la ficha."),

      React.createElement(H2, null, "3.9 Filtro por vendedor"),
      React.createElement(P, null, "Administrador y Gerente ven en la barra de filtros del Pipeline un selector adicional \"Vendedor\" que no aparece para el rol Comercial (que ya está limitado a ver únicamente sus propios negocios). Al elegir un vendedor, tanto el kanban como la vista de tabla se filtran para mostrar solo las oportunidades creadas por esa persona."),
      React.createElement(Tip, null, "Úsalo en la reunión de ventas semanal para revisar el pipeline de un vendedor específico sin que las tarjetas de todo el equipo se mezclen."),

      React.createElement(H2, null, "3.10 Archivos adjuntos"),
      React.createElement(P, null, "En la ficha de cualquier oportunidad (y también en la de Clientes y Contactos) hay una sección \"Archivos adjuntos\" para subir contratos, cotizaciones firmadas, fotos u otros documentos relacionados con ese negocio. Ver el detalle completo en 2.9."),

      React.createElement(H2, null, "3.11 Número de cotización al avanzar de etapa"),
      React.createElement(P, null, "Al mover una oportunidad desde Prospecto o Calificado hacia cualquier otra etapa (excepto Perdida) — ya sea arrastrando la tarjeta o cambiando la etapa desde la ficha — el sistema pregunta opcionalmente el número de cotización asociado a ese negocio."),
      React.createElement(Nota, null, "Es completamente opcional: si dejas el campo vacío o cancelas, la oportunidad avanza de etapa igual. El número, si lo ingresas, queda guardado junto con los demás datos adicionales de la oportunidad y se puede consultar y buscar más adelante."),

      React.createElement(H2, null, "3.12 Brief del pipeline con IA"),
      React.createElement(P, null, "En la parte superior del Pipeline encontrarás el panel \"Brief del pipeline con IA\". Al hacer clic en \"Generar brief\", el CRM analiza todo el pipeline (o solo el tuyo, según tu rol) y produce en segundos un resumen ejecutivo para la reunión de ventas. El texto va apareciendo a medida que se escribe."),
      React.createElement(P, null, "El brief trae cinco secciones:"),
      React.createElement(LI, null, "Panorama — tamaño del pipeline abierto, valor total y valor ponderado por probabilidad, y dónde se concentra"),
      React.createElement(LI, null, "Calientes — los negocios con mayor probabilidad de cierre próximo"),
      React.createElement(LI, null, "En riesgo — negocios estancados (muchos días en la misma etapa), inactividad o patrones de pérdida reciente"),
      React.createElement(LI, null, "Meta — avance del mes contra el objetivo y si el pipeline alcanza para cerrar la brecha"),
      React.createElement(LI, null, "Prioridades de la semana — 2 o 3 acciones concretas para estos datos"),
      React.createElement(Nota, null, "Respeta los permisos por rol: un COMERCIAL ve solo su propio pipeline y su meta; el Gerente y el Administrador ven todo el equipo. Usa los nombres de etapa personalizados de tu organización. Comparte el mismo cupo mensual de IA con el Resumen con IA de cliente (ver 2.10)."),
      React.createElement(Tip, null, "Genéralo antes del stand-up o la reunión semanal para llegar con el panorama, los riesgos y las prioridades ya listos, sin armarlos a mano."),
    ),

    // ── CAPÍTULO 4: AGENDA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 5 }),
      React.createElement(H1, null, "4. Agenda y actividades"),
      React.createElement(P, null, "La agenda centraliza todas las actividades comerciales: llamadas, reuniones, tareas y correos. Cada actividad puede vincularse a un cliente, contacto y/o oportunidad."),

      React.createElement(H2, null, "4.1 Tipos de actividad"),
      React.createElement(LI, null, "LLAMADA — Llamada telefónica programada o realizada"),
      React.createElement(LI, null, "REUNIÓN — Reunión presencial o virtual"),
      React.createElement(LI, null, "TAREA — Acción interna (preparar propuesta, enviar info, etc.)"),
      React.createElement(LI, null, "EMAIL — Seguimiento por correo electrónico"),
      React.createElement(LI, null, "VISITA COMERCIAL — Visita al espacio con fines de venta (recorrido, cotización en sitio)"),
      React.createElement(LI, null, "VISITA TÉCNICA — Visita de coordinación técnica del evento (montaje, sonido, requerimientos)"),
      React.createElement(Nota, null, "Los tipos Visita comercial y Visita técnica solo aparecen en el selector de tenants con el módulo Funciones o Salones activo (vertical de teatros y alquiler de espacios). En los demás tenants no se muestran."),

      React.createElement(H2, null, "4.2 Crear una actividad"),
      React.createElement(P, null, 'Desde la Agenda haz clic en "+ Nueva actividad". También puedes crear actividades directamente desde la ficha de un cliente, contacto u oportunidad usando el formulario inline.'),

      React.createElement(H2, null, "4.3 Marcar como completada"),
      React.createElement(P, null, 'Marca el checkbox junto a la actividad para marcarla como completada. Las actividades completadas se muestran tachadas. Usa el filtro "Solo pendientes" para enfocarte en lo que falta.'),

      React.createElement(H2, null, "4.4 Notificaciones por email"),
      React.createElement(P, null, "Cada mañana a las 8am el CRM envía automáticamente hasta 3 tipos de alertas por email:"),
      React.createElement(LI, null, "Actividades vencidas: tareas o llamadas pendientes con días de atraso (rojo 7d o más, ámbar 2d o más)"),
      React.createElement(LI, null, "Negocios estancados: oportunidades activas sin ninguna actividad registrada en más de 14 días"),
      React.createElement(LI, null, "Cierres próximos: negocios con fecha de cierre estimada en los próximos 7 días"),
      React.createElement(P, null, "Además, en la Agenda las actividades vencidas muestran un ícono de campana. Al tocarlo recibes el recordatorio inmediatamente sin esperar al día siguiente."),
      React.createElement(Tip, null, "Solo recibirás el email de cada tipo si tienes situaciones reales en esa categoría. Si no tienes actividades vencidas, ese email no se envía."),

      React.createElement(H2, null, "4.5 Lista o Calendario"),
      React.createElement(P, null, "En la parte superior de la Agenda hay un selector \"Lista / Calendario\" para cambiar cómo ves tus actividades."),
      React.createElement(LI, null, "Lista: muestra las actividades según el filtro activo (Pendientes, Todas o Vencidas), una debajo de otra. Es la vista más rápida para marcar actividades como completadas o eliminarlas."),
      React.createElement(LI, null, "Calendario: muestra el mes completo en cuadrícula. Cada día con actividades tiene un punto de color según el tipo (rojo si alguna de ese día está vencida). Haz clic en cualquier día para abrir un panel debajo del calendario con el detalle de sus actividades, donde también puedes completarlas o eliminarlas."),
      React.createElement(Tip, null, "Usa Calendario para ver de un vistazo cómo se distribuye tu carga del mes; usa Lista cuando quieras despachar tareas una por una con los filtros de Pendientes, Todas o Vencidas."),

      React.createElement(H2, null, "4.6 Exportar al calendario (iCal)"),
      React.createElement(P, null, "Haz clic en el botón iCal en la parte superior de la Agenda para descargar todas tus actividades pendientes como archivo .ics. Este archivo es compatible con:"),
      React.createElement(LI, null, "Google Calendar, importar desde Configuración > Importar"),
      React.createElement(LI, null, "Apple Calendar (iPhone / Mac), abre directamente al descargar"),
      React.createElement(LI, null, "Microsoft Outlook, Archivo > Abrir e importar"),
      React.createElement(P, null, "Cada actividad se exporta con título, tipo, fecha y hora, nombre del cliente y oportunidad vinculada. La duración por defecto es 1 hora."),
      React.createElement(Tip, null, "Descarga el .ics cada vez que quieras sincronizar — no es una sincronización automática en tiempo real, es una fotografía de tus actividades pendientes en ese momento."),

      React.createElement(H2, null, "4.7 Actividades de hoy resaltadas en rojo"),
      React.createElement(P, null, "En la vista de lista de la Agenda, cualquier actividad pendiente cuya fecha sea el día de hoy se resalta con fondo y borde rojo y una etiqueta \"Hoy\", para que no se pierda entre el resto de actividades pasadas o futuras. El mismo resaltado se usa en la tarjeta \"Actividades de hoy\" del Dashboard (ver 8.7)."),

      React.createElement(H2, null, "4.8 Estado y responsable de la actividad"),
      React.createElement(P, null, "Además de completarla, cada actividad tiene un estado que puedes cambiar en el formulario o directamente desde la lista:"),
      React.createElement(LI, null, "Pendiente — aún no iniciada (badge gris)"),
      React.createElement(LI, null, "En progreso — se está trabajando en ella (badge ámbar)"),
      React.createElement(LI, null, "Completada — terminada (badge verde); equivale a marcar el checkbox de completada"),
      React.createElement(P, null, "El campo \"Responsable\" permite asignar la actividad a otra persona del equipo en vez de a ti mismo. Por defecto queda a tu nombre (\"Yo mismo\"); en el selector puedes elegir a cualquier miembro del equipo para delegarla."),
      React.createElement(Tip, null, "El estado \"En progreso\" es útil para tareas que toman varios días (preparar una propuesta grande, coordinar un evento): ves de un vistazo qué está arrancado y qué sigue sin tocar, sin tener que marcarlo como completado antes de tiempo."),
    ),

    // ── CAPÍTULO 5: COTIZACIONES ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 6 }),
      React.createElement(H1, null, "5. Cotizaciones formales"),
      React.createElement(P, null, "Las cotizaciones formales son documentos con desglose detallado de servicios, cantidades, precios unitarios y total. Se generan en PDF listas para enviar al cliente."),

      React.createElement(H2, null, "5.1 Crear una cotización"),
      React.createElement(Paso, { n: 1, titulo: "Ir a Nueva cotización", desc: 'En el menú lateral haz clic en "Nueva cotización" o usa el botón "+ Nueva cotización" desde la pestaña Cotizaciones.' }),
      React.createElement(Paso, { n: 2, titulo: "Seleccionar cliente", desc: "Para Cliente, Contacto y Oportunidad vinculada verás dos botones: Existente y + Nuevo. Usa Existente para elegir de la lista un cliente ya registrado (incluso si ya lo has cotizado antes); usa + Nuevo para crearlo sin salir del formulario." }),
      React.createElement(Paso, { n: 3, titulo: "Detalles del evento", desc: "Ingresa la sede o lugar, la fecha del evento y la fecha de validez de la cotización." }),
      React.createElement(Paso, { n: 4, titulo: "Agregar ítems", desc: 'Escribe cada servicio en la tabla de líneas: descripción, cantidad y precio unitario. Usa el selector "Agregar servicio del catálogo" para cargar ítems predefinidos automáticamente.' }),
      React.createElement(Paso, { n: 5, titulo: "Impuestos y total", desc: "Si aplica, escribe el nombre y porcentaje del impuesto (ej: IVA 19%). Puedes agregar hasta dos impuestos (por ejemplo IVA y un cargo por servicio). El sistema calcula automáticamente el desglose de Subtotal, cada impuesto y Total." }),
      React.createElement(Paso, { n: 6, titulo: "Guardar y descargar", desc: 'Haz clic en "Guardar como borrador". Luego desde el detalle puedes cambiar el estado y descargar el PDF.' }),

      React.createElement(H2, null, "5.2 Cliente, contacto y oportunidad: existente o nuevo"),
      React.createElement(P, null, "Cada uno de los tres campos del bloque \"Cliente y oportunidad\" tiene su propia casilla separada con dos modos, para que nunca tengas que elegir entre cotizar a alguien nuevo o a alguien que ya conoces:"),
      React.createElement(LI, null, "Existente — despliega la lista de registros ya creados en tu CRM. Úsalo también para cotizar de nuevo a un cliente al que ya le has hecho cotizaciones antes."),
      React.createElement(LI, null, "+ Nuevo — abre un mini-formulario para crear el registro sin salir de la pantalla. Para Cliente solo el nombre es obligatorio; para Contacto, el nombre; para Oportunidad, el título."),
      React.createElement(P, null, "Al crear un Contacto o una Oportunidad nuevos, quedan vinculados automáticamente al Cliente que tengas seleccionado (o creado) en ese momento. Haz clic en \"Crear cliente\" / \"Crear contacto\" / \"Crear oportunidad\" para confirmarlo — el formulario vuelve solo al modo Existente con el registro recién creado ya seleccionado."),
      React.createElement(Nota, null, "El cliente, contacto u oportunidad que crees aquí queda guardado de inmediato en el CRM, aunque después decidas no guardar la cotización. Podrás encontrarlo luego en Clientes, Contactos o Pipeline."),
      React.createElement(Tip, null, "Si escribes datos en un mini-formulario \"+ Nuevo\" pero olvidas hacer clic en Crear antes de guardar la cotización, el sistema te avisa y no deja continuar — así nunca se pierde por accidente lo que empezaste a escribir."),

      React.createElement(H2, null, "5.3 Estados de una cotización"),
      React.createElement(LI, null, "BORRADOR — Recién creada, aún no enviada al cliente"),
      React.createElement(LI, null, "ENVIADA — El cliente ya la recibió"),
      React.createElement(LI, null, "ACEPTADA — Cliente aprobó la cotización"),
      React.createElement(LI, null, "RECHAZADA — Cliente no aceptó. Puede reabrirse como borrador"),
      React.createElement(P, null, "Desde el detalle de la cotización cambias el estado con los botones de arriba. Desde Borrador puedes \"Marcar enviada\", o ir directo a \"Marcar aceptada\" / \"Marcar rechazada\" — útil cuando el cliente acepta por teléfono y nunca se envió el PDF formalmente."),
      React.createElement(Nota, null, "Al marcar una cotización como Aceptada, su negocio en el Pipeline pasa automáticamente a la etapa \"Ganada\" (la cotización es la base del pipeline). Rechazar una cotización NO mueve el negocio, porque a menudo se recotiza y el negocio sigue vivo."),

      React.createElement(H2, null, "5.4 La cotización siembra el Pipeline"),
      React.createElement(P, null, "La cotización es la base del pipeline: al guardar una cotización que no vinculaste a una oportunidad existente, el sistema crea automáticamente un negocio en el Pipeline en la etapa \"Cotización\", con el mismo cliente, salón, fecha y valor. Así toda cotización aparece como un negocio sin que tengas que crearlo aparte."),
      React.createElement(P, null, "En el detalle de la cotización, el campo \"Negocio (Pipeline)\" muestra el nombre del negocio con una flecha (→): haz clic para ir directo a esa tarjeta en el Kanban del Pipeline y seguir su avance."),

      React.createElement(H2, null, "5.5 Recotizaciones y versiones"),
      React.createElement(P, null, "Un mismo negocio puede tener varias cotizaciones (por ejemplo, cuando ajustas el precio tras negociar). Para recotizar, crea una nueva cotización vinculada a la misma oportunidad, o usa el botón \"Duplicar\" desde el detalle. La versión más reciente queda como la vigente y las anteriores se marcan solas con un badge gris \"Reemplazada\"."),
      React.createElement(LI, null, "En el Pipeline el negocio aparece una sola vez, no una por cada versión — el embudo no se infla con recotizaciones."),
      React.createElement(LI, null, "Las cotizaciones \"Reemplazada\" no cuentan en los totales ni en las alertas de vencimiento, pero siguen visibles (atenuadas) para conservar el historial."),
      React.createElement(Nota, null, "Si aceptas cualquier versión, esa se vuelve la vigente aunque no sea la más reciente, y su negocio pasa a Ganada."),

      React.createElement(H2, null, "5.6 Impuestos y desglose del total"),
      React.createElement(P, null, "Junto a la tabla de ítems puedes definir hasta dos impuestos, cada uno con su nombre (por defecto \"IVA\", editable a cualquier texto — ej: un cargo por servicio) y su porcentaje. El sistema calcula automáticamente:"),
      React.createElement(LI, null, "Subtotal — suma de todas las líneas de servicio (cantidad × precio unitario)"),
      React.createElement(LI, null, "Cada impuesto — el porcentaje que ingresaste aplicado sobre el subtotal"),
      React.createElement(LI, null, "Total — subtotal más los impuestos"),
      React.createElement(P, null, "Si dejas un porcentaje en 0 o vacío, ese impuesto simplemente no aparece en el desglose. Puedes editar los impuestos en cualquier momento desde el detalle de la cotización, incluso después de guardarla, con el enlace \"Editar impuestos\" junto a la tabla de ítems."),
      React.createElement(Tip, null, "El desglose de Subtotal / Impuestos / Total se muestra también en el PDF descargable, en el email enviado al cliente y en el link público de la cotización — no necesitas repetir la configuración en cada lugar."),

      React.createElement(H2, null, "5.7 Descargar PDF"),
      React.createElement(P, null, 'Desde el detalle de cualquier cotización, haz clic en el botón "Descargar PDF". El PDF incluye el logo de tu empresa (si lo configuraste en Configuración), datos del cliente y contacto, tabla de ítems, desglose de impuestos y total, y notas.'),
      React.createElement(Tip, null, "El PDF se genera automáticamente con el estado actual de la cotización. Si haces cambios, descarga de nuevo para obtener la versión actualizada."),

      React.createElement(H2, null, "5.8 Enviar la cotización por email"),
      React.createElement(P, null, 'Desde el detalle de la cotización, haz clic en "Enviar email" para abrir un panel con un campo de correo editable. Viene pre-llenado con el email del contacto vinculado (si tiene), pero puedes cambiarlo por cualquier otra dirección antes de enviar — útil cuando quien recibe la cotización no es el contacto principal registrado en el CRM.'),
      React.createElement(P, null, "El correo incluye el PDF de la cotización como adjunto. También puedes generar un \"Link cliente\" — una URL pública de solo lectura que puedes compartir por cualquier canal (WhatsApp, mensaje directo) sin necesidad de enviar un correo."),

      React.createElement(H2, null, "5.9 Catálogo de servicios"),
      React.createElement(P, null, 'Ve a Catálogo para crear servicios reutilizables con nombre, descripción y precio base. Al crear una cotización, aparece el selector "Agregar servicio del catálogo" que carga los datos automáticamente en una nueva línea.'),
      React.createElement(P, null, 'Puedes cargar varios servicios de una sola vez: con "+ Agregar otra línea" añades tantas filas como necesites en el formulario, cada una con su nombre, descripción y precio, y con "Agregar al catálogo" se guardan todas juntas. Usa "Quitar línea" para descartar una fila antes de guardar.'),
      React.createElement(Nota, null, "El precio del catálogo es un precio base. Puedes modificarlo libremente en cada cotización sin afectar el catálogo."),

      React.createElement(H2, null, "5.10 Fecha de validez y alertas de vencimiento"),
      React.createElement(P, null, "Cada cotización puede tener una fecha de validez. El sistema monitorea automáticamente las cotizaciones en estado BORRADOR o ENVIADA y muestra alertas cuando están próximas a vencer o ya vencidas:"),
      React.createElement(LI, null, "Badge rojo 'Vencida Xd' — la fecha de validez ya pasó"),
      React.createElement(LI, null, "Badge rojo 'Vence hoy' — vence el día de hoy"),
      React.createElement(LI, null, "Badge ámbar 'Vence en Xd' — vence en 7 días o menos"),
      React.createElement(P, null, "En la propia lista de Cotizaciones aparece una franja roja de alerta con el número de cotizaciones vencidas o próximas a vencer, y un botón \"Ver vencidas\" que filtra el listado para mostrar solo esas. También en el dashboard principal el panel de alertas muestra ese conteo y enlaza a la lista."),
      React.createElement(Tip, null, "Cuando una cotización es ACEPTADA o RECHAZADA, los badges de vencimiento desaparecen — el estado definitivo ya no requiere seguimiento de validez."),

      React.createElement(H2, null, "5.11 Plantillas de cotización"),
      React.createElement(P, null, 'Ve a Plantillas para guardar combinaciones completas de ítems que usas seguido (por ejemplo, un paquete de servicios para un tipo de evento) y reutilizarlas en segundos al armar una cotización nueva.'),
      React.createElement(Paso, { n: 1, titulo: "Crear una plantilla", desc: 'En Plantillas, botón "+ Nueva plantilla". Dale un nombre y agrega tantas líneas como necesites (descripción, cantidad, precio unitario) — igual que en el formulario de una cotización.' }),
      React.createElement(Paso, { n: 2, titulo: "Editar una plantilla", desc: 'Botón "Editar" sobre cualquier plantilla de la lista. Puedes cambiar el nombre y modificar, agregar o quitar cualquier línea de ítems — no solo renombrarla. Al guardar, la lista de ítems de la plantilla se reemplaza por completo con lo que dejaste en el formulario.' }),
      React.createElement(Paso, { n: 3, titulo: "Usar una plantilla en una cotización", desc: 'Desde una cotización existente, el botón "Guardar plantilla" también te permite crear una plantilla nueva a partir de los ítems que ya cargaste.' }),
      React.createElement(Nota, null, "Editar o eliminar una plantilla no afecta las cotizaciones que ya se crearon a partir de ella — cada cotización guarda su propia copia de los ítems al momento de crearse."),

      React.createElement(H2, null, "5.12 Número propio del cliente"),
      React.createElement(P, null, "Cada cotización lleva un consecutivo automático del sistema, pero además tiene un campo opcional \"Número del cliente\" para registrar el consecutivo que use tu empresa o tu cliente (por ejemplo COT-2026-045). Lo puedes escribir al crear la cotización o editarlo después desde su detalle; si lo dejas vacío, se usa el número automático."),
      React.createElement(P, null, "Cuando ingresas un número propio, este aparece en la lista de cotizaciones, el detalle, el PDF, el correo al cliente, el mensaje de WhatsApp, la vista pública, la Papelera, el timeline, la exportación a Excel, el Dashboard y la ficha del cliente. El consecutivo automático se conserva como referencia interna."),
      React.createElement(Tip, null, "La búsqueda global (ver 1.6) también encuentra cotizaciones por el número del cliente, no solo por el automático."),

      React.createElement(H2, null, "5.13 Separador de miles en los campos de dinero"),
      React.createElement(P, null, "Todos los campos de dinero del CRM (precios de cotización, catálogo, plantillas, valor de oportunidades, funciones, metas y reportes) muestran el separador de miles en formato colombiano mientras escribes (por ejemplo, 1.500.000), para que sea más fácil verificar cifras grandes sin contar ceros. El valor se guarda como número, sin los puntos."),
    ),

    // ── CAPÍTULO 6: IMPORTACIÓN ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 7 }),
      React.createElement(H1, null, "6. Importación de datos desde Excel"),
      React.createElement(P, null, "Si tienes una base de datos en Excel, puedes importarla directamente al CRM. El sistema crea automáticamente empresas, contactos y oportunidades vinculados entre sí."),

      React.createElement(H2, null, "6.1 Preparar el archivo Excel"),
      React.createElement(P, null, "El archivo debe tener una fila de encabezados en la primera fila. No es necesario un formato específico: el sistema te permite asignar qué columna corresponde a cada campo del CRM."),
      React.createElement(LI, null, "Campos obligatorios: al menos una columna de empresa (cliente)"),
      React.createElement(LI, null, "Campos recomendados: contacto, oportunidad/negocio, valor, etapa"),
      React.createElement(LI, null, "Columnas adicionales: se guardan automáticamente como datos extras"),
      React.createElement(Nota, null, "Las columnas con valores inconsistentes (mezcla de texto y números) se importan como texto. Puedes limpiarlas después."),

      React.createElement(H2, null, "6.2 Proceso de importación"),
      React.createElement(Paso, { n: 1, titulo: "Subir archivo", desc: "Ve a Datos > Importar. Arrastra el archivo Excel o haz clic para seleccionarlo. Solo se aceptan archivos .xlsx." }),
      React.createElement(Paso, { n: 2, titulo: "Mapear columnas", desc: "El sistema muestra todas las columnas del Excel con una muestra real de los datos. Para cada campo del CRM (empresa, contacto, oportunidad), selecciona qué columna del Excel corresponde." }),
      React.createElement(Paso, { n: 3, titulo: "Verificar y confirmar", desc: "Revisa la previsualización. Los campos obligatorios (empresa, contacto, oportunidad) deben estar mapeados antes de poder importar. Haz clic en Importar." }),
      React.createElement(Paso, { n: 4, titulo: "Resultado", desc: "El sistema muestra cuántos clientes, contactos y oportunidades se crearon. Si una empresa ya existe, no se duplica — se vinculan los nuevos contactos a la existente." }),
      React.createElement(Tip, null, "Si la importación no salió como esperabas, revisa el resumen de errores, corrige el Excel y vuelve a importar. No existe una función para deshacer solo los registros de una importación puntual."),
      React.createElement(Nota, null, "Si necesitas borrar por completo los datos de tu organización para empezar de cero, el Administrador puede hacerlo desde Configuración, en la \"Zona de peligro\" (\"Limpiar todos los datos de prueba\") — pero ojo: esa acción borra TODA la información de la empresa (clientes, contactos, oportunidades, actividades, cotizaciones, funciones y espectadores), no solo lo que acabas de importar, y no se puede deshacer."),
    ),

    // ── CAPÍTULO 7: REPORTES ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 8 }),
      React.createElement(H1, null, "7. Reportes y metas"),
      React.createElement(P, null, "Los reportes muestran el desempeño comercial del equipo: valor ganado, tasa de cierre, oportunidades por etapa, top clientes y actividad mensual."),

      React.createElement(H2, null, "7.1 KPIs principales"),
      React.createElement(LI, null, "Clientes activos: total de empresas y contactos registrados"),
      React.createElement(LI, null, "En negociación: cantidad y valor potencial de oportunidades activas"),
      React.createElement(LI, null, "Valor ganado: suma total de oportunidades en etapa GANADA"),
      React.createElement(LI, null, "Tasa de cierre: % de negocios ganados vs total cerrados (ganados + perdidos)"),

      React.createElement(H2, null, "7.2 Filtros de período y vendedor"),
      React.createElement(P, null, "Puedes filtrar todos los reportes por año y/o mes. Si seleccionas un mes sin haber elegido un año, el sistema automáticamente usa el año más reciente disponible."),
      React.createElement(P, null, "Administrador y Gerente ven además un filtro \"Vendedor\" para consolidar los reportes de una sola persona del equipo (no visible para el rol Comercial, que ya solo ve sus propios datos)."),
      React.createElement(Tip, null, "El embudo de conversión y el top de clientes se actualizan con los filtros activos. Combínalos para analizar el desempeño de un vendedor en un período específico."),

      React.createElement(H2, null, "7.3 Gráfica mensual"),
      React.createElement(P, null, "La gráfica de barras muestra el valor ganado por mes del año seleccionado (o el más reciente). Las barras verdes indican valor ganado; los indicadores rojos pequeños muestran negocios perdidos en ese mes."),
      React.createElement(P, null, "Si hay una meta configurada para ese mes (o una meta anual), aparece una línea punteada amarilla indicando el objetivo, junto con el porcentaje de cumplimiento sobre cada barra. El porcentaje se colorea en verde (100% o más), ámbar (entre 60% y 99%) o rojo (menos de 60%), y puede superar el 100% si ya cumpliste la meta."),

      React.createElement(H2, null, "7.4 Metas de ventas"),
      React.createElement(P, null, 'Haz clic en "Configurar metas" dentro de la gráfica mensual para crear una meta nueva. Puedes definir:'),
      React.createElement(LI, null, "Meta anual: deja el campo Mes en blanco. Aplica a todo el año."),
      React.createElement(LI, null, "Meta mensual: elige el mes específico al que aplica la meta."),
      React.createElement(P, null, "En cuanto tengas al menos una meta guardada, la lista de metas con su barra de progreso y porcentaje se muestra siempre debajo de la gráfica — no hace falta dejar abierto el formulario de \"Configurar metas\" para verla."),

      React.createElement(H2, null, "7.5 Top clientes"),
      React.createElement(P, null, "Muestra los 5 clientes con mayor valor ganado en el período seleccionado, con barras horizontales proporcionales. Incluye cantidad de negocios ganados y total de oportunidades."),

      React.createElement(H2, null, "7.6 Comparativa por año"),
      React.createElement(P, null, "Cuando tienes datos de más de un año, esta sección compara negocios ganados, valor ganado, negocios perdidos y total de oportunidades año contra año. Cada mini-gráfica incluye:"),
      React.createElement(LI, null, "Un badge de variación (subiendo o bajando, con el porcentaje) comparando el último año contra el anterior"),
      React.createElement(LI, null, "El año en curso marcado con borde punteado y una nota indicando que es un año incompleto, para no compararlo 1 a 1 con años ya cerrados"),
      React.createElement(P, null, 'Además, si configuraste una meta anual, aparece la gráfica "Cumplimiento de meta anual": una barra azul (valor ganado) junto a una barra gris (meta) por cada año, con el porcentaje de cumplimiento arriba de cada par.'),

      React.createElement(H2, null, "7.7 Metas por vendedor"),
      React.createElement(P, null, "En el menú Equipo > Rendimiento (visible para ADMINISTRADOR y GERENTE) puedes ver el desempeño individual de cada vendedor con metas mensuales:"),
      React.createElement(LI, null, "Barra azul: valor ganado en el mes en curso"),
      React.createElement(LI, null, "Barra con progreso de meta: % alcanzado respecto a la meta mensual asignada"),
      React.createElement(LI, null, "Color de la barra: ámbar menos de 60%, azul entre 60% y 99%, verde 100% o más"),
      React.createElement(P, null, "El ADMINISTRADOR puede editar la meta de cada vendedor directamente en esa pantalla: haz clic en el ícono de lápiz junto al nombre del vendedor, ingresa el valor en COP y guarda."),
      React.createElement(Tip, null, "Las metas son por mes: asigna la meta de julio y podrás ver el progreso en tiempo real durante ese mes. Al siguiente mes la barra se reinicia."),

      React.createElement(H2, null, "7.8 Motivos de pérdida"),
      React.createElement(P, null, "Este panel muestra, para el período filtrado, una gráfica de donut con la proporción de oportunidades perdidas por cada motivo (ver 3.5), acompañada de una leyenda con el porcentaje y la cantidad de negocios de cada motivo. Las oportunidades perdidas antes de que existiera este campo, o marcadas sin elegir un motivo, se agrupan como \"Sin especificar\"."),
      React.createElement(P, null, "Junto al donut (debajo, en pantallas angostas), la sección \"Valor perdido por motivo\" muestra lo mismo pero en dinero: qué porcentaje del total de pesos perdidos corresponde a cada motivo. Cada gráfica se ordena de forma independiente por su propia métrica — el donut por cantidad de negocios, la lista por valor perdido — así que el orden de los motivos puede no coincidir entre las dos. Comparar ambas te dice si el motivo que más negocios te quita es también el que más dinero te cuesta, o si son motivos distintos."),
      React.createElement(Tip, null, "Si un motivo domina claramente el listado (por ejemplo, \"Presupuesto insuficiente\"), es una señal para revisar la estrategia de precios o el argumentario de ventas de ese período."),

      React.createElement(H2, null, "7.9 Tiempo promedio de cierre"),
      React.createElement(P, null, "En la tarjeta \"Negocios cerrados\" aparece el promedio de días que tardan tus oportunidades en pasar de creadas a Ganadas, para el período filtrado. Se calcula desde la fecha real en que cada negocio cambió a la etapa Ganada (no desde una fecha estimada), así que refleja tu ciclo de venta real."),

      React.createElement(H2, null, "7.10 Comparación mes contra mes anterior"),
      React.createElement(P, null, "Junto a la gráfica \"Actividad mensual\" aparece un indicador con la variación del valor ganado del mes más reciente contra el mes inmediatamente anterior (por ejemplo, +20% vs Jun). La comparación puede cruzar de un año a otro — enero se compara contra diciembre del año anterior."),

      React.createElement(H2, null, "7.11 Filtro por segmento y sede"),
      React.createElement(P, null, "Si tu base de datos tiene información de segmento o sede/zona (por ejemplo, cargada por importación de Excel), en la barra de filtros de Reportes aparecen selectores adicionales \"Segmento\" y \"Sede\" para acotar todos los reportes a esa información. Si ningún registro tiene esos datos, los selectores simplemente no aparecen."),
    ),

    // ── CAPÍTULO 8: DASHBOARD ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 9 }),
      React.createElement(H1, null, "8. Dashboard — Tablero gerencial One Page"),
      React.createElement(P, null, "El Dashboard es la pantalla principal del CRM. Funciona como un tablero de control gerencial que concentra en una sola página el estado completo de la operación comercial: meta del mes, KPIs clave, ranking de vendedores, oportunidades calientes y alertas de salud comercial."),

      React.createElement(H2, null, "8.1 Meta del mes y meta del año — Gauges circulares"),
      React.createElement(P, null, "En la parte superior del Dashboard hay dos medidores circulares (gauges): Meta del mes y Meta del año. Cada uno muestra el porcentaje alcanzado de su meta respectiva, calculado sobre los negocios cerrados como GANADOS versus el valor objetivo configurado en COP. Solo aparecen si tienes una meta configurada de ese tipo (mensual o anual) para el período correspondiente."),
      React.createElement(LI, null, "Rojo: menos del 60% de la meta alcanzada"),
      React.createElement(LI, null, "Ámbar: entre 60% y 99%"),
      React.createElement(LI, null, "Verde: 100% o más — meta alcanzada o superada"),
      React.createElement(P, null, "Debajo de cada gauge, en la tarjeta 'Resumen del año', también puedes ver el valor exacto ganado y la meta en pesos."),
      React.createElement(Tip, null, "Configura la meta mensual o anual desde el módulo Reportes, botón Configurar metas. Deja el campo Mes en blanco para que sea una meta anual. Sin meta configurada, el gauge correspondiente no aparece."),

      React.createElement(H2, null, "8.2 KPIs principales"),
      React.createElement(View, { style: { paddingHorizontal: 40 } },
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHead },
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "KPI"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 3 }] }, "Qué mide"),
          ),
          ...[
            ["Empresas",           "Clientes registrados, con enlace directo al listado de Clientes."],
            ["Contactos",          "Personas en tu red, vinculadas a las empresas."],
            ["Oportunidades",      "Oportunidades activas en el pipeline (no cerradas)."],
            ["Tareas pendientes",  "Actividades sin completar; el subtítulo indica cuántas son de hoy."],
            ["Salud comercial",    "Puntaje de 0 a 100 que resume la salud del pipeline (ver 8.6)."],
          ].map(([kpi, desc], i) => React.createElement(View, { key: kpi, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, kpi),
            React.createElement(Text, { style: [s.tablaCell, { flex: 3 }] }, desc),
          )),
        ),
      ),
      React.createElement(Nota, null, "El banner superior del Dashboard, aparte, muestra \"Meta del mes\" y \"Meta del año\" (ver 8.1), y las cifras de \"Ganado este mes\", \"Pipeline activo\" y \"Tasa de cierre\"."),

      React.createElement(H2, null, "8.3 Rendimiento del equipo"),
      React.createElement(P, null, "Muestra el ranking de vendedores del equipo ordenados por valor ganado en el mes. Incluye para cada vendedor: número de oportunidades activas, tasa de cierre, valor ganado en el mes y valor total en pipeline. Debajo del ranking, una barra muestra el total ganado por el equipo contra la meta del mes."),
      React.createElement(Tip, null, "Es útil para la reunión de ventas semanal: identifica quién tiene más oportunidades en juego y quién va más avanzado hacia su meta mensual."),

      React.createElement(H2, null, "8.4 Oportunidades calientes"),
      React.createElement(P, null, "Lista las 5 oportunidades de mayor valor actualmente activas (no cerradas). Son los negocios de mayor impacto potencial si se cierran en el mes. Se muestran con empresa, etapa y valor."),

      React.createElement(H2, null, "8.5 Últimas ganadas"),
      React.createElement(P, null, "Registro de los negocios cerrados como GANADOS en el mes actual. Buen indicador del momentum del equipo y del ritmo de cierre."),

      React.createElement(H2, null, "8.6 Salud comercial"),
      React.createElement(P, null, "Puntaje de 0 a 100 que resume qué tan sano está el pipeline del equipo, con una barra de progreso y una lista de 5 factores que lo componen: seguimiento activo, tasa de cierre, tareas vencidas, negocios estancados y movimiento del pipeline."),
      React.createElement(Tip, null, "Úsalo como termómetro rápido en la reunión semanal: un puntaje bajo señala en cuál de los 5 factores hay que poner atención primero."),

      React.createElement(H2, null, "8.7 Actividades de hoy"),
      React.createElement(P, null, "La tarjeta \"Actividades de hoy\" está en la primera fila del Dashboard, junto a Pipeline y Oportunidades calientes, para que lo más urgente del día quede visible de inmediato al entrar. Cada actividad pendiente de hoy se muestra resaltada en rojo, igual que en la Agenda (ver 4.7). Rendimiento del equipo (ver 8.3) pasa a la segunda fila."),

      React.createElement(H2, null, "8.8 Panel de alertas (\"Requieren atención\")"),
      React.createElement(P, null, "Reúne las situaciones que necesitan seguimiento: actividades vencidas, negocios sin actividad reciente, cierres previstos para esta semana, cotizaciones enviadas sin respuesta y, si el tenant tiene los módulos correspondientes activos, plazos procesales próximos a vencer o funciones con ocupación baja."),
      React.createElement(Tip, null, "El objetivo diario es llegar al Dashboard sin alertas pendientes en este panel."),
    ),

    // ── CAPÍTULO 9: CONFIGURACIÓN ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, { numero: 10 }),
      React.createElement(H1, null, "9. Configuración, equipo y perfiles"),

      React.createElement(H2, null, "9.1 Configuración general"),
      React.createElement(P, null, 'Ve a Configuración. Desde allí puedes cambiar el nombre de tu empresa (aparece en el sidebar y en los PDFs de cotizaciones).'),
      React.createElement(P, null, "También puedes configurar el logo de tu empresa: en la sección \"Logo de la empresa\" haz clic para elegir un archivo de imagen (PNG o JPG) desde tu computador — no necesitas subirlo a ningún sitio externo ni tener una URL pública. El logo aparecerá automáticamente en el encabezado de todas tus cotizaciones en PDF en lugar del ícono genérico."),
      React.createElement(Tip, null, "El archivo de logo debe pesar máximo 2MB. Si tu imagen es más pesada, redúcela antes de subirla (herramientas de compresión de imágenes en línea funcionan bien para esto)."),

      React.createElement(H2, null, "9.1.1 Notificaciones automáticas por email"),
      React.createElement(P, null, "En Configuración encontrarás el toggle 'Notificaciones automáticas por email'. Cuando está activo (azul), el CRM envía cada mañana correos automáticos a cada usuario del equipo con:"),
      React.createElement(LI, null, "Actividades vencidas sin completar"),
      React.createElement(LI, null, "Negocios estancados (sin actividad por más de 14 días)"),
      React.createElement(LI, null, "Cierres estimados en los próximos 7 días"),
      React.createElement(P, null, "Al desactivar el toggle, ningún usuario de la empresa recibe estos correos. Solo el ADMINISTRADOR puede cambiar esta configuración."),
      React.createElement(Nota, null, "Recomendamos mantener los emails activos. Son el recordatorio diario que evita que los negocios se pierdan por falta de seguimiento."),

      React.createElement(H2, null, "9.2 Módulos opcionales"),
      React.createElement(P, null, "Algunos módulos están desactivados por defecto ya que son específicos para ciertos tipos de negocio. Cada uno agrega su propia opción en el menú lateral cuando lo activas:"),
      React.createElement(LI, null, "Funciones: para empresas de teatro o espectáculos. Gestiona funciones con aforo, boletería y NPS de asistentes"),
      React.createElement(LI, null, "Audiencia: gestión de espectadores con segmentación por tipo (individual, grupo, empresa, colegio)"),
      React.createElement(LI, null, "Expedientes: para firmas de abogados y servicios profesionales. Gestiona casos con bitácora, registro de horas, plazos procesales y control de conflictos de interés"),
      React.createElement(LI, null, "Salones: para alquiler de espacios y eventos. Catálogo de salones, calendario de reservas con arrastrar y soltar, control de choques de fecha y tabla de alquileres por día"),
      React.createElement(P, null, "Activa o desactiva estos módulos según tu tipo de negocio desde la sección Configuración > Módulos. Cada vertical cuenta además con un anexo específico descargable desde la Guía de inicio."),

      React.createElement(H2, null, "9.3 Gestión del equipo y roles"),
      React.createElement(P, null, 'Ve a Equipo para ver los usuarios de tu organización. El Administrador puede crear nuevos miembros y asignarles uno de tres roles. Esto es lo que puede hacer cada uno:'),
      React.createElement(MatrizRoles, { filas: [
        ["Ver y gestionar sus propios clientes, oportunidades y actividades", true, true, true],
        ["Ver clientes, oportunidades y actividades de todo el equipo",        false, true, true],
        ["Ver reportes y forecast consolidado del equipo",                    false, true, true],
        ["Eliminar clientes, contactos, oportunidades o cotizaciones",        false, true, true],
        ["Editar metas de vendedores",                                       false, true, true],
        ["Configurar el CRM (logo, módulos opcionales, emails automáticos)",  false, false, true],
        ["Invitar y editar usuarios del equipo",                             false, false, true],
        ["Reasignar registros importados sin dueño",                        false, false, true],
        ["Limpiar datos de prueba (zona de peligro)",                       false, false, true],
      ] }),
      React.createElement(Nota, null, "Eliminar un cliente, contacto, oportunidad o cotización no lo borra al instante: lo envía a la Papelera (ver 2.8), desde donde Administrador o Gerente pueden restaurarlo, o el Administrador eliminarlo definitivamente."),
      React.createElement(P, null, "Desde el panel de Equipo el Administrador puede:"),
      React.createElement(LI, null, "Crear nuevos usuarios con nombre, correo y contraseña inicial"),
      React.createElement(LI, null, "Ver el rol y estado de cada miembro"),
      React.createElement(LI, null, "Restablecer la contraseña de cualquier usuario"),
      React.createElement(LI, null, "Asignar registros importados sin dueño a un vendedor (ver 9.3.1)"),

      React.createElement(H3, null, "9.3.1 Asignar registros importados a un vendedor"),
      React.createElement(P, null, "Cuando importas datos desde Excel, los registros no tienen un vendedor asignado. Un usuario con rol COMERCIAL no podrá verlos hasta que le sean asignados."),
      React.createElement(P, null, "El Administrador ve al final de la página Equipo un panel ámbar 'Asignar registros sin dueño'. Pasos:"),
      React.createElement(Paso, { n: 1, titulo: "Seleccionar vendedor", desc: "En el selector desplegable elige el usuario al que quieres asignar los registros importados." }),
      React.createElement(Paso, { n: 2, titulo: "Hacer clic en Asignar", desc: "El sistema actualiza todos los clientes, oportunidades y actividades sin dueño y los asigna al vendedor elegido." }),
      React.createElement(Paso, { n: 3, titulo: "Confirmar resultado", desc: "Aparece un resumen: 'Asignados: X clientes, Y oportunidades, Z actividades'." }),
      React.createElement(Nota, null, "Solo se reasignan registros sin dueño (importados). Los registros ya asignados a otro vendedor NO se modifican."),

      React.createElement(H2, null, "9.4 Mi perfil"),
      React.createElement(P, null, 'Cada usuario puede actualizar su propia información en Mi perfil (al final del menú lateral):'),
      React.createElement(LI, null, "Cambiar nombre y correo electrónico"),
      React.createElement(LI, null, "Cambiar contraseña (requiere ingresar la contraseña actual como verificación)"),
      React.createElement(Nota, null, "Cada usuario pertenece exclusivamente a su organización. Los datos de diferentes organizaciones están completamente aislados entre sí."),

      React.createElement(H2, null, "9.5 Etapas del pipeline"),
      React.createElement(P, null, "En Configuración, sección \"Etapas del pipeline\", el Administrador puede personalizar cómo se ven las 6 etapas del Pipeline (ver 3.1) sin afectar los datos ya guardados:"),
      React.createElement(LI, null, "Renombrar — haz clic en el nombre de cualquier etapa y edítalo directamente (por ejemplo, cambiar \"Cotización\" por \"Propuesta enviada\")"),
      React.createElement(LI, null, "Reordenar — arrastra cada etapa (ícono de puntos a la izquierda) para cambiar el orden de las columnas en el kanban"),
      React.createElement(LI, null, "Ocultar — el ícono de ojo oculta una etapa del Pipeline y de Reportes cuando tu proceso de venta no la usa"),
      React.createElement(P, null, "Las etapas \"Ganada\" y \"Perdida\" nunca se pueden ocultar, porque el Dashboard, los Reportes y las alertas automáticas por correo dependen de que siempre existan. Las demás etapas solo se pueden ocultar si no tienen ninguna oportunidad asignada en ese momento — si lo intentas con oportunidades dentro, el sistema te avisa cuántas hay y no permite ocultarla."),
      React.createElement(Tip, null, "Ocultar una etapa no borra ni mueve ninguna oportunidad — solo deja de mostrarse esa columna mientras esté vacía. Puedes volver a mostrarla en cualquier momento con el mismo ícono de ojo."),

      React.createElement(H2, null, "9.6 Captura externa de leads (API)"),
      React.createElement(P, null, "En Configuración, sección \"Captura externa de leads\", el Administrador puede conectar un formulario web, WhatsApp Business o una campaña de anuncios (Meta/Google Ads) para que cada nuevo contacto interesado cree automáticamente un Cliente, un Contacto y una Oportunidad en el Pipeline (etapa Prospecto), sin que nadie tenga que digitarlo manualmente en el CRM."),
      React.createElement(Paso, { n: 1, titulo: "Generar la clave", desc: "Haz clic en \"Generar clave\". El sistema crea una clave única para tu organización y la muestra en pantalla con un botón para copiarla." }),
      React.createElement(Paso, { n: 2, titulo: "Entregar la clave a quien configure la integración", desc: "La persona que arma el formulario web o la automatización de WhatsApp/Ads necesita esa clave y la dirección del servicio (mostrada en la misma pantalla) para conectar el envío de leads." }),
      React.createElement(Paso, { n: 3, titulo: "Verificar en el Pipeline", desc: "Cada lead recibido aparece de inmediato como una oportunidad nueva en la columna Prospecto, con el cliente y contacto ya creados." }),
      React.createElement(Nota, null, "Rotar la clave (botón \"Rotar clave\") invalida la anterior de inmediato. Cualquier formulario o automatización que siga usando la clave vieja dejará de funcionar hasta que se actualice con la nueva — úsalo solo si sospechas que la clave se filtró."),
      React.createElement(Tip, null, "Si el mismo correo de cliente ya existe en tu CRM, el sistema reutiliza ese cliente en vez de duplicarlo — así un mismo lead que llena el formulario dos veces no genera registros repetidos."),

      React.createElement(Sep, null),

      React.createElement(H1, null, "10. Preguntas frecuentes"),

      React.createElement(H2, null, "¿Puedo importar el mismo archivo dos veces?"),
      React.createElement(P, null, "Sí, pero creará duplicados. Si el cliente ya existe con el mismo nombre, el sistema lo reutiliza, pero si el nombre varía (mayúsculas, espacios extra) creará uno nuevo. Limpia los datos antes de importar."),

      React.createElement(H2, null, "¿Cómo activo o desactivo las notificaciones por email?"),
      React.createElement(P, null, "Las notificaciones están activas por defecto. Si deseas desactivarlas, el Administrador puede ir a Configuración y apagar el toggle 'Notificaciones automáticas por email'. Al desactivarlo, ningún miembro del equipo recibirá los correos automáticos diarios. Para reactivarlos simplemente vuelve a encender el toggle."),

      React.createElement(H2, null, "¿El PDF de cotización incluye el logo de mi empresa?"),
      React.createElement(P, null, "Sí. Ve a Configuración, sección 'Logo de la empresa' y elige el archivo de imagen (PNG o JPG, máximo 2MB) desde tu computador. A partir de ese momento, todos los PDFs de cotización mostrarán tu logo en el encabezado."),

      React.createElement(H2, null, "¿Puedo cotizar a un cliente nuevo y a uno existente sin cambiar de pantalla?"),
      React.createElement(P, null, "Sí. En Nueva cotización, cada campo (Cliente, Contacto, Oportunidad vinculada) tiene sus propios botones Existente / + Nuevo. Puedes, por ejemplo, elegir un Cliente existente y crear al mismo tiempo un Contacto nuevo para esa empresa, todo en el mismo formulario."),

      React.createElement(H2, null, "¿Puedo exportar los datos del CRM?"),
      React.createElement(P, null, 'Sí. Todas las páginas de listado tienen un botón "Excel" en la esquina superior. Puedes exportar: Clientes, Contactos, Cotizaciones activas, Cotizaciones formales, Agenda, Equipo, Catálogo de servicios, Funciones y Audiencia.'),

      React.createElement(H2, null, "¿Qué pasa si cierro el navegador mientras creo una cotización?"),
      React.createElement(P, null, "Los datos se guardan solo al hacer clic en el botón de guardar. Si cierras antes, se perderán los datos no guardados. Guarda frecuentemente como borrador."),

      React.createElement(H2, null, "¿Qué funciones de IA tiene el CRM y qué datos usan?"),
      React.createElement(P, null, "Hay dos: el Resumen con IA en la ficha del cliente (ver 2.10), que produce un informe de seis secciones sobre una cuenta, y el Brief del pipeline con IA en la pantalla de Pipeline (ver 3.12), que produce un resumen ejecutivo de tus oportunidades abiertas. Ambas usan solo los datos reales dentro de tu CRM — no consultan información externa ni comparten tus datos con otras organizaciones. Ambas descuentan del mismo cupo mensual de IA: según tu plan puede ser ilimitado o tener un tope, visible en cada panel (por ejemplo \"12 / 100 este mes\")."),

      React.createElement(Sep, null),

      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 20 }, wrap: false },
        React.createElement(View, { style: { backgroundColor: C.azul, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Necesitas ayuda adicional?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#93c5fd", lineHeight: 1.6 } },
            "Este CRM fue desarrollado por el Equipo Evoluteca.com y felipegomezjaramillo.com.\nPlataforma: crm.evoluteca.com\n\nPara soporte técnico o nuevas funcionalidades, contacta directamente al equipo."
          ),
        ),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="manual-evoluteca-crm.pdf"',
    },
  });
}
