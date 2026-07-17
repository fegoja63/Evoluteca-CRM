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
  teal:        "#0f766e",
  tealClarito: "#ccfbf1",
  azulClarito: "#dbeafe",
  azulMedio:   "#2563eb",
  verde:       "#059669",
  verdeClarito:"#d1fae5",
  gris:        "#64748b",
  grisClaro:   "#f1f5f9",
  grisBorde:   "#e2e8f0",
  negro:       "#1e293b",
  blanco:      "#ffffff",
  amarillo:    "#f59e0b",
  rojo:        "#dc2626",
};

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: C.negro, backgroundColor: C.blanco, paddingBottom: 50 },
  portada:     { flex: 1, flexDirection: "column" },
  portadaLogos:{ backgroundColor: C.blanco, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 60, paddingVertical: 20 },
  portadaAzul: { backgroundColor: C.teal, flex: 1, paddingHorizontal: 60, paddingTop: 60, paddingBottom: 60, justifyContent: "flex-start" },
  portadaTit:  { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 8 },
  portadaSub:  { fontSize: 15, color: "#99f6e4", marginBottom: 40 },
  portadaVer:  { fontSize: 10, color: "#5eead4", borderTopWidth: 1, borderTopColor: "#115e59", paddingTop: 16 },
  logoEvol:    { height: 40, width: 140, objectFit: "contain" },
  logoFGJ:     { height: 44, width: 100, objectFit: "contain", borderRadius: 6 },
  pageHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 4 },
  pageHeaderLogo: { height: 28, width: 90, objectFit: "contain" },
  pageHeaderFGJ:  { height: 28, width: 64, objectFit: "contain", borderRadius: 4 },
  seccion:     { paddingHorizontal: 40, paddingTop: 32 },
  h1:          { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.teal, marginBottom: 4 },
  h1Line:      { height: 3, backgroundColor: C.teal, borderRadius: 2, marginBottom: 16, width: 60 },
  h2:          { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.negro, marginBottom: 6, marginTop: 16 },
  p:           { fontSize: 10, color: C.negro, lineHeight: 1.6, marginBottom: 6 },
  tip:         { backgroundColor: C.azulClarito, borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.azulMedio },
  tipTxt:      { fontSize: 9, color: "#1d4ed8", lineHeight: 1.5 },
  nota:        { backgroundColor: "#fefce8", borderRadius: 6, padding: 10, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: C.amarillo },
  notaTxt:     { fontSize: 9, color: "#92400e", lineHeight: 1.5 },
  li:          { flexDirection: "row", marginBottom: 4 },
  bullet:      { width: 14, color: C.teal, fontFamily: "Helvetica-Bold", fontSize: 12 },
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
  pasoNum:     { width: 22, height: 22, backgroundColor: C.teal, borderRadius: 11, alignItems: "center", justifyContent: "center", shrink: 0 },
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
    React.createElement(Text, { style: s.footerTxt }, "Evoluteca CRM — Anexo Alquiler de Salones v1.0"),
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
  if (!moduloActivo(tenant?.modulos, "salones")) {
    return NextResponse.json({ error: "Este anexo aplica solo a tenants con el módulo Salones activo" }, { status: 403 });
  }

  const doc = React.createElement(Document,
    { title: "Anexo — Alquiler de Salones — Evoluteca CRM", author: "Evoluteca", subject: "Guía del módulo Salones" },

    // ── PORTADA ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(View, { style: s.portada },
        React.createElement(View, { style: s.portadaLogos },
          React.createElement(Image, { style: s.logoEvol, src: "https://evoluteca-crm-six.vercel.app/Logo%20Evoluteca.png" }),
          React.createElement(Image, { style: s.logoFGJ,  src: "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg" }),
        ),
        React.createElement(View, { style: s.portadaAzul },
          React.createElement(Text, { style: s.portadaTit }, "Anexo — Alquiler"),
          React.createElement(Text, { style: s.portadaTit }, "de Salones"),
          React.createElement(Text, { style: s.portadaSub }, "Módulo Salones — Evoluteca CRM"),
          React.createElement(View, { style: { marginTop: 60 } },
            React.createElement(Text, { style: { fontSize: 11, color: "#99f6e4", marginBottom: 6 } }, "Contenido de este anexo:"),
            ...[
              "1. Para quién es este anexo",
              "2. Catálogo de salones",
              "3. Vincular un salón a una cotización u oportunidad",
              "4. Horarios y choques de fecha",
              "5. Calendario de reservas",
              "6. Alquileres por día",
              "7. Preguntas frecuentes",
            ].map(item => React.createElement(Text, { key: item, style: { fontSize: 10, color: "#ccfbf1", marginBottom: 3 } }, item)),
          ),
          React.createElement(View, { style: { marginTop: 40 } },
            React.createElement(Text, { style: s.portadaVer }, `Versión 1.2 · ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })} · crm.evoluteca.com`),
          ),
        ),
      ),
    ),

    // ── CAPÍTULO 1 y 2 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "1. Para quién es este anexo"),
      React.createElement(P, null, "Este documento complementa el Manual de Usuario general de Evoluteca CRM y describe únicamente las funcionalidades adicionales del módulo Salones: catálogo de espacios, vinculación a cotizaciones y oportunidades, control de horarios y choques de fecha, calendario mensual con arrastrar y soltar, y la vista de alquileres por día. Si tu negocio no alquila salones o espacios físicos, este anexo no te aplica."),
      React.createElement(Nota, null, "El módulo Salones es opcional y se activa desde Configuración > Módulos opcionales. Si no ves \"Salones\" en tu menú lateral, pide a tu Administrador que lo active."),

      React.createElement(H1, null, "2. Catálogo de salones"),
      React.createElement(P, null, "Ve a Salones en el menú lateral para ver el catálogo de espacios que alquilas. Cada salón tiene nombre, capacidad en personas y una descripción libre (piso, características, etc.)."),

      React.createElement(H2, null, "2.1 Agregar un salón"),
      React.createElement(Paso, { n: 1, titulo: "Nuevo salón", desc: 'Haz clic en "+ Nuevo salón" en la parte superior de la página.' }),
      React.createElement(Paso, { n: 2, titulo: "Completar datos", desc: "El nombre es obligatorio (ej: Salón Principal, Salón A, Terraza). Capacidad y descripción son opcionales." }),
      React.createElement(Paso, { n: 3, titulo: "Guardar", desc: 'Haz clic en "Agregar salón". El nuevo espacio aparece de inmediato como tarjeta en el catálogo.' }),
      React.createElement(Tip, null, "Registra la capacidad de cada salón: te sirve como referencia rápida al cotizar un evento y comparar contra el aforo esperado."),

      React.createElement(H2, null, "2.2 Editar o desactivar un salón"),
      React.createElement(P, null, "Al pasar el cursor sobre una tarjeta de salón aparecen los enlaces Editar y Quitar. Editar abre el mismo formulario con los datos actuales para modificarlos. Quitar desactiva el salón (no lo elimina de forma permanente ni borra su historial de reservas), y deja de aparecer como opción al crear nuevas cotizaciones."),
    ),

    // ── CAPÍTULO 3 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "3. Vincular un salón a una cotización u oportunidad"),
      React.createElement(P, null, "Con el módulo Salones activo, tanto el formulario de Nueva cotización como el de Nueva oportunidad (Pipeline) muestran un selector de Salón adicional al campo de texto libre \"Sede / Lugar\"."),

      React.createElement(H2, null, "3.1 Elegir el salón al cotizar"),
      React.createElement(Paso, { n: 1, titulo: "Ir a Nueva cotización", desc: "En la sección \"Detalles del evento\", el selector Salón muestra todos los espacios activos de tu catálogo." }),
      React.createElement(Paso, { n: 2, titulo: "Elegir salón y fecha", desc: "Selecciona el salón y la fecha del evento. El sistema consulta automáticamente si ya hay otra reserva ese día para ese mismo salón." }),
      React.createElement(Paso, { n: 3, titulo: "Revisar el aviso de disponibilidad", desc: "Si aparece un aviso (ver capítulo 4), decide si continúas de todas formas o cambias de fecha o salón." }),
      React.createElement(Nota, null, "Si aún no tienes salones en tu catálogo, el selector muestra un aviso con un enlace directo para agregar uno — no es necesario salir del formulario de cotización a medias."),

      React.createElement(H2, null, "3.2 Vincular un salón desde el Pipeline"),
      React.createElement(P, null, "El mismo selector de salón, con el mismo aviso de disponibilidad, está disponible al crear o editar una oportunidad directamente desde el Pipeline — útil cuando aún no existe una cotización formal pero ya se está negociando una fecha y un espacio con el cliente."),
    ),

    // ── CAPÍTULO 4 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "4. Horarios y choques de fecha"),
      React.createElement(P, null, "El sistema evita que dos eventos reserven el mismo salón en el mismo horario, pero sí permite varios eventos distintos el mismo día en el mismo salón si sus horarios no se cruzan (ej: un evento en la mañana y otro en la noche)."),

      React.createElement(H2, null, "4.1 Definir el horario de un evento"),
      React.createElement(P, null, "Al elegir un salón y una fecha en Nueva cotización, aparece el campo Horario con hora de inicio y hora de fin. Es opcional: si lo dejas vacío, el evento se reserva el día completo."),
      React.createElement(Tip, null, "Usa el horario siempre que puedas: te permite aprovechar el mismo salón para más de un evento en el mismo día sin que el sistema los marque como choque."),

      React.createElement(H2, null, "4.2 Aviso de choque de fechas"),
      React.createElement(LI, null, "Aviso rojo \"Ya reservado ese día\" — hay una cotización en estado ACEPTADA que se cruza con el salón, fecha y horario elegidos. Lista el nombre del cliente de cada reserva en conflicto."),
      React.createElement(LI, null, "Aviso ámbar — hay cotizaciones pendientes (no aceptadas todavía) interesadas en la misma fecha y salón, sin que sea todavía un choque confirmado."),
      React.createElement(P, null, "Una reserva registrada sin horario (día completo) siempre se considera en conflicto con cualquier otro horario ese mismo día en el mismo salón, ya que ocupa el espacio por completo."),
      React.createElement(Nota, null, "El aviso es informativo: el sistema no bloquea guardar una cotización aunque haya choque. La decisión final de aceptar dos eventos superpuestos (o no) queda en manos del equipo comercial."),

      React.createElement(H2, null, "4.3 Registrar visitas al espacio en la Agenda"),
      React.createElement(P, null, "Por tener el módulo Salones activo, tu Agenda ofrece dos tipos de actividad adicionales pensados para el alquiler de espacios, además de Llamada, Reunión, Tarea y Email:"),
      React.createElement(LI, null, "Visita comercial — recorrido del cliente por el salón con fines de venta (mostrar el espacio, cotizar en sitio)"),
      React.createElement(LI, null, "Visita técnica — coordinación técnica del evento (montaje, sonido, requerimientos de producción)"),
      React.createElement(P, null, "Se crean como cualquier otra actividad de la Agenda y se vinculan al cliente, contacto y/o oportunidad del alquiler. Ver el detalle general de la Agenda en el Manual de Usuario."),
    ),

    // ── CAPÍTULO 5 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "5. Calendario de reservas"),
      React.createElement(P, null, "Ve a Salones y haz clic en \"Calendario\" para ver un calendario mensual de reservas de un salón específico. Solo se muestran las cotizaciones en estado ACEPTADA — las reservas confirmadas."),

      React.createElement(H2, null, "5.1 Navegar el calendario"),
      React.createElement(P, null, "Elige el salón en el selector superior y navega entre meses con las flechas de \"anterior\" y \"siguiente\". Cada día con reservas se resalta y muestra el nombre del cliente (y la hora de inicio, si el evento tiene horario definido)."),

      React.createElement(H2, null, "5.2 Mover una reserva arrastrando"),
      React.createElement(Paso, { n: 1, titulo: "Arrastrar la reserva", desc: "Haz clic sostenido sobre el nombre del cliente en el día actual y arrástralo hasta el nuevo día deseado." }),
      React.createElement(Paso, { n: 2, titulo: "Soltar en el nuevo día", desc: "Al soltar, el sistema verifica automáticamente si el nuevo día ya tiene otra reserva aceptada para ese salón." }),
      React.createElement(Paso, { n: 3, titulo: "Confirmar si hay choque", desc: "Si hay conflicto, aparece una ventana de confirmación con el nombre del cliente en conflicto. Puedes cancelar o mover de todas formas." }),
      React.createElement(P, null, "Al mover una reserva, la fecha del evento de esa cotización se actualiza automáticamente — no es necesario editarla manualmente desde su ficha."),
      React.createElement(Tip, null, "Usa el calendario para reprogramar visualmente cuando un cliente pide cambiar de fecha, en vez de editar la fecha desde el detalle de la cotización."),

      React.createElement(H2, null, "5.3 Cotizaciones pendientes del mes"),
      React.createElement(P, null, "Debajo del calendario, si hay cotizaciones del salón elegido con fecha de evento dentro del mes que estás viendo pero que todavía no pasaron a estado Aceptada, aparece la sección \"Cotizaciones con fecha este mes, aún no aceptadas\" en un panel ámbar aparte. Cada fila muestra el cliente, la fecha, la hora (si la tiene) y el estado actual (Borrador, Enviada o Rechazada)."),
      React.createElement(Tip, null, "Revísala antes de confirmar una reserva nueva: te avisa qué otras cotizaciones ya están interesadas en fechas de ese mes para el mismo salón, aunque todavía no sean una reserva confirmada."),
    ),

    // ── CAPÍTULO 6 y 7 ──
    React.createElement(Page, { size: "A4", style: s.page },
      React.createElement(PageHeader, null),
      React.createElement(Footer, null),
      React.createElement(H1, null, "6. Alquileres por día"),
      React.createElement(P, null, "Ve a Salones y haz clic en \"Ver por día\" para ver, en una sola tabla, todos los salones de tu catálogo con sus reservas confirmadas (estado ACEPTADA) para una fecha específica."),
      React.createElement(H2, null, "6.1 Cómo usarla"),
      React.createElement(Paso, { n: 1, titulo: "Elegir la fecha", desc: "Usa el selector de fecha en la parte superior. Por defecto muestra el día de hoy." }),
      React.createElement(Paso, { n: 2, titulo: "Leer la tabla", desc: "Cada fila es un salón. Si no tiene reservas ese día, se marca \"Disponible todo el día\" en verde. Si tiene una o más, se listan con su horario (o \"Todo el día\" si no tiene horario definido) y el nombre del cliente." }),
      React.createElement(Paso, { n: 3, titulo: "Ir al detalle", desc: "Haz clic en cualquier reserva de la tabla para abrir directamente el detalle de esa cotización." }),
      React.createElement(Tip, null, "Es la vista más rápida para responder por teléfono \"¿tienen algún salón libre el [fecha]?\" sin tener que revisar salón por salón en el calendario."),

      React.createElement(H1, null, "7. Preguntas frecuentes"),
      React.createElement(H2, null, "¿Por qué no veo el módulo Salones en el menú?"),
      React.createElement(P, null, "Es un módulo opcional. Pide a tu Administrador que lo active desde Configuración > Módulos opcionales."),

      React.createElement(H2, null, "¿El aviso de choque de fechas bloquea guardar la cotización?"),
      React.createElement(P, null, "No. Es solo informativo — te avisa del conflicto pero la decisión de aceptar o no dos eventos el mismo día queda en tu equipo comercial."),

      React.createElement(H2, null, "¿Qué pasa si desactivo un salón que ya tiene reservas?"),
      React.createElement(P, null, "Las cotizaciones y oportunidades que ya lo tenían vinculado no se modifican ni pierden su historial. El salón desactivado simplemente deja de aparecer como opción al crear nuevas cotizaciones u oportunidades."),

      React.createElement(H2, null, "¿El calendario y la tabla por día muestran cotizaciones en borrador?"),
      React.createElement(P, null, "El calendario en sí y la tabla por día muestran únicamente cotizaciones en estado ACEPTADA — las reservas ya confirmadas. Pero justo debajo del calendario (no en la tabla por día) hay una sección aparte, \"Cotizaciones con fecha este mes, aún no aceptadas\" (ver 5.3), que sí lista las cotizaciones en Borrador, Enviada o Rechazada con fecha dentro de ese mes, para que las tengas presentes aunque todavía no sean una reserva confirmada."),

      React.createElement(Sep, null),

      React.createElement(View, { style: { paddingHorizontal: 40, paddingTop: 20 }, wrap: false },
        React.createElement(View, { style: { backgroundColor: C.teal, borderRadius: 10, padding: 20 } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.blanco, marginBottom: 6 } }, "¿Necesitas ayuda adicional?"),
          React.createElement(Text, { style: { fontSize: 10, color: "#99f6e4", lineHeight: 1.6 } },
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
      "Content-Disposition": 'attachment; filename="anexo-salones-evoluteca-crm.pdf"',
    },
  });
}
