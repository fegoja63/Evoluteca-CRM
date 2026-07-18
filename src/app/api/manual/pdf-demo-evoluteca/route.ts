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
  verdeClaro: "#ecfdf5",
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
  portadaAmbar:{ backgroundColor: C.ambar, flex: 1, paddingHorizontal: 60, paddingTop: 50, paddingBottom: 50, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 30, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 14, color: "#fde68a", marginBottom: 30 },
  portadaVer:  { fontSize: 10, color: "#fcd34d", borderTopWidth: 1, borderTopColor: "#92400e", paddingTop: 16 },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  seccion:     { paddingHorizontal: 40, paddingTop: 28 },
  h1:          { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.ambar, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.ambar, borderRadius: 2, marginBottom: 14, width: 60 },
  h2:          { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: C.ambarClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  wow:         { backgroundColor: C.verdeClaro, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.verde },
  wowTit:      { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#065f46", marginBottom: 3 },
  wowTxt:      { fontSize: 9, color: "#047857", lineHeight: 1.5 },
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.ambar, fontFamily: "Helvetica-Bold", fontSize: 12 },
  liTxt:       { flex: 1, fontSize: 10, color: C.negro, lineHeight: 1.5 },
  checkBox:    { width: 16, fontFamily: "Helvetica-Bold", fontSize: 9, color: C.gris },
  tabla:       { borderWidth: 1, borderColor: C.grisBorde, borderRadius: 6, overflow: "hidden", marginVertical: 8, marginHorizontal: 40 },
  tablaHead:   { flexDirection: "row", backgroundColor: C.negro, paddingVertical: 6, paddingHorizontal: 8 },
  tablaHCell:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.blanco, textTransform: "uppercase" },
  tablaRow:    { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.grisClaro },
  tablaRowAlt: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.grisClaro, backgroundColor: C.grisClaro },
  tablaCell:   { fontSize: 8.5, color: C.negro },
  footer:      { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.grisBorde, paddingTop: 6 },
  footerTxt:   { fontSize: 7, color: C.gris },
  sep:         { height: 1, backgroundColor: C.grisBorde, marginVertical: 16, marginHorizontal: 40 },
  paso:        { flexDirection: "row", marginBottom: 10, gap: 10 },
  pasoNum:     { width: 22, height: 22, backgroundColor: C.ambar, borderRadius: 11, alignItems: "center", justifyContent: "center", shrink: 0 },
  pasoNumTxt:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blanco },
  pasoBody:    { flex: 1 },
  pasoTit:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 2 },
  pasoTxt:     { fontSize: 9, color: C.gris, lineHeight: 1.5 },
  pasoEsperado:{ fontSize: 8.5, color: "#047857", lineHeight: 1.4, marginTop: 3 },
  credBox:     { backgroundColor: C.negro, borderRadius: 8, padding: 16, marginVertical: 10, marginHorizontal: 40 },
  credRow:     { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#334155" },
  credLabel:   { fontSize: 9, color: "#94a3b8" },
  credValue:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.blanco },
  rolBadge:    { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 40, marginTop: 4, marginBottom: 6 },
  rolPill:     { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blanco, backgroundColor: C.ambar, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  rolSub:      { fontSize: 9, color: C.gris },
});

function PageHeader() {
  return React.createElement(View, { style: s.pageHeader, fixed: true },
    React.createElement(Image, { style: s.pageHeaderLogo, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
    React.createElement(Image, { style: s.pageHeaderFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
  );
}
function Footer() {
  return React.createElement(View, { style: s.footer, fixed: true },
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Manual de Pruebas · Cuenta Demo Evoluteca v2.1"),
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
function P({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(Text, { style: s.p }, children),
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.tip },
      React.createElement(Text, { style: s.tipTxt },
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, "Tip: "),
        children,
      ),
    ),
  );
}
function Nota({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.nota },
      React.createElement(Text, { style: s.notaTxt },
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold" } }, "Importante: "),
        children,
      ),
    ),
  );
}
function Wow({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.wow },
      React.createElement(Text, { style: s.wowTit }, titulo),
      React.createElement(Text, { style: s.wowTxt }, children),
    ),
  );
}
function LI({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.li },
      React.createElement(Text, { style: s.bullet }, "•"),
      React.createElement(Text, { style: s.liTxt }, children),
    ),
  );
}
function Check({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 } },
    React.createElement(View, { style: s.li },
      React.createElement(Text, { style: s.checkBox }, "[  ]"),
      React.createElement(Text, { style: s.liTxt }, children),
    ),
  );
}
function Paso({ n, titulo, desc, esperado }: { n: number; titulo: string; desc: string; esperado?: string }) {
  return React.createElement(View, { style: { paddingHorizontal: 40 }, wrap: false },
    React.createElement(View, { style: s.paso },
      React.createElement(View, { style: s.pasoNum },
        React.createElement(Text, { style: s.pasoNumTxt }, String(n)),
      ),
      React.createElement(View, { style: s.pasoBody },
        React.createElement(Text, { style: s.pasoTit }, titulo),
        React.createElement(Text, { style: s.pasoTxt }, desc),
        esperado
          ? React.createElement(Text, { style: s.pasoEsperado },
              React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: C.verde } }, "Deberías ver: "),
              esperado,
            )
          : null,
      ),
    ),
  );
}
function RolBadge({ pill, sub }: { pill: string; sub: string }) {
  return React.createElement(View, { style: s.rolBadge },
    React.createElement(Text, { style: s.rolPill }, pill),
    React.createElement(Text, { style: s.rolSub }, sub),
  );
}
function Sep() {
  return React.createElement(View, { style: s.sep });
}
function Credenciales() {
  const filas: [string, string][] = [
    ["URL", "crm.evoluteca.com/login"],
    ["Administrador — Laura Mendoza", "admin@demo-evoluteca.com"],
    ["Gerente — Carlos Vargas", "gerente@demo-evoluteca.com"],
    ["Comercial — Sofía Restrepo", "sofia@demo-evoluteca.com"],
    ["Comercial — Andrés Castillo", "andres@demo-evoluteca.com"],
    ["Comercial — Miguel Á. Forero", "miguel@demo-evoluteca.com"],
    ["Contraseña (todos)", "Demo2026!"],
  ];
  return React.createElement(View, { style: s.credBox },
    ...filas.map(([label, value], i) => React.createElement(View, { key: label, style: i === filas.length - 1 ? { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 } : s.credRow },
      React.createElement(Text, { style: s.credLabel }, label),
      React.createElement(Text, { style: s.credValue }, value),
    )),
  );
}
function TablaPerm() {
  const cols = [2.6, 1.3, 1, 1];
  const head = ["Qué puede hacer", "Comercial", "Gerente", "Admin."];
  const filas: string[][] = [
    ["Ver clientes, pipeline y cotizaciones", "Solo los suyos", "Todos", "Todos"],
    ["Crear y editar registros", "Sí", "Sí", "Sí"],
    ["Eliminar registros", "No", "Sí", "Sí"],
    ["Filtro por vendedor y rendimiento del equipo", "No", "Sí", "Sí"],
    ["Configuración (módulos, etapas, API, correos)", "No", "No", "Sí"],
    ["Gestión de usuarios del equipo", "No", "Solo ver", "Crear / editar"],
  ];
  return React.createElement(View, { style: s.tabla },
    React.createElement(View, { style: s.tablaHead },
      ...head.map((h, i) => React.createElement(Text, { key: h, style: [s.tablaHCell, { flex: cols[i], textAlign: (i === 0 ? "left" : "center") as "left" | "center" }] }, h)),
    ),
    ...filas.map((fila, ri) => React.createElement(View, { key: ri, style: ri % 2 === 1 ? s.tablaRowAlt : s.tablaRow },
      ...fila.map((celda, ci) => React.createElement(Text, { key: ci, style: [s.tablaCell, { flex: cols[ci], textAlign: (ci === 0 ? "left" : "center") as "left" | "center", fontFamily: (ci === 0 ? "Helvetica-Bold" : "Helvetica") as "Helvetica-Bold" | "Helvetica" }] }, celda)),
    )),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const doc = React.createElement(Document,
    { title: "Manual de Pruebas — Cuenta Demo Evoluteca — Evoluteca CRM", author: "Evoluteca", subject: "Recorrido completo de la cuenta de demostración" },

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
          React.createElement(Text, { style: s.portadaSub }, "Recorrido completo: prueba todo lo que hace el CRM, paso a paso"),
          React.createElement(View, { style: { marginTop: 20 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#fde68a", marginBottom: 6 } }, "Contenido de este manual:"),
            ...[
              "1. Qué es esta cuenta y qué vas a probar",
              "2. Cómo usar este manual",
              "3. Credenciales y los 3 roles",
              "4. Recorrido como Administrador (visión completa)",
              "5. Flujo comercial de lead a venta (lo ejecutas tú)",
              "6. Recorrido como Gerente",
              "7. Recorrido como Comercial",
              "8. Módulos en detalle (pipeline, cotizaciones, reportes...)",
              "9. Inteligencia Artificial",
              "10. Uso en el celular",
              "11. Checklist de cobertura, FAQ y próximos pasos",
            ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#fef3c7", marginBottom: 3 } }, item)),
          ),
          React.createElement(View, { style: { marginTop: 24 } },
            React.createElement(Text, { style: s.portadaVer }, `Versión 2.1 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
          ),
        ),
      ),
    ),

    // ── CAPÍTULO 1 y 2 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "1. Qué es esta cuenta y qué vas a probar"),
      React.createElement(P, null, "Esta es una cuenta de demostración de Evoluteca CRM cargada con datos ficticios pero realistas de una empresa de consultoría y servicios B2B. No es una versión recortada: es el CRM completo, con datos suficientes para que cada función se vea en acción con información real."),
      React.createElement(P, null, "Lo que ya está cargado y listo para que lo explores:"),
      React.createElement(LI, null, "21 clientes (empresas) de sectores variados: tecnología, salud, educación, banca, hospitalidad, ONG y más."),
      React.createElement(LI, null, "23 contactos vinculados a esas empresas, cada uno con su cargo."),
      React.createElement(LI, null, "Un pipeline con 59 oportunidades repartidas en las 6 etapas: desde prospectos fríos hasta negocios ganados y perdidos."),
      React.createElement(LI, null, "Cotizaciones en todos sus estados (borrador, enviada, aceptada, rechazada), catálogo de 6 servicios y 2 plantillas."),
      React.createElement(LI, null, "Agenda con actividades vencidas, de hoy y próximas — para que veas las alertas funcionando."),
      React.createElement(LI, null, "Metas de venta del mes y por vendedor, y un equipo de 5 usuarios con 3 roles distintos."),
      React.createElement(Nota, null, "Todos los datos son ficticios (nombres, empresas, negocios). Puedes crear, editar y borrar libremente: es un entorno de prueba aislado que no afecta ninguna cuenta real. Si dejas la cuenta desordenada, se puede recargar a su estado inicial cuando quieras."),
      React.createElement(P, null, "Esta cuenta usa únicamente los módulos estándar del CRM (no tiene activados módulos sectoriales como Teatros o Salones), para que veas exactamente lo que recibiría cualquier empresa de servicios, consultoría o tecnología."),

      React.createElement(H1, null, "2. Cómo usar este manual"),
      React.createElement(P, null, "Este no es un documento para solo leer: es una guía para que pruebes. Cada paso numerado te dice qué hacer y, cuando aplica, qué deberías ver como resultado, para que confirmes que todo funciona."),
      React.createElement(LI, null, "Los pasos en verde marcados \"Deberías ver\" son el resultado esperado: úsalos para verificar."),
      React.createElement(LI, null, "Las cajas verdes \"Por qué importa\" resaltan las funciones más diferenciadoras del CRM."),
      React.createElement(LI, null, "Te recomendamos recorrerlo en orden, entrando con cada rol cuando el manual lo pida: así entiendes cómo cambia el sistema según quién lo usa."),
      React.createElement(Tip, null, "¿Poco tiempo? Versión express (15 min): capítulos 3, 4 y 5. Versión completa (40-45 min): todo el manual, incluyendo el recorrido por roles y el detalle de cada módulo."),
    ),

    // ── CAPÍTULO 3: CREDENCIALES Y ROLES ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "3. Credenciales y los 3 roles"),
      React.createElement(P, null, "La cuenta tiene 5 usuarios que comparten los mismos datos. La diferencia entre ellos es su rol: lo que cada uno puede ver y hacer. Empieza siempre como Administrador para ver el sistema completo."),
      React.createElement(Credenciales, null),
      React.createElement(H2, null, "Qué puede hacer cada rol"),
      React.createElement(P, null, "Esta es una de las funciones más importantes del CRM: la información y las acciones se adaptan al rol. Guárdala como referencia; en los capítulos 4, 6 y 7 la verás en vivo con cada usuario."),
      React.createElement(TablaPerm, null),
      React.createElement(Wow, { titulo: "Por qué importa" }, "Un comercial solo ve su propia cartera y no puede borrar ni tocar la configuración; un gerente ve todo el equipo pero no administra usuarios ni ajustes; el administrador tiene control total. Esto protege la información y ordena la operación sin que tengas que configurar nada."),
      React.createElement(Tip, null, "Para el recorrido completo tendrás que cerrar sesión y volver a entrar con distintos usuarios. El botón \"Cerrar sesión\" está abajo del todo en el menú lateral, junto a tu nombre."),
    ),

    // ── CAPÍTULO 4: ADMINISTRADOR — parte 1 (Dashboard, búsqueda, menú) ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Recorrido como Administrador"),
      React.createElement(RolBadge, { pill: "ADMINISTRADOR", sub: "Entra con admin@demo-evoluteca.com · Demo2026!" }),
      React.createElement(P, null, "Como administrador ves absolutamente todo. Este recorrido te da la visión gerencial completa del negocio en una sola pantalla y te muestra dónde vive cada cosa."),

      React.createElement(H2, null, "4.1 El Dashboard — tu tablero de una página"),
      React.createElement(Paso, { n: 1, titulo: "Gauges de meta", desc: "Al entrar, arriba verás dos medidores circulares: meta del mes y meta del año. Muestran cuánto has vendido contra el objetivo cargado.", esperado: "Un gauge de la meta del mes (objetivo de 40 millones COP) con el porcentaje alcanzado, y otro del año." }),
      React.createElement(Paso, { n: 2, titulo: "KPIs principales", desc: "Debajo, la fila de indicadores: pipeline activo, valor ponderado (forecast), tasa de cierre, ticket promedio y negocios ganados.", esperado: "Tarjetas con cifras calculadas en vivo sobre las oportunidades reales de la cuenta." }),
      React.createElement(Paso, { n: 3, titulo: "Oportunidades calientes y últimas ganadas", desc: "Más abajo verás los negocios con mayor probabilidad y valor (calientes) y las últimas ventas cerradas.", esperado: "Nombres reales como 'Formación tripulación Aerolínea Regional' o 'Transformación cultural Banco Regional' entre las calientes." }),
      React.createElement(Paso, { n: 4, titulo: "Rendimiento del equipo y salud comercial", desc: "El ranking de vendedores (Sofía, Andrés, Miguel) y los indicadores de salud del pipeline.", esperado: "Un ranking con lo ganado por cada comercial este período." }),
      React.createElement(Paso, { n: 5, titulo: "Panel de alertas — 'Requieren atención'", desc: "Baja hasta el panel de alertas. Reúne lo que se te está pasando: actividades vencidas, negocios estancados y cotizaciones sin respuesta.", esperado: "Varias actividades vencidas en rojo (hay 3 o más ya cargadas) y avisos de negocios sin movimiento." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "El dashboard responde en 10 segundos '¿cómo vamos?' sin abrir un Excel. El panel de alertas es proactivo: no esperas a que se te olvide un seguimiento, el sistema te lo recuerda."),
    ),

    // ── CAPÍTULO 4: ADMINISTRADOR — parte 2 (búsqueda, menú, clientes 360) ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H2, null, "4.2 Búsqueda global y menú a tu medida"),
      React.createElement(Paso, { n: 6, titulo: "Busca cualquier cosa", desc: "Arriba del menú lateral hay un buscador. Escribe 'Tech' (o el nombre de cualquier empresa, contacto u oportunidad).", esperado: "Resultados instantáneos mezclando clientes, contactos, oportunidades, cotizaciones y actividades; haz clic para saltar directo." }),
      React.createElement(Paso, { n: 7, titulo: "Ordena el menú a tu gusto", desc: "En la cabecera del menú, pulsa 'Ordenar', arrastra los ítems que más usas hacia arriba y pulsa 'Listo'. Puedes 'Restablecer' cuando quieras.", esperado: "El orden del menú se guarda para tu usuario; al recargar sigue como lo dejaste." }),

      React.createElement(H2, null, "4.3 Ficha 360° del cliente"),
      React.createElement(Paso, { n: 8, titulo: "Abre un cliente con historial", desc: "Ve a Clientes y abre 'Tech Solutions Colombia'. Es una cuenta con mucha actividad, ideal para ver la ficha completa.", esperado: "Su ficha con datos, etiquetas, contactos, todas sus oportunidades y su historial." }),
      React.createElement(Paso, { n: 9, titulo: "Timeline 360° y contactos", desc: "En la ficha revisa la línea de tiempo (actividades y cambios) y la lista de contactos de la empresa (por ejemplo, Verónica Palacios, CEO).", esperado: "Un timeline cronológico y los contactos con su cargo y datos." }),
      React.createElement(Paso, { n: 10, titulo: "Notas rápidas y WhatsApp con plantillas", desc: "Agrega una nota rápida a la cuenta. Luego, sobre un contacto, prueba el botón de WhatsApp: abre el chat con un mensaje de plantilla ya redactado.", esperado: "La nota queda guardada en la ficha; WhatsApp se abre con el texto de plantilla listo para enviar." }),
      React.createElement(Paso, { n: 11, titulo: "Archivos adjuntos", desc: "En la misma ficha busca la sección Archivos adjuntos. Sube un archivo de prueba (o descarga el que ya está cargado).", esperado: "El archivo queda vinculado a la cuenta y se puede descargar." }),
      React.createElement(Paso, { n: 12, titulo: "Resumen con IA del cliente", desc: "En el panel 'Resumen con IA' pulsa 'Generar resumen'. En segundos redacta un informe con los datos reales de la cuenta.", esperado: "Un informe de varias secciones: panorama, relación y actividad, oportunidades y cotizaciones, señales, contactos clave y próximas acciones." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "La ficha 360° reúne en un solo lugar todo lo que sabes de un cliente. El Resumen con IA prepara en segundos lo que a un vendedor le tomaría 15 minutos leer antes de una reunión."),
    ),

    // ── CAPÍTULO 4: ADMINISTRADOR — parte 3 (Configuración) ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H2, null, "4.4 Configuración — solo el administrador la ve"),
      React.createElement(P, null, "Ve a Configuración y a Equipo (menú lateral). Estas pantallas son la razón para empezar como administrador: aquí se controla cómo funciona todo el CRM."),
      React.createElement(Paso, { n: 13, titulo: "Equipo y roles", desc: "En Equipo verás los 5 usuarios con su rol. Como administrador puedes crear usuarios, cambiar roles y editar nombres.", esperado: "La lista de Laura, Carlos, Sofía, Andrés y Miguel, con opciones de edición que un comercial no tiene." }),
      React.createElement(Paso, { n: 14, titulo: "Etapas del pipeline configurables", desc: "En Configuración > Etapas del pipeline, renombra una etapa (p. ej. 'Cotización' → 'Propuesta enviada') y arrástrala a otra posición.", esperado: "El cambio se refleja al instante en Pipeline y en Reportes; el vocabulario se adapta a tu negocio." }),
      React.createElement(Paso, { n: 15, titulo: "Captura externa de leads (API)", desc: "En Configuración > Captura externa de leads verás la clave ya generada. Es la que usaría un formulario web o una automatización de WhatsApp/Ads para crear leads solos.", esperado: "Una clave (API key) y la dirección del servicio; cada lead entrante crea automáticamente cliente, contacto y oportunidad en el Pipeline." }),
      React.createElement(Paso, { n: 16, titulo: "Notificaciones automáticas por email", desc: "En Configuración revisa el bloque de notificaciones: recordatorios de actividades y avisos de cotizaciones sin respuesta que el sistema envía solo.", esperado: "Interruptores para activar/desactivar los correos automáticos." }),
      React.createElement(Paso, { n: 17, titulo: "Papelera y restaurar", desc: "Ve a Papelera. Todo lo que se elimina cae aquí primero y se puede restaurar. Borra un registro de prueba y luego recupéralo.", esperado: "El elemento borrado aparece en Papelera con la opción de restaurarlo — nada se pierde por error." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "El pipeline configurable hace que el CRM hable el idioma de tu empresa. La captura externa de leads elimina la digitación manual. Y la papelera te da una red de seguridad frente a borrados accidentales."),
    ),

    // ── CAPÍTULO 5: FLUJO END-TO-END — parte 1 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "5. Flujo comercial completo: de lead a venta"),
      React.createElement(P, null, "Aquí no solo miras: ejecutas el ciclo comercial completo con tus propias manos, creando datos reales. Es la mejor forma de sentir cómo fluye el CRM. Puedes hacerlo como administrador o como comercial."),
      React.createElement(Nota, null, "Vas a crear y modificar datos de verdad. No hay problema: es la cuenta de prueba. Al terminar puedes borrar lo que creaste, o pedir que se recargue la cuenta a su estado inicial."),

      React.createElement(Paso, { n: 1, titulo: "Crea un cliente nuevo", desc: "Ve a Clientes > Nuevo. Crea la empresa 'Prueba Demo S.A.S', ponle sector, un par de etiquetas y guárdala.", esperado: "La empresa aparece en la lista de Clientes y se abre su ficha vacía." }),
      React.createElement(Paso, { n: 2, titulo: "Agrégale un contacto", desc: "Dentro de la ficha, añade un contacto (nombre, cargo, email, teléfono).", esperado: "El contacto queda vinculado a la empresa y aparece también en el módulo Contactos." }),
      React.createElement(Paso, { n: 3, titulo: "Crea una oportunidad", desc: "Crea una oportunidad para ese cliente: título, valor (p. ej. 10.000.000), etapa inicial 'Prospecto' y una fecha de cierre estimada.", esperado: "La oportunidad aparece en el Pipeline, en la columna Prospecto. Los campos de dinero muestran separador de miles automático." }),
      React.createElement(Paso, { n: 4, titulo: "Avánzala por el pipeline (drag & drop)", desc: "Ve a Pipeline y arrastra tu tarjeta de 'Prospecto' hasta 'Propuesta'. Suéltala en la columna.", esperado: "La tarjeta cambia de columna al instante y la etapa queda registrada en su historial." }),
      React.createElement(Paso, { n: 5, titulo: "Registra una actividad de seguimiento", desc: "Abre tu oportunidad y crea una actividad (una llamada para mañana, por ejemplo).", esperado: "La actividad aparece en la Agenda y, si la pones vencida, se sumará al panel de alertas del dashboard." }),
    ),

    // ── CAPÍTULO 5: FLUJO END-TO-END — parte 2 (cotización → PDF → ganar) ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(Paso, { n: 6, titulo: "Crea una cotización formal", desc: "Ve a Cotizaciones > Nueva. Selecciona tu cliente y contacto, y agrega ítems desde el Catálogo (o escríbelos a mano). Prueba también cargar una Plantilla.", esperado: "El total se calcula solo con su desglose e impuesto; cargar una plantilla llena los ítems de golpe." }),
      React.createElement(Paso, { n: 7, titulo: "Descarga el PDF", desc: "Guarda la cotización y descárgala en PDF.", esperado: "Un PDF profesional con el logo, el desglose de servicios, el impuesto y el total, listo para enviar al cliente." }),
      React.createElement(Paso, { n: 8, titulo: "Cámbiale el estado / envíala por email", desc: "Marca la cotización como 'Enviada' (o usa el envío por email). Observa cómo el estado cambia de color.", esperado: "El estado pasa a Enviada; una cotización sin respuesta por varios días dispara luego una alerta." }),
      React.createElement(Paso, { n: 9, titulo: "Gana el negocio", desc: "Vuelve a tu oportunidad y arrástrala (o cámbiala) a la etapa 'Ganada'.", esperado: "La oportunidad se marca como ganada y su valor empieza a contar en la meta del mes y en los reportes." }),
      React.createElement(Paso, { n: 10, titulo: "Prueba también perder una", desc: "Crea otra oportunidad rápida y márcala como 'Perdida'. El sistema te pedirá el motivo de pérdida (precio, competencia, etc.).", esperado: "El motivo queda guardado; aparece en rojo en la oportunidad, entre paréntesis en la lista del cliente, y alimenta el reporte de motivos de pérdida." }),
      React.createElement(Paso, { n: 11, titulo: "Mira el impacto", desc: "Vuelve al Dashboard y a Reportes.", esperado: "Tu venta ganada movió el gauge de la meta, el ticket promedio y la tasa de cierre. Todo el ciclo quedó reflejado." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "Acabas de recorrer el ciclo completo — lead, seguimiento, cotización, PDF, cierre — sin salir del CRM y sin un solo Excel. Cada dato que registraste se convirtió automáticamente en métrica de negocio."),
    ),

    // ── CAPÍTULO 6: GERENTE ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "6. Recorrido como Gerente"),
      React.createElement(RolBadge, { pill: "GERENTE", sub: "Cierra sesión y entra con gerente@demo-evoluteca.com · Demo2026!" }),
      React.createElement(P, null, "El gerente ve todo el negocio (como el admin) pero no administra la configuración ni crea usuarios. Es el rol de quien dirige al equipo comercial."),
      React.createElement(Paso, { n: 1, titulo: "Filtro por vendedor", desc: "Ve a Pipeline o Reportes. En la barra de filtros usa el selector 'Vendedor' y elige 'Sofía Restrepo' o 'Miguel Á. Forero'.", esperado: "El pipeline y los números se recalculan mostrando solo la cartera de esa persona." }),
      React.createElement(Paso, { n: 2, titulo: "Rendimiento del equipo", desc: "Ve a Equipo > Rendimiento. Compara lo que aporta cada comercial.", esperado: "Un comparativo del equipo con lo ganado y el pipeline de cada uno (visible para gerente y admin, no para comerciales)." }),
      React.createElement(Paso, { n: 3, titulo: "Metas por vendedor", desc: "En Reportes revisa las metas individuales. Sofía y Andrés tienen meta asignada este mes.", esperado: "El avance de cada vendedor contra su meta individual." }),
      React.createElement(Paso, { n: 4, titulo: "Brief del pipeline con IA", desc: "En Pipeline, sobre los filtros, pulsa 'Generar brief' en el panel 'Brief del pipeline con IA'.", esperado: "Un resumen ejecutivo de todo el pipeline: panorama, negocios calientes, en riesgo, avance de la meta y prioridades de la semana." }),
      React.createElement(Paso, { n: 5, titulo: "Comprueba el límite del rol", desc: "Intenta entrar a Configuración. Verás la información general, pero los ajustes clave (módulos, etapas, API, usuarios) están reservados al administrador.", esperado: "El gerente no puede cambiar la configuración del sistema ni crear/editar usuarios." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "El gerente dirige con datos: ve el desempeño de cada vendedor, filtra por persona y recibe un brief del pipeline redactado por IA para su reunión semanal, sin tocar la configuración técnica del sistema."),
    ),

    // ── CAPÍTULO 7: COMERCIAL ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "7. Recorrido como Comercial"),
      React.createElement(RolBadge, { pill: "COMERCIAL", sub: "Cierra sesión y entra con sofia@demo-evoluteca.com · Demo2026!" }),
      React.createElement(P, null, "Ahora entra como Sofía Restrepo. Es el mismo CRM, pero enfocado: un comercial solo ve y gestiona su propia cartera. Compara con lo que veías como administrador."),
      React.createElement(Paso, { n: 1, titulo: "Solo tus clientes y tu pipeline", desc: "Ve a Clientes y a Pipeline.", esperado: "Ves menos registros que como administrador: únicamente los clientes y oportunidades que Sofía creó o tiene asignados." }),
      React.createElement(Paso, { n: 2, titulo: "Tu agenda", desc: "Ve a Agenda.", esperado: "Solo tus actividades (las que creaste o donde eres responsable), no las de todo el equipo." }),
      React.createElement(Paso, { n: 3, titulo: "Sin filtro por vendedor ni rendimiento", desc: "Fíjate en el Pipeline y en Reportes.", esperado: "No aparece el selector de vendedor ni el comparativo del equipo: un comercial no ve la cartera de sus compañeros." }),
      React.createElement(Paso, { n: 4, titulo: "No puedes eliminar ni configurar", desc: "Intenta borrar un registro y abrir Configuración.", esperado: "No hay opción de eliminar (eso queda para gerente/admin) y la configuración del sistema no está disponible." }),
      React.createElement(Paso, { n: 5, titulo: "Pero sí trabajas a fondo lo tuyo", desc: "Crea una oportunidad, registra actividades, arma una cotización y genera el Resumen con IA de uno de tus clientes.", esperado: "Un comercial tiene todo lo necesario para vender; lo que no tiene es visibilidad ni control sobre lo ajeno." }),
      React.createElement(Wow, { titulo: "Por qué importa" }, "El mismo sistema se siente distinto según quién entra: el comercial trabaja concentrado en su cartera, sin ruido ni riesgo de tocar lo que no le corresponde. Es orden y seguridad sin esfuerzo de configuración."),
    ),

    // ── CAPÍTULO 8: MÓDULOS EN DETALLE — parte A ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "8. Módulos en detalle"),
      React.createElement(P, null, "Este capítulo recorre a fondo, módulo por módulo, funciones que quizá ya viste de pasada. Puedes hacerlo con el usuario Administrador. No es necesario en orden: usa esta sección como referencia."),

      React.createElement(H2, null, "8.1 Pipeline a fondo"),
      React.createElement(LI, null, "Las 6 etapas: Prospecto, Calificado, Propuesta, Negociación, Ganada y Perdida — con el valor total de cada columna."),
      React.createElement(LI, null, "Indicadores de urgencia: las tarjetas señalan negocios con fecha de cierre próxima o sin movimiento reciente."),
      React.createElement(LI, null, "Drag & drop entre columnas para cambiar de etapa (lo probaste en el capítulo 5)."),
      React.createElement(LI, null, "Vista tabla: alterna del tablero (kanban) a una vista de tabla ordenable y filtrable."),
      React.createElement(LI, null, "Historial de etapas: dentro de una oportunidad, ve por qué etapas pasó y cuándo."),
      React.createElement(LI, null, "Motivo de pérdida: abre una oportunidad de la columna Perdida —por ejemplo 'Diagnóstico organizacional Banco Regional' (Sin respuesta del cliente) o 'Rediseño malla curricular San Marcos' (Eligió a la competencia)— y verás el motivo en rojo bajo el título; en la lista de oportunidades del cliente aparece entre paréntesis."),
      React.createElement(LI, null, "Número de cotización al avanzar de etapa y archivos adjuntos por oportunidad."),

      React.createElement(H2, null, "8.2 Cotizaciones a fondo"),
      React.createElement(LI, null, "Estados: Borrador, Enviada, Aceptada y Rechazada (con motivo). La cuenta ya trae ejemplos de cada uno."),
      React.createElement(LI, null, "La cotización siembra el pipeline: crear una puede generar la oportunidad asociada."),
      React.createElement(LI, null, "Recotizaciones y versiones: ajusta y guarda una nueva versión sin perder la anterior."),
      React.createElement(LI, null, "Impuestos y desglose del total, descarga en PDF y envío por email."),
      React.createElement(LI, null, "Catálogo de servicios y plantillas para armar cotizaciones en segundos."),
      React.createElement(LI, null, "Fecha de validez con alerta de vencimiento, número propio del cliente y separador de miles en los campos de dinero."),
    ),

    // ── CAPÍTULO 8: MÓDULOS EN DETALLE — parte B ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H2, null, "8.3 Reportes y metas a fondo"),
      React.createElement(P, null, "Ve a Reportes. Es el centro de análisis del negocio; todo se recalcula al vuelo con filtros de período y vendedor."),
      React.createElement(LI, null, "Embudo de conversión y tasa de cierre por etapa."),
      React.createElement(LI, null, "Top clientes por facturación y gráfica mensual de ventas."),
      React.createElement(LI, null, "Comparativa por año y comparación mes contra mes anterior."),
      React.createElement(LI, null, "Tiempo promedio de cierre de los negocios ganados."),
      React.createElement(LI, null, "Motivos de pérdida: el desglose de por qué se caen los negocios —Precio muy alto, Eligió a la competencia, Sin respuesta del cliente y Presupuesto insuficiente— con la cantidad y el valor perdido por cada motivo."),
      React.createElement(LI, null, "Metas de venta (mes y año) y metas por vendedor, con su porcentaje de avance."),

      React.createElement(H2, null, "8.4 Agenda a fondo"),
      React.createElement(LI, null, "Tipos de actividad: llamada, reunión, email y tarea."),
      React.createElement(LI, null, "Vista Lista o Calendario (alterna entre ambas)."),
      React.createElement(LI, null, "Las actividades de hoy se resaltan en rojo; las vencidas alimentan las alertas."),
      React.createElement(LI, null, "Exportar al calendario (iCal) para verlas en Google/Outlook, y notificaciones por email."),

      React.createElement(H2, null, "8.5 Otros módulos"),
      React.createElement(LI, null, "Catálogo: los 6 servicios base con su precio; edítalos o agrega los tuyos."),
      React.createElement(LI, null, "Plantillas: 2 plantillas de cotización listas para reutilizar."),
      React.createElement(LI, null, "Contactos: la libreta completa de personas, con búsqueda y vínculo a su empresa."),
      React.createElement(LI, null, "Datos > Importar desde Excel: carga masiva que crea clientes, contactos y oportunidades vinculados de un archivo."),
      React.createElement(Tip, null, "En Datos puedes probar la importación con un Excel pequeño. El sistema evita duplicar si vuelves a importar el mismo archivo."),
    ),

    // ── CAPÍTULO 9: IA + CAPÍTULO 10: MÓVIL ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "9. Inteligencia Artificial"),
      React.createElement(P, null, "El CRM reúne todas sus funciones de IA en una pestaña propia: 'Asistente IA' (en el menú lateral, debajo de Reportes). Son 6 asistentes que trabajan solo con los datos reales de tu cuenta —no inventan ni consultan nada externo— y comparten un mismo cupo mensual, visible como 'Acciones de IA · este mes'."),
      React.createElement(Paso, { n: 1, titulo: "Abre el Asistente IA", desc: "En el menú lateral entra a 'Asistente IA'. Es el punto de partida: una vitrina con las 6 funciones y el medidor de cupo del mes.", esperado: "Seis tarjetas (Resumen de cliente, Brief del pipeline, Análisis de tendencias, Pregúntale a tus datos, Redactor de correos e Informe mensual) y, arriba a la derecha, el contador 'Acciones de IA · este mes'." }),
      React.createElement(Paso, { n: 2, titulo: "Resumen de cliente", desc: "Desde el Asistente IA (o en la ficha de 'Tech Solutions Colombia') pulsa 'Generar resumen'.", esperado: "Un informe de 6 secciones: panorama, relación y actividad, oportunidades y cotizaciones, señales, contactos clave y próximas acciones." }),
      React.createElement(Paso, { n: 3, titulo: "Brief del pipeline", desc: "En Pipeline, sobre los filtros, pulsa 'Generar brief'.", esperado: "Un resumen ejecutivo del pipeline: negocios calientes, en riesgo, avance de la meta y prioridades de la semana." }),
      React.createElement(Paso, { n: 4, titulo: "Análisis de tendencias", desc: "En Reportes, usa el análisis con IA. Lee tus reportes de los últimos meses y los interpreta.", esperado: "Una explicación de qué cambió, por qué, la proyección y qué hacer — acompañada de gráficas de tendencia." }),
      React.createElement(Paso, { n: 5, titulo: "Pregúntale a tus datos", desc: "Entra a 'Pregúntale a tus datos' (desde el Asistente IA) y escribe una pregunta en lenguaje natural, por ejemplo: '¿Cuáles son mis 5 clientes con más ventas?'.", esperado: "La respuesta con el dato exacto y su gráfica al instante, sin que tengas que armar ningún reporte." }),
      React.createElement(Paso, { n: 6, titulo: "Redactor de correos", desc: "Abre una cotización (módulo Cotizaciones) y en el panel 'Redactor de correos con IA' elige el tipo —Envío, Seguimiento o Cierre— y pulsa 'Redactar correo'.", esperado: "El borrador del correo escrito con el contexto de esa cotización, editable y con botón para copiarlo. Revísalo antes de enviar." }),
      React.createElement(Paso, { n: 7, titulo: "Informe ejecutivo mensual", desc: "Entra a 'Informe ejecutivo mensual' (desde el Asistente IA) y genéralo.", esperado: "El cierre del mes anterior con sus tendencias, redactado y listo para presentar en la junta." }),
      React.createElement(Nota, null, "Todas las funciones de IA descuentan del mismo cupo mensual (según tu plan puede ser ilimitado o con tope). Cada panel muestra cuánto llevas consumido, para que el uso sea siempre transparente."),
      React.createElement(Wow, { titulo: "Por qué importa" }, "La IA no reemplaza al vendedor: le ahorra lo tedioso. Prepara el contexto de una cuenta, el estado del pipeline, la lectura de tus reportes, la respuesta a una pregunta y hasta el correo de una cotización —en segundos y solo con los datos que ya viven en tu CRM."),

      React.createElement(H1, null, "10. Uso en el celular"),
      React.createElement(P, null, "El CRM es responsive: funciona en el navegador del celular sin instalar nada."),
      React.createElement(Paso, { n: 4, titulo: "Ábrelo en tu teléfono", desc: "Entra a crm.evoluteca.com desde el navegador del móvil con cualquiera de los usuarios.", esperado: "El menú se colapsa en un botón; el dashboard, el pipeline y las fichas se adaptan a la pantalla pequeña." }),
      React.createElement(Tip, null, "Es ideal para consultar un cliente o registrar una actividad justo al salir de una reunión, desde el celular."),
    ),

    // ── CAPÍTULO 11: CHECKLIST + FAQ + PRÓXIMOS PASOS ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "11. Checklist de cobertura"),
      React.createElement(P, null, "Marca lo que ya probaste. Si completas la lista, habrás recorrido prácticamente todo lo que hace el CRM."),
      React.createElement(Check, null, "Entré con los 3 roles (administrador, gerente y comercial) y noté las diferencias."),
      React.createElement(Check, null, "Revisé el dashboard: gauges de meta, KPIs y panel de alertas."),
      React.createElement(Check, null, "Usé la búsqueda global y reordené el menú."),
      React.createElement(Check, null, "Abrí una ficha 360°: timeline, contactos, notas, WhatsApp, adjuntos y Resumen con IA."),
      React.createElement(Check, null, "Ejecuté el flujo completo: cliente → contacto → oportunidad → cotización → PDF → ganada."),
      React.createElement(Check, null, "Arrastré tarjetas en el pipeline y registré un motivo de pérdida."),
      React.createElement(Check, null, "Configuré etapas del pipeline y vi la clave de captura externa de leads."),
      React.createElement(Check, null, "Probé la papelera (borrar y restaurar)."),
      React.createElement(Check, null, "Exploré Reportes: embudo, metas, top clientes y motivos de pérdida."),
      React.createElement(Check, null, "Abrí el Asistente IA y probé varias funciones (resumen de cliente, brief del pipeline, análisis de tendencias, pregúntale a tus datos, redactor de correos e informe mensual)."),
      React.createElement(Check, null, "Abrí el CRM en el celular."),

      React.createElement(H1, null, "Preguntas frecuentes"),
      React.createElement(H2, null, "¿Puedo dañar algo si hago pruebas libremente?"),
      React.createElement(P, null, "No. La cuenta está aislada de cualquier dato real. Crea, edita y borra lo que quieras; se puede recargar a su estado inicial cuando lo pidas."),
      React.createElement(H2, null, "¿Los números (metas, tasa de cierre, forecast) son reales?"),
      React.createElement(P, null, "Los datos base son ficticios, pero los cálculos son exactamente los mismos que correrían sobre tus datos reales."),
      React.createElement(H2, null, "Si avanzamos, ¿migran nuestros datos a esta misma cuenta?"),
      React.createElement(P, null, "No: se crea una cuenta nueva y limpia solo con tus datos. Esta demo se puede desactivar en ese momento."),
      React.createElement(H2, null, "¿Puedo probar módulos sectoriales (Teatros, Salones) aquí?"),
      React.createElement(P, null, "Esta cuenta no los tiene activados a propósito, para mostrar el CRM genérico. Si tu negocio los necesita, pide una cuenta demo específica."),

      React.createElement(Sep, null),
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
