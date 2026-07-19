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
  verde:       "#059669",
  verdeClaro:  "#d1fae5",
  verdeSuave:  "#a7f3d0",
  azulClarito: "#dbeafe",
  azulMedio:   "#2563eb",
  gris:        "#64748b",
  grisClaro:   "#f1f5f9",
  grisBorde:   "#e2e8f0",
  negro:       "#1e293b",
  blanco:      "#ffffff",
  amarillo:    "#f59e0b",
};

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: C.negro, backgroundColor: C.blanco, paddingBottom: 50 },
  portada:     { flex: 1, flexDirection: "column" },
  portadaLogos:{ backgroundColor: C.blanco, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 60, paddingVertical: 20 },
  portadaAzul: { backgroundColor: C.verde, flex: 1, paddingHorizontal: 60, paddingTop: 60, paddingBottom: 60, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 15, color: "#a7f3d0", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#6ee7b7", borderTopWidth: 1, borderTopColor: "#047857", paddingTop: 16 },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  seccion:     { paddingHorizontal: 40, paddingTop: 32 },
  h1:          { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.verde, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.verde, borderRadius: 2, marginBottom: 16, width: 60 },
  h2:          { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: "#fefce8", borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.verde, fontFamily: "Helvetica-Bold", fontSize: 12 },
  liTxt:       { flex: 1, fontSize: 10, color: C.negro, lineHeight: 1.5 },
  tabla:       { borderWidth: 1, borderColor: C.grisBorde, borderRadius: 6, overflow: "hidden", marginVertical: 8, marginHorizontal: 40 },
  tablaHead:   { flexDirection: "row", backgroundColor: C.verde, paddingVertical: 6, paddingHorizontal: 10 },
  tablaHCell:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.blanco, textTransform: "uppercase" },
  tablaRow:    { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.grisClaro },
  tablaCell:   { fontSize: 9, color: C.negro, lineHeight: 1.4 },
  footer:      { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.grisBorde, paddingTop: 6 },
  footerTxt:   { fontSize: 7, color: C.gris },
  sep:         { height: 1, backgroundColor: C.grisBorde, marginVertical: 16, marginHorizontal: 40 },
  paso:        { flexDirection: "row", marginBottom: 10, gap: 10 },
  pasoNum:     { width: 22, height: 22, backgroundColor: C.verde, borderRadius: 11, alignItems: "center", justifyContent: "center" },
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
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Anexo Facturación por Resultados v1.0"),
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
function FilaModalidad({ modalidad, calc, cuando, alt }: { modalidad: string; calc: string; cuando: string; alt?: boolean }) {
  return React.createElement(View, { style: [s.tablaRow, alt ? { backgroundColor: "#f8fafc" } : {}] },
    React.createElement(Text, { style: [s.tablaCell, { width: "22%", fontFamily: "Helvetica-Bold" }] }, modalidad),
    React.createElement(Text, { style: [s.tablaCell, { width: "40%" }] }, calc),
    React.createElement(Text, { style: [s.tablaCell, { width: "38%" }] }, cuando),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "ahorros")) {
    return NextResponse.json({ error: "Este anexo aplica solo a tenants con el módulo Facturación por resultados activo" }, { status: 403 });
  }

  const doc = React.createElement(Document,
    { title: "Anexo — Facturación por Resultados — Evoluteca CRM", author: "Evoluteca", subject: "Guía del módulo de honorarios por resultado" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        React.createElement(View, { style: s.portadaAzul },
          React.createElement(Text, { style: s.portadaTit }, "Anexo — Facturación"),
          React.createElement(Text, { style: s.portadaTit }, "por Resultados"),
          React.createElement(Text, { style: s.portadaSub }, "Cotizar por ahorro (Success Fee) y Fee Mensual"),
          React.createElement(View, { style: { marginTop: 50 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#a7f3d0", marginBottom: 6 } }, "Contenido de este anexo:"),
            ...[
              "1. Para quién es este anexo",
              "2. Activar el módulo",
              "3. Las tres modalidades de cobro",
              "4. Crear una cotización Success Fee",
              "5. Crear una cotización Fee Mensual",
              "6. Después de guardar",
              "7. Enviar la propuesta al cliente",
              "8. Estimado vs. real",
              "9. Preguntas frecuentes",
            ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#d1fae5", marginBottom: 3 } }, item)),
          ),
          React.createElement(View, { style: { marginTop: 30 } },
            React.createElement(Text, { style: s.portadaVer }, `Versión 1.0 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
          ),
        ),
      ),
    ),

    // ── CAP 1, 2, 3 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "1. Para quién es este anexo"),
      React.createElement(P, null, "Este documento complementa el Manual de Usuario general de Evoluteca CRM y describe únicamente el módulo Facturación por resultados: cotizar cobrando por el resultado que le generas al cliente, no por un precio fijo. Está pensado para consultoras de optimización de gasto (telecomunicaciones, TIC/nube, servicios públicos), auditoría de facturas o renegociación con proveedores, que cobran un porcentaje del ahorro logrado o un honorario mensual durante el contrato."),
      React.createElement(Nota, null, "El módulo es opcional. Se activa desde Configuración > Módulos opcionales > \"Módulo Facturación por resultados\". Si no ves la Modalidad de cobro al crear una cotización, pide a tu Administrador que lo active."),

      React.createElement(H1, null, "2. Activar el módulo"),
      React.createElement(Paso, { n: 1, titulo: "Ir a Configuración", desc: "En el menú lateral, entra a Configuración > Módulos opcionales." }),
      React.createElement(Paso, { n: 2, titulo: "Activar el interruptor", desc: 'Enciende "Módulo Facturación por resultados". Solo un usuario Administrador puede hacerlo.' }),
      React.createElement(Paso, { n: 3, titulo: "Listo", desc: "A partir de ahí, cada Nueva cotización muestra el selector de Modalidad de cobro." }),

      React.createElement(H1, null, "3. Las tres modalidades de cobro"),
      React.createElement(P, null, "Al crear una cotización con el módulo activo, eliges cómo se cobra:"),
      React.createElement(View, { style: s.tabla },
        React.createElement(View, { style: s.tablaHead },
          React.createElement(Text, { style: [s.tablaHCell, { width: "22%" }] }, "Modalidad"),
          React.createElement(Text, { style: [s.tablaHCell, { width: "40%" }] }, "Cómo se calcula"),
          React.createElement(Text, { style: [s.tablaHCell, { width: "38%" }] }, "Cuándo usarla"),
        ),
        React.createElement(FilaModalidad, { modalidad: "Fee fijo", calc: "Líneas de servicio (cantidad x precio) + impuestos", cuando: "Trabajos con precio cerrado (proyectos, servicios puntuales)" }),
        React.createElement(FilaModalidad, { alt: true, modalidad: "Success fee", calc: "Suma del ahorro mensual estimado x % honorarios x horizonte en meses", cuando: "Cuando cobras un porcentaje del ahorro que le consigues al cliente" }),
        React.createElement(FilaModalidad, { modalidad: "Fee mensual", calc: "Fee mensual x horizonte en meses", cuando: "Cuando el cliente prefiere un honorario fijo mensual en vez del % de ahorro" }),
      ),
      React.createElement(Tip, null, "El % de honorarios y el horizonte en meses son editables en cada cotización. El estándar suele ser 40-50% durante 18 meses, pero puedes ajustarlo."),
    ),

    // ── CAP 4 y 5 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Crear una cotización Success Fee"),
      React.createElement(Paso, { n: 1, titulo: "Nueva cotización", desc: "Entra a Cotizaciones > Nueva cotización." }),
      React.createElement(Paso, { n: 2, titulo: "Elegir el cliente", desc: 'Selecciona la empresa (y el contacto, si quieres). Puedes crearlos ahí mismo con el botón "+ Nuevo".' }),
      React.createElement(Paso, { n: 3, titulo: "Modalidad Success fee", desc: 'En "Modalidad de cobro", selecciona Success fee. Se abre el editor de ahorro.' }),
      React.createElement(Paso, { n: 4, titulo: "Líneas de ahorro por área", desc: "Por cada área de gasto, escribe el Área (ej. Telecomunicaciones), el Gasto base mensual actual y el Ahorro estimado mensual. Usa \"+ Área de gasto\" para añadir más." }),
      React.createElement(Paso, { n: 5, titulo: "% y horizonte", desc: "Indica el % de honorarios (ej. 50) y el Horizonte en meses (ej. 18)." }),
      React.createElement(Paso, { n: 6, titulo: "Revisar el honorario estimado", desc: "El Honorario estimado se calcula solo y se muestra abajo a la derecha." }),
      React.createElement(Paso, { n: 7, titulo: "Guardar", desc: 'Haz clic en "Guardar como borrador". La cotización queda creada y aparece como negocio en el Pipeline con ese valor.' }),
      React.createElement(Tip, null, "Ejemplo: 2 áreas con ahorro mensual de 12.000.000 y 5.600.000 = 17.600.000 al mes. Al 50% durante 18 meses, el honorario estimado es 158.400.000."),

      React.createElement(H1, null, "5. Crear una cotización Fee Mensual"),
      React.createElement(Paso, { n: 1, titulo: "Modalidad Fee mensual", desc: "Igual que arriba, pero elige la modalidad Fee mensual." }),
      React.createElement(Paso, { n: 2, titulo: "Monto y meses", desc: "Escribe el Fee mensual (monto en pesos) y el Horizonte en meses." }),
      React.createElement(Paso, { n: 3, titulo: "Total automático", desc: "El Total del contrato = fee mensual x meses se calcula automáticamente." }),
    ),

    // ── CAP 6, 7, 8, 9 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "6. Después de guardar"),
      React.createElement(LI, null, "La cotización aparece en el Pipeline como un negocio, con el honorario estimado como valor."),
      React.createElement(LI, null, "En el detalle verás la sección \"Propuesta de honorarios\" con el desglose (áreas, ahorro, %, meses y honorario)."),
      React.createElement(LI, null, "Puedes cambiar el estado (Borrador, Enviada, Aceptada o Rechazada) desde el detalle."),

      React.createElement(H1, null, "7. Enviar la propuesta al cliente"),
      React.createElement(P, null, "Las tres formas de envío muestran el formato de honorarios (no una tabla de ítems vacía):"),
      React.createElement(LI, null, "Descargar PDF — para adjuntarlo por tu cuenta."),
      React.createElement(LI, null, "Enviar por correo — llega con el desglose y un botón para descargar el PDF."),
      React.createElement(LI, null, "Link público — un enlace que el cliente abre sin clave, donde puede Aceptar o Rechazar la propuesta."),

      React.createElement(H1, null, "8. Estimado vs. real"),
      React.createElement(Nota, null, "El honorario que muestra la cotización es una estimación basada en el ahorro proyectado. Lo que realmente cobras depende del ahorro efectivamente verificado durante el contrato. La cotización sirve para vender y alimentar el Pipeline; el seguimiento del ahorro real mes a mes es un paso posterior."),

      React.createElement(H1, null, "9. Preguntas frecuentes"),
      React.createElement(H2, null, "¿Puedo cambiar el % o los meses?"),
      React.createElement(P, null, "Sí, en cada cotización, sin límite."),
      React.createElement(H2, null, "¿Sirve para otros tipos de cobro?"),
      React.createElement(P, null, "Sí. Si eliges Fee fijo (o no activas el módulo), la cotización funciona como siempre: líneas de servicio con precio e impuestos."),
      React.createElement(H2, null, "¿Se afectan los demás módulos?"),
      React.createElement(P, null, "No. Es un módulo opcional e independiente; no cambia nada del resto del CRM."),

      React.createElement(Sep, null),
      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 20 }, wrap: false },
        React.createElement(View, { style: { backgroundColor: C.verde, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Necesitas ayuda adicional?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#a7f3d0", lineHeight: 1.6 } },
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
      "Content-Disposition": `attachment; filename="anexo-facturacion-por-resultados-evoluteca-crm-${new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }).slice(0, 16).replace(" ", "-").replace(":", "")}.pdf"`,
    },
  });
}
