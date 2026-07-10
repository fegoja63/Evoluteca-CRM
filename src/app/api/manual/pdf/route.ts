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
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Usuario v1.11"),
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
          React.createElement(Text, { style: s.portadaVer }, `Versión 1.11 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
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

      React.createElement(H2, null, "2.8 Papelera de clientes y contactos"),
      React.createElement(P, null, 'Al eliminar un cliente o un contacto, el registro no se borra de inmediato: se mueve a la Papelera (ícono 🗑️ en el menú lateral), donde queda disponible para restaurarlo o eliminarlo definitivamente.'),
      React.createElement(LI, null, "Restaurar — el cliente o contacto vuelve a aparecer en su listado normal, con todos sus datos e historial intactos"),
      React.createElement(LI, null, "Eliminar definitivamente — borra el registro de forma permanente y no se puede deshacer"),
      React.createElement(Nota, null, "Solo Administrador y Gerente pueden eliminar y restaurar registros (mismo permiso que elimina hoy clientes u oportunidades). La Papelera es por organización: cada empresa ve únicamente lo que ella misma eliminó."),
      React.createElement(Tip, null, "Si eliminaste un cliente por error, ve a Papelera antes de eliminarlo definitivamente — restaurarlo desde ahí es inmediato y no requiere volver a crearlo ni perder su historial."),
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
      React.createElement(P, null, "Cuando muevas una oportunidad a la etapa Perdida, el sistema mostrará automáticamente un modal para registrar el motivo. Opciones disponibles:"),
      React.createElement(LI, null, "Precio muy alto"),
      React.createElement(LI, null, "Eligió a la competencia"),
      React.createElement(LI, null, "El evento fue cancelado"),
      React.createElement(LI, null, "Sin respuesta del cliente"),
      React.createElement(LI, null, "Presupuesto insuficiente"),
      React.createElement(LI, null, "Fuera de fechas disponibles"),
      React.createElement(LI, null, "Otro"),
      React.createElement(P, null, "El motivo queda registrado en las notas de la oportunidad y aparece en el timeline. Este dato es clave para analizar patrones de pérdida en los reportes."),

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

      React.createElement(H2, null, "4.5 Vista de calendario"),
      React.createElement(P, null, "La agenda muestra las actividades del mes en formato lista agrupadas por fecha. Usa los filtros de tipo y estado para encontrar rápidamente lo que buscas."),

      React.createElement(H2, null, "4.6 Exportar al calendario (iCal)"),
      React.createElement(P, null, "Haz clic en el botón iCal en la parte superior de la Agenda para descargar todas tus actividades pendientes como archivo .ics. Este archivo es compatible con:"),
      React.createElement(LI, null, "Google Calendar, importar desde Configuración > Importar"),
      React.createElement(LI, null, "Apple Calendar (iPhone / Mac), abre directamente al descargar"),
      React.createElement(LI, null, "Microsoft Outlook, Archivo > Abrir e importar"),
      React.createElement(P, null, "Cada actividad se exporta con título, tipo, fecha y hora, nombre del cliente y oportunidad vinculada. La duración por defecto es 1 hora."),
      React.createElement(Tip, null, "Descarga el .ics cada vez que quieras sincronizar — no es una sincronización automática en tiempo real, es una fotografía de tus actividades pendientes en ese momento."),
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
      React.createElement(Paso, { n: 5, titulo: "Impuesto y total", desc: "Si aplica, escribe el nombre del impuesto (ej: IVA) y su porcentaje. El sistema calcula automáticamente el desglose de Subtotal, Impuesto y Total." }),
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
      React.createElement(LI, null, "ENVIADA — El cliente ya la recibió. Se activan las opciones Aceptada / Rechazada"),
      React.createElement(LI, null, "ACEPTADA — Cliente aprobó la cotización"),
      React.createElement(LI, null, "RECHAZADA — Cliente no aceptó. Puede reabrirse como borrador"),

      React.createElement(H2, null, "5.4 Impuesto y desglose del total"),
      React.createElement(P, null, "Junto a la tabla de ítems encontrarás dos campos: el nombre del impuesto (por defecto \"IVA\", editable a cualquier texto) y su porcentaje. El sistema calcula automáticamente:"),
      React.createElement(LI, null, "Subtotal — suma de todas las líneas de servicio (cantidad × precio unitario)"),
      React.createElement(LI, null, "Impuesto — el porcentaje que ingresaste aplicado sobre el subtotal"),
      React.createElement(LI, null, "Total — subtotal más impuesto"),
      React.createElement(P, null, "Si dejas el porcentaje en 0 o vacío, el desglose de impuesto simplemente no aparece y el Total es igual al Subtotal. Puedes editar el impuesto en cualquier momento desde el detalle de la cotización, incluso después de guardarla, con el enlace \"Editar impuesto\" junto a la tabla de ítems."),
      React.createElement(Tip, null, "El desglose de Subtotal / Impuesto / Total se muestra también en el PDF descargable, en el email enviado al cliente y en el link público de la cotización — no necesitas repetir la configuración en cada lugar."),

      React.createElement(H2, null, "5.5 Descargar PDF"),
      React.createElement(P, null, 'Desde el detalle de cualquier cotización, haz clic en el botón "Descargar PDF". El PDF incluye el logo de tu empresa (si lo configuraste en Configuración), datos del cliente y contacto, tabla de ítems, desglose de impuesto y total, y notas.'),
      React.createElement(Tip, null, "El PDF se genera automáticamente con el estado actual de la cotización. Si haces cambios, descarga de nuevo para obtener la versión actualizada."),

      React.createElement(H2, null, "5.6 Enviar la cotización por email"),
      React.createElement(P, null, 'Desde el detalle de la cotización, haz clic en "✉ Enviar email" para abrir un panel con un campo de correo editable. Viene pre-llenado con el email del contacto vinculado (si tiene), pero puedes cambiarlo por cualquier otra dirección antes de enviar — útil cuando quien recibe la cotización no es el contacto principal registrado en el CRM.'),
      React.createElement(P, null, "El correo incluye el PDF de la cotización como adjunto. También puedes generar un \"🔗 Link cliente\" — una URL pública de solo lectura que puedes compartir por cualquier canal (WhatsApp, mensaje directo) sin necesidad de enviar un correo."),

      React.createElement(H2, null, "5.7 Catálogo de servicios"),
      React.createElement(P, null, 'Ve a Catálogo para crear servicios reutilizables con nombre, descripción y precio base. Al crear una cotización, aparece el selector "Agregar servicio del catálogo" que carga los datos automáticamente en una nueva línea.'),
      React.createElement(Nota, null, "El precio del catálogo es un precio base. Puedes modificarlo libremente en cada cotización sin afectar el catálogo."),

      React.createElement(H2, null, "5.8 Fecha de validez y alertas de vencimiento"),
      React.createElement(P, null, "Cada cotización puede tener una fecha de validez. El sistema monitorea automáticamente las cotizaciones en estado BORRADOR o ENVIADA y muestra alertas cuando están próximas a vencer o ya vencidas:"),
      React.createElement(LI, null, "Badge rojo 'Vencida Xd' — la fecha de validez ya pasó"),
      React.createElement(LI, null, "Badge rojo 'Vence hoy' — vence el día de hoy"),
      React.createElement(LI, null, "Badge ámbar 'Vence en Xd' — vence en 7 días o menos"),
      React.createElement(P, null, "En el dashboard principal aparece un bloque en el panel de alertas con el número de cotizaciones vencidas o próximas a vencer. Al hacer clic va directamente a la lista de cotizaciones."),
      React.createElement(Tip, null, "Cuando una cotización es ACEPTADA o RECHAZADA, los badges de vencimiento desaparecen — el estado definitivo ya no requiere seguimiento de validez."),

      React.createElement(H2, null, "5.9 Plantillas de cotización"),
      React.createElement(P, null, 'Ve a Plantillas para guardar combinaciones completas de ítems que usas seguido (por ejemplo, un paquete de servicios para un tipo de evento) y reutilizarlas en segundos al armar una cotización nueva.'),
      React.createElement(Paso, { n: 1, titulo: "Crear una plantilla", desc: 'En Plantillas, botón "+ Nueva plantilla". Dale un nombre y agrega tantas líneas como necesites (descripción, cantidad, precio unitario) — igual que en el formulario de una cotización.' }),
      React.createElement(Paso, { n: 2, titulo: "Editar una plantilla", desc: 'Botón "Editar" sobre cualquier plantilla de la lista. Puedes cambiar el nombre y modificar, agregar o quitar cualquier línea de ítems — no solo renombrarla. Al guardar, la lista de ítems de la plantilla se reemplaza por completo con lo que dejaste en el formulario.' }),
      React.createElement(Paso, { n: 3, titulo: "Usar una plantilla en una cotización", desc: 'Desde una cotización existente, el botón "★ Guardar plantilla" también te permite crear una plantilla nueva a partir de los ítems que ya cargaste.' }),
      React.createElement(Nota, null, "Editar o eliminar una plantilla no afecta las cotizaciones que ya se crearon a partir de ella — cada cotización guarda su propia copia de los ítems al momento de crearse."),
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
      React.createElement(Tip, null, "Si la importación no salió como esperabas, puedes usar la sección Datos > Limpiar para eliminar los registros importados y volver a intentar."),
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

      React.createElement(H2, null, "7.2 Filtros de período"),
      React.createElement(P, null, "Puedes filtrar todos los reportes por año y/o mes. Si seleccionas un mes sin haber elegido un año, el sistema automáticamente usa el año más reciente disponible."),
      React.createElement(Tip, null, "El embudo de conversión y el top de clientes se actualizan con el filtro activo. Úsalos para analizar períodos específicos."),

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
            ["Pipeline activo",    "Valor total en COP de todas las oportunidades en proceso (no cerradas)."],
            ["Forecast del mes",   "Suma de (Valor × Probabilidad) de oportunidades activas con cierre este mes."],
            ["Ganados este mes",   "Valor total de negocios cerrados como GANADOS en el mes actual."],
            ["Actividades vencidas", "Tareas, llamadas o reuniones que pasaron su fecha sin completarse."],
            ["Actividades hoy",    "Actividades programadas para el día de hoy — el foco del día."],
          ].map(([kpi, desc], i) => React.createElement(View, { key: kpi, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, kpi),
            React.createElement(Text, { style: [s.tablaCell, { flex: 3 }] }, desc),
          )),
        ),
      ),

      React.createElement(H2, null, "8.3 Ranking de vendedores"),
      React.createElement(P, null, "Muestra el top de vendedores del equipo ordenados por el valor total de sus oportunidades activas en el Pipeline. Incluye para cada vendedor: nombre, número de oportunidades activas, valor total en pipeline y valor ganado en el mes."),
      React.createElement(Tip, null, "El ranking es útil para la reunión de ventas semanal: identifica quién tiene más oportunidades en juego y quién va más avanzado hacia su meta mensual."),

      React.createElement(H2, null, "8.4 Oportunidades calientes"),
      React.createElement(P, null, "Lista las 5 oportunidades de mayor valor actualmente activas (no cerradas). Son los negocios de mayor impacto potencial si se cierran en el mes. Se muestran con empresa, etapa y valor."),

      React.createElement(H2, null, "8.5 Últimas ganadas"),
      React.createElement(P, null, "Registro de los negocios cerrados como GANADOS en el mes actual. Buen indicador del momentum del equipo y del ritmo de cierre."),

      React.createElement(H2, null, "8.6 Salud comercial"),
      React.createElement(P, null, "Panel con alertas de actividad: actividades vencidas, actividades de hoy y de esta semana. Permite identificar de un vistazo si el equipo está al día con sus compromisos. Las actividades vencidas aparecen en rojo como prioridad inmediata."),
      React.createElement(Tip, null, "El objetivo diario es llegar al Dashboard sin alertas en rojo. Cuando todas las actividades vencidas están completadas y las de hoy están al día, el semáforo está en verde."),
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
      React.createElement(P, null, "Algunos módulos están desactivados por defecto ya que son específicos para ciertos tipos de negocio:"),
      React.createElement(LI, null, "Funciones: para empresas de teatro o espectáculos. Gestiona funciones con aforo, boletería y NPS de asistentes"),
      React.createElement(LI, null, "Audiencia: gestión de espectadores con segmentación por tipo (individual, grupo, empresa, colegio)"),
      React.createElement(P, null, "Activa o desactiva estos módulos según tu tipo de negocio desde la sección Configuración > Módulos."),

      React.createElement(H2, null, "9.3 Gestión del equipo y roles"),
      React.createElement(P, null, 'Ve a Equipo para ver los usuarios de tu organización. El Administrador puede crear nuevos miembros y asignarles uno de tres roles. Esto es lo que puede hacer cada uno:'),
      React.createElement(MatrizRoles, { filas: [
        ["Ver y gestionar sus propios clientes, oportunidades y actividades", true, true, true],
        ["Ver clientes, oportunidades y actividades de todo el equipo",        false, true, true],
        ["Ver reportes y forecast consolidado del equipo",                    false, true, true],
        ["Eliminar clientes, contactos u oportunidades",                      false, true, true],
        ["Editar metas de vendedores",                                       false, true, true],
        ["Configurar el CRM (logo, módulos opcionales, emails automáticos)",  false, false, true],
        ["Invitar y editar usuarios del equipo",                             false, false, true],
        ["Reasignar registros importados sin dueño",                        false, false, true],
        ["Limpiar datos de prueba (zona de peligro)",                       false, false, true],
      ] }),
      React.createElement(Nota, null, "Eliminar un cliente o contacto no lo borra al instante: lo envía a la Papelera (ver 2.8), desde donde Administrador o Gerente pueden restaurarlo o eliminarlo definitivamente."),
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
