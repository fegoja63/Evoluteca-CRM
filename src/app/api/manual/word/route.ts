import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, TableCell, TableRow, Table,
  WidthType, ShadingType, NumberFormat, Header, Footer,
  PageNumber, UnderlineType,
} from "docx";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AZUL  = "1E3A8A";
const AZULM = "2563EB";
const GRIS  = "64748B";
const VERDE = "059669";

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZULM, space: 4 } },
    run: { color: AZULM, bold: true, size: 32 },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    run: { color: AZUL, bold: true, size: 26 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    run: { color: GRIS, bold: true, size: 22 },
  });
}

function p(text: string, options?: { bold?: boolean; color?: string; italic?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: options?.color ?? "1E293B", bold: options?.bold, italics: options?.italic })],
    spacing: { after: 120 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: "1E293B" })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function paso(n: number, titulo: string, desc: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `Paso ${n}: `, bold: true, size: 22, color: AZULM }),
        new TextRun({ text: titulo, bold: true, size: 22, color: "1E293B" }),
      ],
      spacing: { before: 120, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: desc, size: 21, color: GRIS, italics: true })],
      spacing: { after: 120 },
      indent: { left: 360 },
    }),
  ];
}

function tip(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `💡 Tip: ${text}`, size: 21, color: "1D4ED8", italics: true })],
    spacing: { before: 100, after: 100 },
    indent: { left: 360, right: 360 },
    shading: { type: ShadingType.SOLID, color: "DBEAFE" },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: AZULM, space: 6 } },
  });
}

function nota(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `⚠️ Nota: ${text}`, size: 21, color: "92400E", italics: true })],
    spacing: { before: 100, after: 100 },
    indent: { left: 360, right: 360 },
    shading: { type: ShadingType.SOLID, color: "FEF3C7" },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: "F59E0B", space: 6 } },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new TextRun({ break: 1 })], spacing: { after: 0 } });
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })], alignment: AlignmentType.LEFT })],
          shading: { type: ShadingType.SOLID, color: AZUL },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })),
      }),
      ...rows.map((row, i) => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })], alignment: AlignmentType.LEFT })],
          shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? "FFFFFF" : "F8FAFC" },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })),
      })),
    ],
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const doc = new Document({
    title: "Manual de Usuario — Evoluteca CRM",
    description: "Guía completa de uso del CRM",
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Calibri", size: 22 },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          run: { font: "Calibri", bold: true, size: 32, color: AZULM },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          run: { font: "Calibri", bold: true, size: 26, color: AZUL },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          run: { font: "Calibri", bold: true, size: 22, color: GRIS },
        },
      ],
    },
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: "Evoluteca CRM — Manual de Usuario", size: 18, color: GRIS })],
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0", space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "crm.evoluteca.com  ·  Página ", size: 18, color: GRIS }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRIS }),
              new TextRun({ text: " de ", size: 18, color: GRIS }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GRIS }),
            ],
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0", space: 4 } },
          })],
        }),
      },
      children: [

        // PORTADA
        new Paragraph({
          children: [new TextRun({ text: "Evoluteca CRM", bold: true, size: 72, color: AZUL })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Manual de Usuario", size: 40, color: GRIS, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Guía completa de uso del sistema", size: 26, color: GRIS })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Versión 1.18  ·  ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`, size: 20, color: GRIS, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "crm.evoluteca.com", size: 20, color: AZULM, underline: { type: UnderlineType.SINGLE } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
        }),
        pageBreak(),

        // ÍNDICE
        h1("Contenido"),
        ...([
          "1. Primeros pasos y configuración",
          "2. El Dashboard: tu página de inicio",
          "3. Gestión de clientes y contactos",
          "4. Pipeline de ventas",
          "5. Agenda y actividades",
          "6. Cotizaciones formales",
          "7. Catálogo de servicios",
          "8. Importación de datos desde Excel",
          "9. Reportes y metas",
          "10. Configuración y equipo",
          "11. Preguntas frecuentes",
        ].map(item => new Paragraph({
          children: [new TextRun({ text: item, size: 22, color: "1E293B" })],
          spacing: { after: 100 },
          bullet: { level: 0 },
        }))),
        pageBreak(),

        // CAP 1
        h1("1. Primeros pasos"),
        p("Evoluteca CRM es una herramienta diseñada para que pequeñas y medianas empresas gestionen sus clientes, oportunidades de venta y actividades comerciales desde un solo lugar."),
        h2("1.1 Acceso inicial"),
        ...paso(1, "Recibir tus credenciales", "Tu asesor Evoluteca activa la cuenta de tu empresa y te envía tu correo y una contraseña temporal para ingresar a crm.evoluteca.com."),
        ...paso(2, "Primer ingreso", "Ve a crm.evoluteca.com e inicia sesión con las credenciales que recibiste. Te recomendamos cambiar tu contraseña desde Mi perfil apenas entres."),
        ...paso(3, "Guía de inicio", "Busca la Guía de inicio en el menú lateral. Te llevará paso a paso a importar datos, crear tu primer cliente o explorar el pipeline."),
        ...paso(4, "Configuración inicial", "Si eres Administrador, ve a Configuración para personalizar el nombre de tu empresa y activar módulos opcionales."),
        tip("Puedes volver a la Guía de inicio desde el menú lateral (Guía de inicio) en cualquier momento."),
        nota("El registro de cuentas nuevas no es autoservicio: solo tu asesor Evoluteca puede activar una empresa nueva en la plataforma. Si olvidaste tu contraseña, usa el enlace \"¿Olvidaste tu contraseña?\" en la pantalla de inicio de sesión (el enlace de restablecimiento es válido por 1 hora), o pídele a tu Administrador que te la restablezca desde Equipo."),
        h2("1.2 Módulos del sistema"),
        makeTable(
          ["Módulo", "Para qué sirve"],
          [
            ["Dashboard", "Resumen rápido: clientes, actividades pendientes y oportunidades activas"],
            ["Clientes", "Empresas y cuentas. Cada cliente tiene su ficha 360°"],
            ["Contactos", "Personas dentro de cada cliente, con vinculación a empresa y oportunidades"],
            ["Pipeline", "Oportunidades organizadas por etapa con drag & drop"],
            ["Agenda", "Actividades: llamadas, reuniones, tareas y correos"],
            ["Cotizaciones", "Vista de oportunidades activas con filtros"],
            ["Nueva cotización", "Documentos formales con ítems, precios y PDF"],
            ["Catálogo", "Servicios reutilizables para cotizaciones"],
            ["Reportes", "KPIs, embudo, top clientes y metas de ventas"],
            ["Datos", "Importar desde Excel y exportar cotizaciones"],
            ["Configuración", "Nombre, módulos opcionales y equipo"],
          ],
        ),
        h2("1.3 Navegación y uso desde el celular"),
        p("El menú lateral izquierdo contiene todos los módulos del CRM; el módulo activo se resalta en azul. En dispositivos móviles el menú se oculta: toca el ícono de menú (tres líneas) para abrirlo como panel deslizante."),
        p("En móvil el CRM activa además una barra de navegación inferior (Dashboard, Clientes, Pipeline, Agenda y Cotizaciones) y un botón flotante + (azul, abajo a la derecha) con acciones rápidas: nueva actividad, nuevo cliente, nueva cotización y ver pipeline."),
        tip("El CRM está optimizado para móvil: puedes gestionar clientes, pipeline y agenda desde tu teléfono sin perder funcionalidad."),
        h2("1.4 Búsqueda global"),
        p("En la parte superior del menú lateral hay un buscador (\"Buscar...\"). Escribe al menos 2 letras y el sistema muestra, mientras tecleas, coincidencias en todos los tipos de registro a la vez: clientes, contactos, oportunidades, cotizaciones y actividades. Haz clic en un resultado para ir directo a su ficha."),
        tip("Es la forma más rápida de abrir un cliente o una cotización sin recorrer el listado. El buscador respeta tus permisos: solo encuentra registros que tu rol puede ver."),
        h2("1.5 Personalizar el orden del menú"),
        p("Junto al título \"Menú\" hay un botón \"Ordenar\". Al activarlo, cada módulo muestra una agarradera para arrastrarlo a la posición que prefieras; el nuevo orden se guarda automáticamente en tu perfil. Con \"Restablecer\" vuelves al orden original."),
        nota("El orden del menú es personal de cada usuario — no afecta a tus compañeros. Un módulo recién activado aparece al final de tu menú sin alterar el orden que ya definiste."),
        h2("1.6 Ayuda dentro del sistema"),
        p("Ve a Ayuda / Soporte en el menú lateral. Abre con un buscador de preguntas frecuentes agrupadas por módulo — escribe cualquier palabra clave, con o sin tildes. Debajo del buscador sigue disponible el formulario para reportar un error o enviar una sugerencia al equipo de Evoluteca."),
        pageBreak(),

        // CAP 2 — DASHBOARD
        h1("2. El Dashboard: tu página de inicio"),
        p("Al iniciar sesión llegas al Dashboard: un resumen ejecutivo de tu operación comercial, pensado para ver de un vistazo qué necesita tu atención hoy."),
        h2("2.1 Indicadores principales"),
        makeTable(
          ["Indicador", "Qué mide"],
          [
            ["Empresas", "Clientes registrados, con enlace directo al listado de Clientes"],
            ["Contactos", "Personas en tu red, vinculadas a las empresas"],
            ["Oportunidades", "Oportunidades activas en el pipeline (no cerradas)"],
            ["Tareas pendientes", "Actividades sin completar; el subtítulo indica cuántas son de hoy"],
            ["Salud comercial", "Puntaje de 0 a 100 que resume la salud del pipeline (ver 2.6)"],
          ],
        ),
        nota("El banner superior, aparte, muestra \"Meta del mes\" y \"Meta del año\" (gauges de cumplimiento), y las cifras de Ganado este mes, Pipeline activo y Tasa de cierre."),
        h2("2.2 Estado del pipeline"),
        p("Muestra cuántas oportunidades y cuánto valor hay en cada etapa (Prospecto, Calificado, Cotización, Negociación, Ganada, Perdida), con un enlace directo al Kanban del Pipeline."),
        h2("2.3 Actividades de hoy"),
        p("Tarjeta ubicada en la primera fila del Dashboard, junto a Pipeline y Oportunidades calientes, para que lo más urgente del día quede visible de inmediato al entrar. Cada actividad pendiente de hoy se muestra resaltada en rojo, igual que en la Agenda (ver 5.3)."),
        h2("2.4 Oportunidades calientes y Ganadas este mes"),
        p("\"Oportunidades calientes\" lista las 5 oportunidades activas de mayor valor. \"Ganadas este mes\" muestra los negocios cerrados como GANADOS en el mes actual — un buen indicador del momentum del equipo."),
        h2("2.5 Rendimiento del equipo"),
        p("Ranking de vendedores ordenados por valor ganado en el mes, con oportunidades activas, tasa de cierre, valor ganado y valor en pipeline de cada uno. Debajo, una barra muestra el total ganado por el equipo contra la meta del mes."),
        h2("2.6 Salud comercial"),
        p("Puntaje de 0 a 100 con una barra de progreso y un checklist de 5 factores: seguimiento activo, tasa de cierre, tareas vencidas, negocios estancados y movimiento del pipeline."),
        h2("2.7 Panel de alertas (\"Requieren atención\")"),
        p("Reúne lo que necesita seguimiento: actividades vencidas, negocios sin actividad reciente, cierres previstos para esta semana, cotizaciones enviadas sin respuesta y, si tienes los módulos correspondientes activos, plazos procesales próximos a vencer o funciones con ocupación baja."),
        tip("El objetivo diario es llegar al Dashboard sin alertas pendientes en este panel."),
        h2("2.8 Meta del mes y meta del año (gauges)"),
        p("En la parte superior del Dashboard hay dos medidores circulares: Meta del mes y Meta del año. Cada uno muestra el porcentaje alcanzado sobre los negocios cerrados como GANADOS versus el objetivo configurado en COP. Solo aparecen si tienes una meta configurada de ese tipo."),
        bullet("Rojo: menos del 60% de la meta alcanzada"),
        bullet("Ámbar: entre 60% y 99%"),
        bullet("Verde: 100% o más — meta alcanzada o superada"),
        tip("Configura la meta mensual o anual desde Reportes → Configurar metas. Deja el campo Mes en blanco para que sea meta anual. Sin meta configurada, el gauge correspondiente no aparece."),
        pageBreak(),

        // CAP 3
        h1("3. Clientes y contactos"),
        h2("3.1 Crear un cliente"),
        p("Ve a Clientes → botón \"+ Nuevo cliente\". El nombre de la empresa es obligatorio. Los demás campos son opcionales pero recomendados."),
        tip("El sector ayuda a filtrar y segmentar clientes. Elige el más cercano a la actividad del cliente."),
        h2("3.2 Ficha 360° del cliente"),
        p("Haz clic en cualquier cliente para abrir su ficha. Verás:"),
        bullet("Datos generales (editable con botón Editar)"),
        bullet("Contactos vinculados con botón directo a WhatsApp"),
        bullet("Oportunidades de venta y su etapa actual"),
        bullet("Actividades registradas y formulario para crear nuevas"),
        bullet("Cotizaciones formales emitidas"),
        bullet("Timeline 360°: historial cronológico de todas las interacciones"),
        h2("3.3 Timeline 360°"),
        p("El timeline unifica en orden cronológico: actividades, oportunidades, cotizaciones y eventos manuales. Puedes registrar:"),
        bullet("NOTA: observaciones o recordatorios libres"),
        bullet("LLAMADA: resumen de conversación telefónica"),
        bullet("EMAIL: registro de correo enviado o recibido"),
        bullet("REUNION: acta o resumen de reunión"),
        bullet("WHATSAPP: resumen de conversación por WhatsApp"),
        tip("Para eliminar un evento del timeline, pasa el cursor sobre él y haz clic en la × que aparece a la derecha."),
        h2("3.4 Contactos y WhatsApp"),
        p("Los contactos son personas dentro de un cliente. Si el contacto tiene teléfono registrado, aparece el botón 💬 WhatsApp que abre la conversación directamente con ese número."),
        nota("Un contacto puede existir sin empresa (contacto independiente)."),
        h2("3.5 Papelera (recuperar registros eliminados)"),
        p("Al eliminar un Cliente, Contacto, Oportunidad o Cotización, el registro no se borra de inmediato: se mueve a la Papelera (menú lateral), donde queda disponible para restaurarlo o eliminarlo definitivamente. La Papelera tiene una sección separada para cada uno de los cuatro tipos de registro."),
        nota("Eliminar de forma permanente desde la Papelera solo está disponible para el rol ADMINISTRADOR, y no se puede deshacer."),
        h2("3.6 Acciones rápidas desde la ficha"),
        p("En la sección de Actividades dentro de la ficha del cliente hay tres botones de acción rápida: Llamada, Email y Reunión. Al hacer clic, el formulario se abre con ese tipo pre-seleccionado, sin ir a la Agenda."),
        tip("Registra una llamada en segundos: abre la ficha del cliente, clic en Llamada, escribe el resumen y Guardar."),
        h2("3.7 WhatsApp con plantillas"),
        p("En las fichas de contacto y cliente, el botón WhatsApp abre un panel con plantillas de mensaje pre-llenadas (saludo inicial, seguimiento de cotización, confirmar reunión, recordatorio de evento, cierre de negocio o mensaje libre). Elige una, edita el texto si quieres y abre WhatsApp para enviarlo."),
        tip("Todas las plantillas incluyen el nombre del contacto automáticamente. El mensaje nunca se envía sin que lo veas primero."),
        h2("3.8 Notas rápidas"),
        p("En las fichas de cliente, contacto y oportunidad hay un área de notas internas. Haz clic en el texto para editar, escribe y presiona Ctrl+Enter para guardar (o Esc para cancelar). Las notas son internas — no se muestran al cliente."),
        h2("3.9 Archivos adjuntos"),
        p("En la ficha de un Cliente, Contacto u Oportunidad hay una sección \"Archivos adjuntos\" para subir contratos, cédulas, fotos o cotizaciones firmadas (máximo 5MB por archivo), directamente desde tu computador. Cada archivo puedes descargarlo o eliminarlo, y queda vinculado a ese único registro."),
        nota("Los archivos se guardan de forma segura dentro del CRM, no en un servicio externo, y no se comparten entre organizaciones distintas."),
        h2("3.10 Resumen con IA"),
        p("En la ficha de cada cliente está el panel \"Resumen con IA\". Al hacer clic en \"Generar resumen\", el CRM analiza toda la cuenta (contactos, oportunidades abiertas/ganadas/perdidas, actividades y cotizaciones) junto con métricas ya calculadas (valor ya ganado, valor en juego, tasa de conversión, cotizaciones vencidas, días desde la última interacción) y redacta en segundos un informe accionable, que aparece a medida que se escribe. Trae seis secciones:"),
        bullet("Panorama de la cuenta — antigüedad de la relación, sector, valor ya ganado, valor en juego y recurrencia"),
        bullet("Relación y actividad — hace cuánto fue la última interacción y tareas pendientes o vencidas"),
        bullet("Oportunidades y cotizaciones — negocios abiertos con su etapa y probabilidad, y el estado de las cotizaciones (enviadas, aceptadas, vencidas)"),
        bullet("Señales — riesgos (inactividad, cotizaciones sin respuesta, negocios perdidos y su motivo) u oportunidades (recompra, negocios calientes)"),
        bullet("Contactos clave — con quién conviene hablar y quién parece decidir, según los cargos"),
        bullet("Próximas acciones — 2 o 3 gestiones concretas y priorizadas para ese cliente"),
        nota("Los Resúmenes con IA dependen del plan de tu organización: pueden ser ilimitados o tener un tope mensual (visible en el mismo panel como \"12 / 100 este mes\"). Ese cupo es compartido con el Brief del pipeline con IA (ver 4.10): ambas funciones descuentan del mismo contador. Si tu plan no las incluye, o si alcanzaste el tope del mes, el botón se deshabilita con el aviso correspondiente."),
        tip("Úsalo antes de una llamada o reunión para ponerte al día de una cuenta en segundos. Solo usa datos reales del CRM — no inventa cifras ni consulta información externa."),
        h2("3.11 Editar y eliminar desde las listas"),
        p("No necesitas abrir la ficha completa: en las listas de Clientes, Contactos y Cotizaciones, cada fila tiene un botón Editar (lápiz) que abre una ventana para modificar los datos sin salir del listado, y un botón Eliminar (papelera) que pide confirmación y mueve el registro a la Papelera."),
        nota("El botón Eliminar solo aparece para los roles con permiso (Administrador y Gerente)."),
        pageBreak(),

        // CAP 4
        h1("4. Pipeline de ventas"),
        p("El pipeline organiza visualmente las oportunidades de venta por etapa. Cada tarjeta muestra cliente, valor y fecha. Puedes moverlas con drag & drop."),
        h2("4.1 Etapas"),
        makeTable(
          ["Etapa", "Significado"],
          [
            ["Prospecto",   "Lead identificado, aún sin calificar"],
            ["Calificado",  "Cliente potencial real con necesidad y presupuesto confirmados"],
            ["Cotización",  "Se ha presentado propuesta o cotización formal"],
            ["Negociación", "En ajuste de condiciones, precios o alcance"],
            ["Ganada",      "Negocio cerrado exitosamente"],
            ["Perdida",     "No se cerró (competencia, presupuesto, timing, etc.)"],
          ],
        ),
        h2("4.2 Crear y gestionar oportunidades"),
        p("Haz clic en \"+ Nueva oportunidad\". Ingresa título, valor estimado, empresa, contacto, etapa y fecha de evento. Desde la ficha de la oportunidad puedes cambiar etapa, crear actividades y emitir cotizaciones."),
        tip("El valor de la oportunidad es clave para los reportes. Ingrésalo siempre, aunque sea estimado."),
        h2("4.3 Motivo de pérdida"),
        p("Al mover una oportunidad a la etapa Perdida (arrastrando la tarjeta o cambiando la etapa desde la ficha), el sistema muestra un modal para elegir un motivo antes de completar el cambio: Precio muy alto, Eligió a la competencia, El evento fue cancelado, Sin respuesta del cliente, Presupuesto insuficiente, Fuera de fechas disponibles u Otro. El motivo queda guardado como dato de la oportunidad y alimenta el reporte de Motivos de pérdida (ver 9.3)."),
        nota("Si cancelas el modal sin elegir un motivo, la oportunidad no se mueve a Perdida — el cambio solo se confirma junto con el motivo."),
        h2("4.4 Indicadores de urgencia"),
        p("Cada tarjeta del kanban muestra un borde de color a la izquierda según la antigüedad de la oportunidad: verde (menos de 15 días), amarillo (15 a 30 días) y rojo (más de 30 días). En la esquina inferior derecha aparece un badge con los días (ej: \"22d\"). Las oportunidades Ganadas o Perdidas no muestran indicador."),
        tip("Usa los colores para priorizar tu día: comienza por las tarjetas rojas."),
        h2("4.5 Vista tabla del pipeline"),
        p("Además del kanban, el pipeline tiene una vista de tabla (toggle Kanban / Tabla en la barra de filtros). Muestra todas las oportunidades en filas con columnas ordenables (oportunidad, empresa, etapa, valor, probabilidad, fecha de cierre); haz clic en el encabezado de una columna para ordenar."),
        h2("4.6 Historial de etapas"),
        p("Cada oportunidad registra automáticamente cada cambio de etapa. En su ficha, el panel \"Historial de etapas\" muestra una línea de tiempo con la etapa anterior y nueva, la fecha y hora, los días que estuvo en la etapa anterior y el usuario que hizo el cambio. Es automático, no requiere ninguna acción."),
        h2("4.7 Filtro por vendedor"),
        p("Administrador y Gerente ven en la barra de filtros del Pipeline un selector \"Vendedor\" (no visible para el rol Comercial). Al elegir un vendedor, el kanban y la vista de tabla se filtran para mostrar solo sus oportunidades."),
        h2("4.8 Archivos adjuntos"),
        p("La ficha de cualquier oportunidad (y también las de Clientes y Contactos) tiene una sección \"Archivos adjuntos\" para subir contratos, cotizaciones firmadas o fotos del negocio. Ver el detalle en 3.9."),
        h2("4.9 Número de cotización al avanzar de etapa"),
        p("Al mover una oportunidad desde Prospecto o Calificado hacia otra etapa (excepto Perdida), el sistema pregunta opcionalmente el número de cotización asociado. Es opcional: si lo dejas vacío o cancelas, la oportunidad avanza igual; si lo ingresas, queda guardado y se puede consultar y buscar más adelante."),
        h2("4.10 Brief del pipeline con IA"),
        p("En la parte superior del Pipeline está el panel \"Brief del pipeline con IA\". Al hacer clic en \"Generar brief\", el CRM analiza todo el pipeline (o solo el tuyo, según tu rol) y produce en segundos un resumen ejecutivo para la reunión de ventas, que aparece a medida que se escribe. Trae cinco secciones:"),
        bullet("Panorama — tamaño del pipeline abierto, valor total y valor ponderado por probabilidad"),
        bullet("Calientes — los negocios con mayor probabilidad de cierre próximo"),
        bullet("En riesgo — negocios estancados (muchos días en la misma etapa), inactividad o patrones de pérdida reciente"),
        bullet("Meta — avance del mes contra el objetivo y si el pipeline alcanza para cerrar la brecha"),
        bullet("Prioridades de la semana — 2 o 3 acciones concretas para estos datos"),
        nota("Respeta los permisos por rol: un COMERCIAL ve solo su pipeline y su meta; el Gerente y el Administrador ven todo el equipo. Usa los nombres de etapa personalizados de tu organización. Comparte el mismo cupo mensual de IA con el Resumen con IA de cliente (ver 3.10)."),
        tip("Genéralo antes del stand-up o la reunión semanal para llegar con el panorama, los riesgos y las prioridades ya listos."),
        pageBreak(),

        // CAP 5 — AGENDA
        h1("5. Agenda y actividades"),
        p("La agenda centraliza todas las actividades comerciales. Cada actividad puede vincularse a un cliente, contacto y/o oportunidad."),
        h2("5.1 Tipos"),
        bullet("LLAMADA — Llamada telefónica"),
        bullet("REUNIÓN — Reunión presencial o virtual"),
        bullet("TAREA — Acción interna (preparar propuesta, enviar info, etc.)"),
        bullet("EMAIL — Seguimiento por correo"),
        bullet("VISITA COMERCIAL — Visita al espacio con fines de venta (recorrido, cotización en sitio)"),
        bullet("VISITA TÉCNICA — Visita de coordinación técnica del evento (montaje, sonido, requerimientos)"),
        nota("Los tipos Visita comercial y Visita técnica solo aparecen en tenants con el módulo Funciones o Salones activo (vertical de teatros y alquiler de espacios); en los demás tenants no se muestran."),
        h2("5.2 Crear y completar"),
        p("Crea actividades desde la Agenda o directamente desde las fichas de cliente, contacto u oportunidad. Marca el checkbox para completarlas. Las actividades pendientes de hoy se resaltan en rojo, tanto en la Agenda como en el Dashboard."),
        h2("5.3 Lista o Calendario"),
        p("En la parte superior de la Agenda hay un selector \"Lista / Calendario\" para cambiar cómo ves tus actividades."),
        bullet("Lista: muestra las actividades según el filtro activo (Pendientes, Todas o Vencidas), una debajo de otra."),
        bullet("Calendario: muestra el mes completo en cuadrícula, con un punto de color por tipo de actividad en cada día (rojo si alguna está vencida). Haz clic en un día para ver el detalle en un panel debajo del calendario."),
        tip("Usa Calendario para ver de un vistazo cómo se distribuye tu carga del mes; usa Lista cuando quieras despachar tareas una por una."),
        h2("5.4 Notificaciones por email"),
        p("Cada mañana a las 8am el CRM envía automáticamente hasta 3 tipos de alertas por email:"),
        bullet("Actividades vencidas: tareas o llamadas pendientes con días de atraso (rojo 7d o más, ámbar 2d o más)"),
        bullet("Negocios estancados: oportunidades activas sin ninguna actividad registrada en más de 14 días"),
        bullet("Cierres próximos: negocios con fecha de cierre estimada en los próximos 7 días"),
        p("En la Agenda, las actividades vencidas muestran un ícono de campana: al tocarlo recibes el recordatorio de inmediato sin esperar al día siguiente. El Administrador puede activar o desactivar estos correos para toda la empresa desde Configuración (ver 10.1)."),
        tip("Solo recibirás el email de cada tipo si tienes situaciones reales en esa categoría. Si no tienes actividades vencidas, ese email no se envía."),
        h2("5.5 Llevar la agenda a tu calendario (Google, Outlook, Apple)"),
        p("Tienes dos formas de ver tus actividades pendientes en tu calendario personal:"),
        p("Opción 1 — Exportar (.ics): el botón iCal en la parte superior de la Agenda descarga todas tus actividades pendientes como archivo .ics, compatible con Google Calendar, Apple Calendar y Microsoft Outlook. Cada actividad se exporta con título, tipo, fecha y hora, cliente y oportunidad vinculada (duración por defecto: 1 hora). Es una fotografía del momento: descarga el .ics de nuevo cuando quieras volver a sincronizar."),
        p("Opción 2 — Suscripción en vivo (recomendada): desde Mi perfil, en la sección \"Agenda en tu calendario\", genera tu enlace privado de suscripción y pégalo en Google, Outlook o Apple. A diferencia de la exportación, este enlace se mantiene actualizado solo: cuando agregas o cambias actividades, tu calendario las refresca cada pocas horas sin volver a importar nada."),
        nota("El enlace de suscripción es privado: cualquiera que lo tenga puede ver tu agenda, así que no lo compartas. Si crees que se filtró, genera uno nuevo desde Mi perfil y el anterior deja de funcionar al instante."),
        h2("5.6 Actividades de hoy resaltadas en rojo"),
        p("En la vista de lista, cualquier actividad pendiente cuya fecha sea hoy se resalta con fondo y borde rojo y una etiqueta \"Hoy\", para que no se pierda entre las pasadas o futuras. El mismo resaltado se usa en la tarjeta \"Actividades de hoy\" del Dashboard (ver 2.3)."),
        h2("5.7 Estado y responsable de la actividad"),
        p("Además de completarla, cada actividad tiene un estado que puedes cambiar en el formulario o desde la lista: Pendiente (badge gris), En progreso (badge ámbar) o Completada (badge verde, equivale a marcar el checkbox). El campo \"Responsable\" permite asignar la actividad a otra persona del equipo en vez de a ti mismo (por defecto queda a tu nombre, \"Yo mismo\")."),
        tip("El estado \"En progreso\" es útil para tareas de varios días (preparar una propuesta grande, coordinar un evento): ves qué está arrancado y qué sigue sin tocar, sin marcarlo como completado antes de tiempo."),
        pageBreak(),

        // CAP 6 — COTIZACIONES
        h1("6. Cotizaciones formales"),
        p("Las cotizaciones formales son documentos con desglose de servicios, cantidades, precios y total. Se generan en PDF listas para enviar al cliente."),
        h2("6.1 Crear una cotización"),
        ...paso(1, "Ir a Nueva cotización", "En el menú lateral haz clic en \"📋 Nueva cotización\"."),
        ...paso(2, "Seleccionar cliente", "Elige empresa, contacto y oportunidad vinculada. Los contactos se filtran por empresa automáticamente."),
        ...paso(3, "Detalles del evento", "Ingresa sede, fecha del evento y fecha de validez."),
        ...paso(4, "Agregar ítems", "Escribe cada servicio: descripción, cantidad y precio unitario. Usa el selector del catálogo para cargar ítems predefinidos."),
        ...paso(5, "Impuestos y total", "Si aplica, define hasta dos impuestos (nombre + porcentaje, ej: IVA 19%). El sistema calcula el desglose de Subtotal, cada impuesto y Total automáticamente."),
        ...paso(6, "Guardar y descargar", "Guarda como borrador. Desde el detalle puedes cambiar estado y descargar el PDF."),
        h2("6.2 Estados"),
        makeTable(
          ["Estado", "Descripción"],
          [
            ["BORRADOR",  "Recién creada, no enviada al cliente"],
            ["ENVIADA",   "Cliente ya la recibió. Se activan opciones Aceptada / Rechazada"],
            ["ACEPTADA",  "Cliente aprobó la cotización"],
            ["RECHAZADA", "Cliente no aceptó. Puede reabrirse como borrador"],
          ],
        ),
        p("Desde el detalle cambias el estado con los botones de arriba. Desde Borrador puedes ir directo a \"Marcar aceptada\" o \"Marcar rechazada\" — útil cuando el cliente acepta por teléfono y nunca se envió el PDF."),
        tip("Al marcar una cotización como Aceptada, su negocio en el Pipeline pasa automáticamente a la etapa \"Ganada\" (la cotización es la base del pipeline). Rechazarla NO mueve el negocio, porque suele recotizarse y sigue vivo."),
        h2("6.3 La cotización siembra el Pipeline"),
        p("Al guardar una cotización que no vinculaste a una oportunidad existente, el sistema crea automáticamente un negocio en el Pipeline en la etapa \"Cotización\", con el mismo cliente, salón, fecha y valor. En el detalle, el campo \"Negocio (Pipeline)\" enlaza directo a esa tarjeta del Kanban."),
        h2("6.4 Recotizaciones y versiones"),
        p("Un mismo negocio puede tener varias cotizaciones (por ejemplo al ajustar el precio tras negociar). Crea una nueva cotización vinculada a la misma oportunidad, o usa \"Duplicar\". La versión más reciente queda vigente y las anteriores se marcan solas con un badge gris \"Reemplazada\"."),
        bullet("En el Pipeline el negocio aparece una sola vez, no una por cada versión."),
        bullet("Las cotizaciones \"Reemplazada\" no cuentan en totales ni alertas, pero siguen visibles (atenuadas) como historial."),
        h2("6.5 Impuestos y desglose"),
        p("Junto a la tabla de ítems puedes definir hasta dos impuestos, cada uno con nombre (por defecto \"IVA\", editable) y porcentaje. El desglose de Subtotal / Impuestos / Total se muestra en el detalle, el PDF descargable, el email al cliente y el link público. Puedes editarlos luego con \"Editar impuestos\"."),
        tip("El PDF se genera con el estado actual. Si haces cambios, descarga de nuevo para obtener la versión actualizada."),
        h2("6.6 Cliente, contacto y oportunidad: existente o nuevo"),
        p("En Nueva cotización, cada campo (Cliente, Contacto, Oportunidad vinculada) tiene sus propios botones Existente / + Nuevo. Con Existente eliges de la lista un registro ya creado (útil también para recotizar a un cliente que ya cotizaste); con + Nuevo lo creas sin salir del formulario. El contacto u oportunidad nuevos quedan vinculados al cliente seleccionado."),
        nota("El registro que crees aquí queda guardado de inmediato en el CRM aunque después no guardes la cotización. Si escribes datos en un mini-formulario \"+ Nuevo\" pero olvidas hacer clic en Crear, el sistema te avisa y no deja continuar."),
        h2("6.7 Descargar PDF"),
        p("Desde el detalle de cualquier cotización, el botón \"Descargar PDF\" genera el documento con el logo de tu empresa (si lo configuraste), datos del cliente y contacto, tabla de ítems, desglose de impuestos y total, y notas."),
        h2("6.8 Enviar la cotización por email"),
        p("El botón \"Enviar email\" abre un panel con un campo de correo editable, pre-llenado con el email del contacto vinculado pero que puedes cambiar por cualquier otra dirección. El correo incluye el PDF como adjunto. También puedes generar un \"Link cliente\": una URL pública de solo lectura para compartir por WhatsApp o mensaje directo, sin enviar correo."),
        h2("6.9 Fecha de validez y alertas de vencimiento"),
        p("Cada cotización puede tener una fecha de validez. El sistema monitorea las cotizaciones en estado BORRADOR o ENVIADA y muestra badges: rojo \"Vencida Xd\" o \"Vence hoy\", ámbar \"Vence en Xd\" (7 días o menos). En la lista de Cotizaciones aparece una franja roja con el conteo y un botón \"Ver vencidas\"; el Dashboard también muestra ese conteo."),
        tip("Cuando una cotización es ACEPTADA o RECHAZADA, los badges de vencimiento desaparecen — el estado definitivo ya no requiere seguimiento de validez."),
        h2("6.10 Plantillas de cotización"),
        p("En Plantillas puedes guardar combinaciones completas de ítems que usas seguido (por ejemplo, un paquete de servicios para un tipo de evento) y reutilizarlas al armar una cotización nueva. Crea una plantilla con \"+ Nueva plantilla\", edítala para cambiar nombre e ítems, o usa \"Guardar plantilla\" desde una cotización existente para crear una a partir de sus ítems."),
        nota("Editar o eliminar una plantilla no afecta las cotizaciones que ya se crearon a partir de ella — cada cotización guarda su propia copia de los ítems al momento de crearse."),
        h2("6.11 Número propio del cliente"),
        p("Además del consecutivo automático del sistema, cada cotización tiene un campo opcional \"Número del cliente\" para el consecutivo que use tu empresa o tu cliente (ej. COT-2026-045). Lo escribes al crear la cotización o lo editas después desde su detalle; si lo dejas vacío, se usa el automático. Cuando lo ingresas, aparece en la lista, el detalle, el PDF, el correo, el WhatsApp, la vista pública, la Papelera, el timeline, el Excel, el Dashboard y la ficha del cliente, y la búsqueda global también lo encuentra."),
        h2("6.12 Separador de miles en los campos de dinero"),
        p("Todos los campos de dinero del CRM (cotizaciones, catálogo, plantillas, pipeline, funciones, metas y reportes) muestran el separador de miles en formato colombiano mientras escribes (ej. 1.500.000), para verificar cifras grandes sin contar ceros. El valor se guarda como número, sin los puntos."),
        pageBreak(),

        // CAP 7 — CATÁLOGO
        h1("7. Catálogo de servicios"),
        p("El catálogo guarda los servicios que ofreces con más frecuencia, para agregarlos a una cotización sin volver a escribir su descripción y precio cada vez."),
        h2("7.1 Crear uno o varios servicios"),
        ...paso(1, "Ir al Catálogo", "En el menú lateral haz clic en \"Catálogo\"."),
        ...paso(2, "Completar los datos", "Ingresa nombre, descripción y precio unitario del servicio."),
        p("Puedes cargar varios servicios de una sola vez: con \"+ Agregar otra línea\" añades tantas filas como necesites, cada una con su nombre, descripción y precio, y con \"Agregar al catálogo\" se guardan todas juntas. Usa \"Quitar línea\" para descartar una fila antes de guardar."),
        h2("7.2 Usar el catálogo en una cotización"),
        p("Al agregar un ítem en Nueva cotización, puedes elegir un servicio del catálogo desde el selector en vez de escribir la descripción y el precio a mano; los datos se cargan automáticamente y puedes ajustar la cantidad."),
        tip("Mantener el catálogo actualizado agiliza la creación de cotizaciones y evita inconsistencias de precio entre vendedores."),
        pageBreak(),

        // CAP 6
        h1("8. Importación desde Excel"),
        p("Importa bases de datos externas. El sistema crea empresas, contactos y oportunidades vinculados automáticamente."),
        h2("8.1 Preparar el archivo"),
        bullet("Primera fila: encabezados de columnas"),
        bullet("Campos obligatorios: al menos una columna de empresa"),
        bullet("Campos recomendados: contacto, oportunidad, valor, etapa"),
        bullet("Columnas extra: se guardan automáticamente como datos adicionales"),
        nota("Si el nombre de una empresa ya existe en el CRM, no se duplica. Se vinculan los nuevos contactos a la empresa existente."),
        h2("8.2 Proceso"),
        ...paso(1, "Subir archivo", "Ve a 📥 Datos → Importar. Selecciona el archivo .xlsx."),
        ...paso(2, "Mapear columnas", "Asigna qué columna del Excel corresponde a empresa, contacto y oportunidad. El sistema muestra una muestra real de los datos para verificar."),
        ...paso(3, "Confirmar importación", "Los tres campos obligatorios deben estar mapeados. Haz clic en Importar."),
        ...paso(4, "Resultado", "El sistema muestra cuántos registros se crearon. Verifica en Clientes y Contactos."),
        tip("Si la importación no salió como esperabas, revisa el resumen de errores, corrige el Excel y vuelve a importar. No existe una función para deshacer solo los registros de una importación puntual."),
        nota("Si necesitas borrar por completo los datos de tu organización para empezar de cero, el Administrador puede hacerlo desde Configuración, en la \"Zona de peligro\" (\"Limpiar todos los datos de prueba\") — pero esa acción borra TODA la información de la empresa, no solo lo que acabas de importar, y no se puede deshacer."),
        pageBreak(),

        // CAP 7
        h1("9. Reportes y metas"),
        p("Los reportes muestran el desempeño comercial: valor ganado, tasa de cierre, pipeline por etapa, top clientes y actividad mensual."),
        h2("9.1 KPIs principales"),
        bullet("Clientes activos: total de empresas y contactos"),
        bullet("En negociación: cantidad y valor potencial de oportunidades activas"),
        bullet("Valor ganado: suma de oportunidades en etapa GANADA"),
        bullet("Tasa de cierre: % ganadas vs total cerradas (ganadas + perdidas)"),
        h2("9.2 Metas de ventas"),
        p("Haz clic en \"🎯 Configurar metas\" en la gráfica mensual. Define metas anuales o por mes específico. La gráfica muestra una línea punteada amarilla indicando el objetivo, con barra de progreso porcentual."),
        tip("Filtra por año y mes para analizar períodos específicos. El embudo y top clientes se actualizan con el filtro activo."),
        h2("9.3 Motivos de pérdida"),
        p("Muestra, para el período filtrado, un donut con la proporción de oportunidades perdidas por cada motivo (ver 4.3), junto con una lista \"Valor perdido por motivo\" que muestra lo mismo pero en dinero: qué porcentaje del total de pesos perdidos corresponde a cada motivo."),
        nota("Cada gráfica se ordena de forma independiente por su propia métrica — el donut por cantidad de negocios, la lista por valor perdido — así que el orden de los motivos puede no coincidir entre las dos. Comparar ambas te dice si el motivo que más negocios te quita es también el que más dinero te cuesta."),
        h2("9.4 Filtros de período y vendedor"),
        p("Puedes filtrar todos los reportes por año y/o mes (si eliges un mes sin año, se usa el año más reciente disponible). Administrador y Gerente ven además un filtro \"Vendedor\" para consolidar los reportes de una sola persona (no visible para el rol Comercial)."),
        h2("9.5 Gráfica mensual y cumplimiento"),
        p("La gráfica de barras muestra el valor ganado por mes del año seleccionado (barras verdes) y los negocios perdidos de ese mes (indicadores rojos). Si hay una meta configurada, aparece una línea punteada amarilla con el objetivo y el porcentaje de cumplimiento sobre cada barra, coloreado en verde (100% o más), ámbar (60–99%) o rojo (menos de 60%)."),
        h2("9.6 Top clientes"),
        p("Muestra los 5 clientes con mayor valor ganado en el período, con barras horizontales proporcionales, cantidad de negocios ganados y total de oportunidades."),
        h2("9.7 Comparativa por año"),
        p("Con datos de más de un año, compara negocios ganados, valor ganado, negocios perdidos y total de oportunidades año contra año, con un badge de variación (el año en curso se marca con borde punteado por ser incompleto). Si configuraste una meta anual, aparece además la gráfica \"Cumplimiento de meta anual\" (valor ganado vs meta, por año)."),
        h2("9.8 Metas por vendedor (Equipo → Rendimiento)"),
        p("En Equipo → Rendimiento (visible para Administrador y Gerente) ves el desempeño individual de cada vendedor con metas mensuales: barra de valor ganado en el mes y progreso hacia su meta (ámbar menos de 60%, azul 60–99%, verde 100% o más). El Administrador puede editar la meta de cada vendedor con el ícono de lápiz, ingresando el valor en COP."),
        tip("Las metas son por mes: asigna la meta de julio y verás el progreso en tiempo real ese mes. Al mes siguiente la barra se reinicia."),
        h2("9.9 Tiempo promedio de cierre"),
        p("En la tarjeta \"Negocios cerrados\" aparece el promedio de días que tardan tus oportunidades en pasar de creadas a Ganadas, calculado desde la fecha real del cambio a Ganada — refleja tu ciclo de venta real."),
        h2("9.10 Filtro por segmento y sede"),
        p("Si tu base de datos tiene información de segmento o sede/zona (por ejemplo, cargada por importación de Excel), en la barra de filtros aparecen selectores \"Segmento\" y \"Sede\" para acotar todos los reportes. Si ningún registro tiene esos datos, los selectores no aparecen."),
        pageBreak(),

        // CAP 10 — CONFIGURACIÓN
        h1("10. Configuración y equipo"),
        h2("10.1 Configuración general"),
        p("En ⚙️ Configuración puedes cambiar el nombre de tu empresa (aparece en el sidebar y en los PDFs de cotizaciones), y subir el logo de tu empresa desde un archivo de imagen (PNG o JPG, máximo 2MB) — aparece automáticamente en el encabezado de tus cotizaciones en PDF."),
        h3("10.1.1 Notificaciones automáticas por email"),
        p("El toggle \"Notificaciones automáticas por email\" controla los correos diarios del CRM (actividades vencidas, negocios estancados y cierres próximos, ver 5.4). Cuando está activo (azul), cada usuario del equipo los recibe cada mañana. Solo el Administrador puede cambiarlo; al desactivarlo, ningún usuario de la empresa los recibe."),
        nota("Recomendamos mantener los emails activos. Son el recordatorio diario que evita que los negocios se pierdan por falta de seguimiento."),
        h2("10.2 Módulos opcionales"),
        bullet("🎭 Funciones: para teatros y espectáculos. Gestiona funciones con aforo y NPS"),
        bullet("🎪 Audiencia: gestión de espectadores con segmentación"),
        bullet("⚖️ Expedientes: para firmas de abogados. Casos, plazos procesales y registro de horas"),
        bullet("🏛️ Salones: para alquiler de salones y espacios. Catálogo de salones, calendario de reservas y aviso de choque de fechas"),
        h2("10.3 Equipo"),
        p("En 👥 Equipo gestiona los usuarios. Roles disponibles:"),
        makeTable(
          ["Rol", "Permisos"],
          [
            ["ADMINISTRADOR", "Acceso completo: configura el CRM, gestiona usuarios, edita metas, elimina y restaura registros, y borra definitivamente desde la Papelera"],
            ["GERENTE",       "Ve clientes, oportunidades, actividades y reportes de todo el equipo; edita metas de vendedores; elimina y restaura registros (a la Papelera), pero no configura el CRM ni gestiona usuarios"],
            ["COMERCIAL",     "Ve y gestiona únicamente sus propios clientes, oportunidades y actividades; sin acceso a reportes del equipo ni configuración"],
          ],
        ),
        nota("Cada usuario pertenece exclusivamente a tu organización. Los datos de diferentes organizaciones están completamente aislados. Eliminar un registro no lo borra al instante: lo envía a la Papelera (ver 3.5), desde donde Administrador o Gerente pueden restaurarlo, o el Administrador eliminarlo definitivamente."),
        p("Desde el panel de Equipo el Administrador puede crear usuarios (nombre, correo y contraseña inicial), ver el rol y estado de cada miembro, restablecer contraseñas y asignar registros importados sin dueño (ver 10.3.1)."),
        h3("10.3.1 Asignar registros importados a un vendedor"),
        p("Los registros importados desde Excel no tienen vendedor asignado, y un usuario con rol COMERCIAL no podrá verlos hasta que le sean asignados. El Administrador ve al final de la página Equipo un panel \"Asignar registros sin dueño\": elige el vendedor, haz clic en Asignar, y el sistema le asigna todos los clientes, oportunidades y actividades sin dueño."),
        nota("Solo se reasignan registros sin dueño (importados). Los registros ya asignados a otro vendedor no se modifican."),
        h2("10.4 Etapas del pipeline configurables"),
        p("En Configuración, sección \"Etapas del pipeline\", el Administrador puede renombrar cada etapa (por ejemplo \"Cotización\" por \"Propuesta enviada\"), reordenar las columnas del kanban arrastrándolas, y ocultar una etapa que su proceso no use."),
        nota("Las etapas \"Ganada\" y \"Perdida\" nunca se pueden ocultar (el Dashboard, los Reportes y las alertas dependen de ellas). Las demás solo se pueden ocultar si no tienen oportunidades asignadas. Ocultar no borra ni mueve ninguna oportunidad."),
        h2("10.5 Captura externa de leads (API)"),
        p("En Configuración, sección \"Captura externa de leads\", el Administrador puede conectar un formulario web, WhatsApp Business o una campaña de anuncios (Meta/Google Ads) para que cada nuevo interesado cree automáticamente un Cliente, un Contacto y una Oportunidad en el Pipeline (etapa Prospecto). Genera la clave, entrégala junto con la dirección del servicio a quien configure la integración, y verifica en el Pipeline."),
        nota("Rotar la clave invalida la anterior de inmediato. Si el mismo correo de cliente ya existe, el sistema lo reutiliza en vez de duplicarlo."),
        h2("10.6 Mi perfil"),
        p("Cada usuario puede actualizar su propia información en Mi perfil (al final del menú lateral): cambiar nombre y correo, y cambiar contraseña (requiere ingresar la contraseña actual como verificación)."),
        pageBreak(),

        // CAP 11 FAQ
        h1("11. Preguntas frecuentes"),
        h2("¿Puedo importar el mismo archivo dos veces?"),
        p("Sí, pero puede crear duplicados si los nombres varían (mayúsculas, espacios). Limpia y revisa los datos antes de importar."),
        h2("¿Cómo activo o desactivo las notificaciones por email?"),
        p("Están activas por defecto. El Administrador puede ir a Configuración y usar el toggle \"Notificaciones automáticas por email\" (ver 10.1.1). Al desactivarlo, ningún miembro del equipo recibe los correos automáticos diarios; para reactivarlos, vuelve a encender el toggle."),
        h2("¿El PDF de cotización incluye el logo de mi empresa?"),
        p("Sí. Sube tu logo desde Configuración (ver 10.1) y aparecerá automáticamente en el encabezado de todas tus cotizaciones en PDF, en lugar del ícono genérico."),
        h2("¿Puedo exportar datos del CRM?"),
        p("Si. Todas las paginas de listado tienen un boton Exportar Excel en la esquina superior. Puedes exportar: Clientes, Contactos, Cotizaciones activas, Cotizaciones formales, Agenda, Equipo, Catalogo de servicios, Funciones y Audiencia."),
        h2("¿Qué pasa si cierro el navegador mientras creo una cotización?"),
        p("Los datos se guardan solo al hacer clic en Guardar. Guarda frecuentemente como borrador para no perder información."),
        h2("¿Puedo cotizar a un cliente nuevo y a uno existente sin cambiar de pantalla?"),
        p("Sí. En Nueva cotización, cada campo (Cliente, Contacto, Oportunidad vinculada) tiene sus propios botones Existente / + Nuevo (ver 6.6). Puedes elegir un Cliente existente y crear al mismo tiempo un Contacto nuevo para esa empresa, todo en el mismo formulario."),
        h2("¿Qué funciones de IA tiene el CRM y qué datos usan?"),
        p("Hay dos: el Resumen con IA en la ficha del cliente (ver 3.10), que produce un informe de seis secciones sobre una cuenta, y el Brief del pipeline con IA en la pantalla de Pipeline (ver 4.10), que produce un resumen ejecutivo de tus oportunidades abiertas. Ambas usan solo los datos reales dentro de tu CRM — no consultan información externa ni comparten tus datos con otras organizaciones. Ambas descuentan del mismo cupo mensual de IA: según tu plan puede ser ilimitado o tener un tope, visible en cada panel (por ejemplo \"12 / 100 este mes\")."),

        new Paragraph({ spacing: { after: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: "¿Necesitas ayuda adicional?", bold: true, size: 26, color: AZUL })],
          spacing: { before: 400, after: 120 },
        }),
        p("Este CRM fue desarrollado por el Equipo Evoluteca.com y felipegomezjaramillo.com."),
        p("Plataforma: crm.evoluteca.com"),
        p("Para soporte técnico o nuevas funcionalidades, contacta directamente al equipo."),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="manual-evoluteca-crm-${new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }).slice(0, 16).replace(" ", "-").replace(":", "")}.docx"`,
    },
  });
}


