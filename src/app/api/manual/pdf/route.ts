import { NextResponse } from "next/server";
import {
  renderToBuffer, Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import React from "react";

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
  portada:     { backgroundColor: C.azul, flex: 1, padding: 60, justifyContent: "center" },
  portadaTit:  { fontSize: 36, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 16, color: "#93c5fd", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#64748b", borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 16 },
  logoBox:     { width: 60, height: 60, backgroundColor: "#2563eb", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  logoTxt:     { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.blanco },
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

function Footer({ numero }: { numero: number }) {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Usuario v1.0"),
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
      React.createElement(Text, { style: s.tipTxt }, `💡 ${children}`),
    ),
  );
}
function Nota({ children }: { children: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.nota },
      React.createElement(Text, { style: s.notaTxt }, `⚠️  ${children}`),
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
  const doc = React.createElement(Document,
    { title: "Manual de Usuario — Evoluteca CRM", author: "Evoluteca", subject: "Guía de uso del CRM" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.logoBox },
          React.createElement(Text, { style: s.logoTxt }, "E"),
        ),
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
            "6. Catálogo de servicios",
            "7. Importación de datos desde Excel",
            "8. Reportes y metas",
            "9. Configuración y equipo",
            "10. Preguntas frecuentes",
          ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#cbd5e1", marginBottom: 3 } }, item)),
        ),
        React.createElement(View, { style: { marginTop: 40 } },
          React.createElement(Text, { style: s.portadaVer }, `Versión 1.1 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · evoluteca-crm.vercel.app`),
        ),
      ),
    ),

    // ── CAPÍTULO 1: PRIMEROS PASOS ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(Footer, { numero: 2 }),
      React.createElement(H1, null, "1. Primeros pasos"),
      React.createElement(P, null, "Evoluteca CRM es una herramienta diseñada para que pequeñas y medianas empresas gestionen sus clientes, oportunidades de venta y actividades comerciales desde un solo lugar. El dashboard principal muestra un resumen ejecutivo con banner de bienvenida, KPIs en tiempo real, pipeline visual, actividades del día, funciones próximas y accesos rápidos a las acciones más frecuentes."),

      React.createElement(H2, null, "1.1 Crear tu cuenta"),
      React.createElement(Paso, { n: 1, titulo: "Registro", desc: 'Ve a evoluteca-crm.vercel.app y haz clic en "Crear cuenta". Ingresa el nombre de tu empresa, tu nombre, correo y contraseña.' }),
      React.createElement(Paso, { n: 2, titulo: "Guía de inicio", desc: 'Al ingresar por primera vez verás la Guía de inicio. Te llevará paso a paso a importar datos, crear tu primer cliente o explorar el pipeline.' }),
      React.createElement(Paso, { n: 3, titulo: "Configuración inicial", desc: 'Ve a Configuración (ícono ⚙️) para personalizar el nombre de tu empresa y activar módulos opcionales como Funciones y Audiencia.' }),

      React.createElement(Tip, null, "Puedes volver a la Guía de inicio en cualquier momento desde el menú lateral haciendo clic en 🚀 Guía de inicio."),

      React.createElement(H2, null, "1.2 Navegación general"),
      React.createElement(P, null, "El menú lateral izquierdo contiene todos los módulos del CRM. El módulo activo se resalta en azul. Puedes navegar entre módulos en cualquier momento sin perder tu trabajo."),

      React.createElement(View, { style: { paddingHorizontal: 40 } },
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHead },
            React.createElement(Text, { style: [s.tablaHCell, { flex: 1 }] }, "Módulo"),
            React.createElement(Text, { style: [s.tablaHCell, { flex: 3 }] }, "Para qué sirve"),
          ),
          ...[
            ["▦  Dashboard",        "Resumen rápido: clientes, actividades pendientes y oportunidades activas"],
            ["🏢 Clientes",          "Empresas y cuentas que gestionas. Cada cliente tiene su ficha 360°"],
            ["👤 Contactos",         "Personas dentro de cada cliente. Vinculados a empresa, oportunidades y actividades"],
            ["◈  Pipeline",          "Oportunidades de venta organizadas por etapa con drag & drop"],
            ["📅 Agenda",            "Actividades: llamadas, reuniones, tareas y correos con fechas"],
            ["📄 Cotizaciones",       "Vista de oportunidades activas con filtros por etapa"],
            ["📋 Nueva cotización",   "Documentos formales con desglose de servicios, precios y total"],
            ["📦 Catálogo",           "Servicios o productos reutilizables para crear cotizaciones más rápido"],
            ["📊 Reportes",           "KPIs de ventas, embudo de conversión, top clientes y metas"],
            ["📥 Datos",              "Importar bases de datos desde Excel, exportar cotizaciones"],
            ["⚙️  Configuración",     "Nombre del tenant, módulos opcionales, configuraciones del sistema"],
          ].map(([mod, desc], i) => React.createElement(View, { key: mod, style: [s.tablaRow, i % 2 === 1 ? { backgroundColor: C.grisClaro } : {}] },
            React.createElement(Text, { style: [s.tablaCell, { flex: 1, fontFamily: "Helvetica-Bold" }] }, mod),
            React.createElement(Text, { style: [s.tablaCell, { flex: 3 }] }, desc),
          )),
        ),
      ),
    ),

    // ── CAPÍTULO 2: CLIENTES Y CONTACTOS ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(Footer, { numero: 3 }),
      React.createElement(H1, null, "2. Clientes y contactos"),

      React.createElement(H2, null, "2.1 Crear un cliente"),
      React.createElement(P, null, 'Ve a Clientes → botón "+ Nuevo cliente". Ingresa el nombre de la empresa (obligatorio) y opcionalmente email, teléfono, sector, sitio web y notas.'),
      React.createElement(Tip, null, "El sector ayuda a filtrar y segmentar clientes en reportes. Elige el más cercano a la actividad del cliente."),

      React.createElement(H2, null, "2.2 Ficha 360° del cliente"),
      React.createElement(P, null, "Haz clic en cualquier cliente para abrir su ficha completa. Verás:"),
      React.createElement(LI, null, "Datos generales (editable con botón Editar)"),
      React.createElement(LI, null, "Contactos vinculados con botón directo a WhatsApp si tienen teléfono"),
      React.createElement(LI, null, "Oportunidades de venta y su etapa actual"),
      React.createElement(LI, null, "Actividades registradas y opción de crear nuevas"),
      React.createElement(LI, null, "Cotizaciones formales emitidas con totales"),
      React.createElement(LI, null, "Timeline 360°: historial cronológico de todas las interacciones"),

      React.createElement(H2, null, "2.3 Timeline 360°"),
      React.createElement(P, null, "El timeline unifica en orden cronológico: actividades, oportunidades, cotizaciones y eventos manuales. Puedes registrar:"),
      React.createElement(LI, null, "NOTA: observaciones o recordatorios libres"),
      React.createElement(LI, null, "LLAMADA: resumen de una conversación telefónica"),
      React.createElement(LI, null, "EMAIL: registro de un correo enviado o recibido"),
      React.createElement(LI, null, "REUNION: acta o resumen de una reunión"),
      React.createElement(LI, null, "WHATSAPP: resumen de conversación por WhatsApp"),
      React.createElement(Tip, null, "Para eliminar un evento del timeline, pasa el cursor sobre él y haz clic en la × que aparece a la derecha."),

      React.createElement(H2, null, "2.4 Contactos"),
      React.createElement(P, null, 'Los contactos son personas dentro de un cliente. Ve a Contactos → "+ Nuevo contacto". Puedes vincular el contacto a una empresa y asignarle cargo, email y teléfono.'),
      React.createElement(P, null, "Si el contacto tiene teléfono, aparecerá un botón verde 💬 WhatsApp que abre la conversación directamente con ese número."),
      React.createElement(Nota, null, "Un contacto puede existir sin empresa (contacto independiente). También puede estar vinculado a múltiples oportunidades."),
    ),

    // ── CAPÍTULO 3: PIPELINE ──
    React.createElement(Page, { size: "A4", style: s.page },
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
      React.createElement(P, null, 'Las oportunidades se crean desde la ficha de un cliente (pestaña Oportunidades) o al vincular una cotización formal a un negocio. El pipeline es la vista de gestión: arrastra las tarjetas entre etapas para actualizar el avance.'),
      React.createElement(Tip, null, "El valor de la oportunidad es fundamental para los reportes. Ingrésalo siempre aunque sea estimado."),

      React.createElement(H2, null, "3.3 Drag & Drop"),
      React.createElement(P, null, "Arrastra cualquier tarjeta de una columna a otra para cambiar su etapa. El cambio se guarda automáticamente. También puedes cambiar la etapa desde la ficha de la oportunidad."),

      React.createElement(H2, null, "3.4 Ficha de oportunidad"),
      React.createElement(P, null, "Haz clic en el título de una oportunidad para abrir su ficha. Desde allí puedes:"),
      React.createElement(LI, null, "Editar todos los datos de la oportunidad"),
      React.createElement(LI, null, "Cambiar la etapa con un clic"),
      React.createElement(LI, null, "Crear actividades vinculadas a esta oportunidad"),
      React.createElement(LI, null, "Ver y crear cotizaciones formales asociadas"),
      React.createElement(LI, null, "Registrar notas internas"),
    ),

    // ── CAPÍTULO 4: AGENDA ──
    React.createElement(Page, { size: "A4", style: s.page },
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

      React.createElement(Nota, null, "Las actividades vencidas (fecha pasada y sin completar) se resaltan en el dashboard como alertas. El CRM puede enviar recordatorios por email si configuras la clave RESEND_API_KEY."),

      React.createElement(H2, null, "4.4 Vista de calendario"),
      React.createElement(P, null, "La agenda muestra las actividades del mes en formato lista agrupadas por fecha. Usa los filtros de tipo y estado para encontrar rápidamente lo que buscas."),
    ),

    // ── CAPÍTULO 5: COTIZACIONES ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(Footer, { numero: 6 }),
      React.createElement(H1, null, "5. Cotizaciones formales"),
      React.createElement(P, null, "Las cotizaciones formales son documentos con desglose detallado de servicios, cantidades, precios unitarios y total. Se generan en PDF listas para enviar al cliente."),

      React.createElement(H2, null, "5.1 Crear una cotización"),
      React.createElement(Paso, { n: 1, titulo: "Ir a Nueva cotización", desc: 'En el menú lateral haz clic en "📋 Nueva cotización" o usa el botón "+ Nueva cotización" desde la pestaña Cotizaciones.' }),
      React.createElement(Paso, { n: 2, titulo: "Seleccionar cliente", desc: "Elige la empresa, el contacto y (opcionalmente) la oportunidad vinculada. Al seleccionar empresa, los contactos y oportunidades se filtran automáticamente." }),
      React.createElement(Paso, { n: 3, titulo: "Detalles del evento", desc: "Ingresa la sede o lugar, la fecha del evento y la fecha de validez de la cotización." }),
      React.createElement(Paso, { n: 4, titulo: "Agregar ítems", desc: 'Escribe cada servicio en la tabla de líneas: descripción, cantidad y precio unitario. Usa el selector "Agregar servicio del catálogo" para cargar ítems predefinidos automáticamente.' }),
      React.createElement(Paso, { n: 5, titulo: "Guardar y descargar", desc: 'Haz clic en "Guardar como borrador". Luego desde el detalle puedes cambiar el estado y descargar el PDF.' }),

      React.createElement(H2, null, "5.2 Estados de una cotización"),
      React.createElement(LI, null, "BORRADOR — Recién creada, aún no enviada al cliente"),
      React.createElement(LI, null, "ENVIADA — El cliente ya la recibió. Se activan las opciones Aceptada / Rechazada"),
      React.createElement(LI, null, "ACEPTADA — Cliente aprobó la cotización"),
      React.createElement(LI, null, "RECHAZADA — Cliente no aceptó. Puede reabrirse como borrador"),

      React.createElement(H2, null, "5.3 Descargar PDF"),
      React.createElement(P, null, 'Desde el detalle de cualquier cotización, haz clic en el botón "⬇ Descargar PDF". El PDF incluye logo, datos del cliente y contacto, tabla de ítems, total y notas.'),
      React.createElement(Tip, null, "El PDF se genera automáticamente con el estado actual de la cotización. Si haces cambios, descarga de nuevo para obtener la versión actualizada."),

      React.createElement(H2, null, "5.4 Catálogo de servicios"),
      React.createElement(P, null, 'Ve a 📦 Catálogo para crear servicios reutilizables con nombre, descripción y precio base. Al crear una cotización, aparece el selector "Agregar servicio del catálogo" que carga los datos automáticamente en una nueva línea.'),
      React.createElement(Nota, null, "El precio del catálogo es un precio base. Puedes modificarlo libremente en cada cotización sin afectar el catálogo."),
    ),

    // ── CAPÍTULO 6: IMPORTACIÓN ──
    React.createElement(Page, { size: "A4", style: s.page },
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
      React.createElement(Paso, { n: 1, titulo: "Subir archivo", desc: 'Ve a 📥 Datos → Importar. Arrastra el archivo Excel o haz clic para seleccionarlo. Solo se aceptan archivos .xlsx.' }),
      React.createElement(Paso, { n: 2, titulo: "Mapear columnas", desc: "El sistema muestra todas las columnas del Excel con una muestra real de los datos. Para cada campo del CRM (empresa, contacto, oportunidad), selecciona qué columna del Excel corresponde." }),
      React.createElement(Paso, { n: 3, titulo: "Verificar y confirmar", desc: "Revisa la previsualización. Los campos obligatorios (empresa, contacto, oportunidad) deben estar mapeados antes de poder importar. Haz clic en Importar." }),
      React.createElement(Paso, { n: 4, titulo: "Resultado", desc: "El sistema muestra cuántos clientes, contactos y oportunidades se crearon. Si una empresa ya existe, no se duplica — se vinculan los nuevos contactos a la existente." }),
      React.createElement(Tip, null, "Si la importación no salió como esperabas, puedes usar la sección Datos → Limpiar para eliminar los registros importados y volver a intentar."),
    ),

    // ── CAPÍTULO 7: REPORTES ──
    React.createElement(Page, { size: "A4", style: s.page },
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
      React.createElement(P, null, "Si hay una meta configurada, aparece una línea punteada amarilla indicando el objetivo."),

      React.createElement(H2, null, "7.4 Metas de ventas"),
      React.createElement(P, null, 'Haz clic en "🎯 Configurar metas" dentro de la gráfica mensual. Puedes definir:'),
      React.createElement(LI, null, "Meta anual: un valor objetivo para todo el año (línea en todos los meses)"),
      React.createElement(LI, null, "Meta mensual: un valor objetivo específico para un mes determinado"),
      React.createElement(P, null, "Debajo del formulario verás el progreso de cada meta con barra de porcentaje alcanzado."),

      React.createElement(H2, null, "7.5 Top clientes"),
      React.createElement(P, null, "Muestra los 5 clientes con mayor valor ganado en el período seleccionado, con barras horizontales proporcionales. Incluye cantidad de negocios ganados y total de oportunidades."),
    ),

    // ── CAPÍTULO 8: CONFIGURACIÓN ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(Footer, { numero: 9 }),
      React.createElement(H1, null, "8. Configuración y equipo"),

      React.createElement(H2, null, "8.1 Configuración general"),
      React.createElement(P, null, 'Ve a ⚙️ Configuración. Desde allí puedes cambiar el nombre de tu empresa (aparece en el sidebar y en los PDFs de cotizaciones).'),

      React.createElement(H2, null, "8.2 Módulos opcionales"),
      React.createElement(P, null, "Algunos módulos están desactivados por defecto ya que son específicos para ciertos tipos de negocio:"),
      React.createElement(LI, null, "🎭 Funciones: para empresas de teatro o espectáculos. Gestiona funciones con aforo, boletería y NPS de asistentes"),
      React.createElement(LI, null, "🎪 Audiencia: gestión de espectadores con segmentación por tipo (individual, grupo, empresa, colegio)"),
      React.createElement(P, null, "Activa o desactiva estos módulos según tu tipo de negocio desde la sección Configuración → Módulos."),

      React.createElement(H2, null, "8.3 Gestión del equipo"),
      React.createElement(P, null, 'Ve a 👥 Equipo para ver los usuarios de tu organización. Puedes invitar nuevos miembros con tres niveles de rol:'),
      React.createElement(LI, null, "ADMINISTRADOR: acceso completo, puede eliminar registros y gestionar usuarios"),
      React.createElement(LI, null, "GERENTE: acceso completo de lectura y escritura, sin eliminar"),
      React.createElement(LI, null, "COMERCIAL: puede crear y editar sus registros, sin acceso a configuración"),
      React.createElement(Nota, null, "Cada usuario pertenece exclusivamente a tu organización (tenant). Los datos de diferentes organizaciones están completamente aislados."),

      React.createElement(Sep, null),

      React.createElement(H1, null, "9. Preguntas frecuentes"),

      React.createElement(H2, null, "¿Puedo importar el mismo archivo dos veces?"),
      React.createElement(P, null, "Sí, pero creará duplicados. Si el cliente ya existe con el mismo nombre, el sistema lo reutiliza, pero si el nombre varía (mayúsculas, espacios extra) creará uno nuevo. Limpia los datos antes de importar."),

      React.createElement(H2, null, "¿Cómo activo las notificaciones por email?"),
      React.createElement(P, null, "Las notificaciones requieren configurar una clave RESEND_API_KEY en las variables de entorno. Contacta al administrador técnico de tu cuenta para activarlas."),

      React.createElement(H2, null, "¿El PDF de cotización incluye el logo de mi empresa?"),
      React.createElement(P, null, "Actualmente el PDF usa el nombre de tu empresa y el logo genérico de Evoluteca. En versiones futuras se podrá subir un logo personalizado."),

      React.createElement(H2, null, "¿Puedo exportar los datos del CRM?"),
      React.createElement(P, null, 'Sí. Todas las páginas de listado tienen un botón "⬇ Excel" en la esquina superior. Puedes exportar: Clientes, Contactos, Cotizaciones activas, Cotizaciones formales, Agenda, Equipo, Catálogo de servicios, Funciones y Audiencia.'),

      React.createElement(H2, null, "¿Qué pasa si cierro el navegador mientras creo una cotización?"),
      React.createElement(P, null, "Los datos se guardan solo al hacer clic en el botón de guardar. Si cierras antes, se perderán los datos no guardados. Guarda frecuentemente como borrador."),

      React.createElement(Sep, null),

      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 20 } },
        React.createElement(View, { style: { backgroundColor: C.azul, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Necesitas ayuda adicional?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#93c5fd", lineHeight: 1.6 } },
            "Este CRM fue desarrollado por Felipe Gómez Jaramillo.\nSitio web: felipegomezjaramillo.com\nPlataforma: evoluteca-crm.vercel.app\n\nPara soporte técnico o nuevas funcionalidades, contacta directamente al desarrollador."
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
