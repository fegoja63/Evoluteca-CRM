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
              new TextRun({ text: "evoluteca-crm.vercel.app  ·  Página ", size: 18, color: GRIS }),
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
          children: [new TextRun({ text: `Versión 1.1  ·  ${new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`, size: 20, color: GRIS, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "evoluteca-crm.vercel.app", size: 20, color: AZULM, underline: { type: UnderlineType.SINGLE } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
        }),
        pageBreak(),

        // ÍNDICE
        h1("Contenido"),
        ...([
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
        ].map(item => new Paragraph({
          children: [new TextRun({ text: item, size: 22, color: "1E293B" })],
          spacing: { after: 100 },
          bullet: { level: 0 },
        }))),
        pageBreak(),

        // CAP 1
        h1("1. Primeros pasos"),
        p("Evoluteca CRM es una herramienta diseñada para que pequeñas y medianas empresas gestionen sus clientes, oportunidades de venta y actividades comerciales desde un solo lugar."),
        h2("1.1 Crear tu cuenta"),
        ...paso(1, "Registro", "Ve a evoluteca-crm.vercel.app y haz clic en \"Crear cuenta\". Ingresa el nombre de tu empresa, tu nombre, correo y contraseña."),
        ...paso(2, "Guía de inicio", "Al ingresar por primera vez verás la Guía de inicio. Te llevará paso a paso a importar datos, crear tu primer cliente o explorar el pipeline."),
        ...paso(3, "Configuración inicial", "Ve a Configuración (⚙️) para personalizar el nombre de tu empresa y activar módulos opcionales."),
        tip("Puedes volver a la Guía de inicio desde el menú lateral (🚀 Guía de inicio) en cualquier momento."),
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
        pageBreak(),

        // CAP 2
        h1("2. Clientes y contactos"),
        h2("2.1 Crear un cliente"),
        p("Ve a Clientes → botón \"+ Nuevo cliente\". El nombre de la empresa es obligatorio. Los demás campos son opcionales pero recomendados."),
        tip("El sector ayuda a filtrar y segmentar clientes. Elige el más cercano a la actividad del cliente."),
        h2("2.2 Ficha 360° del cliente"),
        p("Haz clic en cualquier cliente para abrir su ficha. Verás:"),
        bullet("Datos generales (editable con botón Editar)"),
        bullet("Contactos vinculados con botón directo a WhatsApp"),
        bullet("Oportunidades de venta y su etapa actual"),
        bullet("Actividades registradas y formulario para crear nuevas"),
        bullet("Cotizaciones formales emitidas"),
        bullet("Timeline 360°: historial cronológico de todas las interacciones"),
        h2("2.3 Timeline 360°"),
        p("El timeline unifica en orden cronológico: actividades, oportunidades, cotizaciones y eventos manuales. Puedes registrar:"),
        bullet("NOTA: observaciones o recordatorios libres"),
        bullet("LLAMADA: resumen de conversación telefónica"),
        bullet("EMAIL: registro de correo enviado o recibido"),
        bullet("REUNION: acta o resumen de reunión"),
        bullet("WHATSAPP: resumen de conversación por WhatsApp"),
        tip("Para eliminar un evento del timeline, pasa el cursor sobre él y haz clic en la × que aparece a la derecha."),
        h2("2.4 Contactos y WhatsApp"),
        p("Los contactos son personas dentro de un cliente. Si el contacto tiene teléfono registrado, aparece el botón 💬 WhatsApp que abre la conversación directamente con ese número."),
        nota("Un contacto puede existir sin empresa (contacto independiente)."),
        pageBreak(),

        // CAP 3
        h1("3. Pipeline de ventas"),
        p("El pipeline organiza visualmente las oportunidades de venta por etapa. Cada tarjeta muestra cliente, valor y fecha. Puedes moverlas con drag & drop."),
        h2("3.1 Etapas"),
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
        h2("3.2 Crear y gestionar oportunidades"),
        p("Haz clic en \"+ Nueva oportunidad\". Ingresa título, valor estimado, empresa, contacto, etapa y fecha de evento. Desde la ficha de la oportunidad puedes cambiar etapa, crear actividades y emitir cotizaciones."),
        tip("El valor de la oportunidad es clave para los reportes. Ingrésalo siempre, aunque sea estimado."),
        pageBreak(),

        // CAP 4
        h1("4. Agenda y actividades"),
        p("La agenda centraliza todas las actividades comerciales. Cada actividad puede vincularse a un cliente, contacto y/o oportunidad."),
        h2("4.1 Tipos"),
        bullet("LLAMADA — Llamada telefónica"),
        bullet("REUNIÓN — Reunión presencial o virtual"),
        bullet("TAREA — Acción interna (preparar propuesta, enviar info, etc.)"),
        bullet("EMAIL — Seguimiento por correo"),
        h2("4.2 Crear y completar"),
        p("Crea actividades desde la Agenda o directamente desde las fichas de cliente, contacto u oportunidad. Marca el checkbox para completarlas. Las actividades vencidas sin completar se resaltan como alertas en el Dashboard."),
        nota("El CRM puede enviar recordatorios por email si configuras la clave RESEND_API_KEY en las variables de entorno del servidor."),
        pageBreak(),

        // CAP 5
        h1("5. Cotizaciones formales"),
        p("Las cotizaciones formales son documentos con desglose de servicios, cantidades, precios y total. Se generan en PDF listas para enviar al cliente."),
        h2("5.1 Crear una cotización"),
        ...paso(1, "Ir a Nueva cotización", "En el menú lateral haz clic en \"📋 Nueva cotización\"."),
        ...paso(2, "Seleccionar cliente", "Elige empresa, contacto y oportunidad vinculada. Los contactos se filtran por empresa automáticamente."),
        ...paso(3, "Detalles del evento", "Ingresa sede, fecha del evento y fecha de validez."),
        ...paso(4, "Agregar ítems", "Escribe cada servicio: descripción, cantidad y precio unitario. Usa el selector del catálogo para cargar ítems predefinidos."),
        ...paso(5, "Guardar y descargar", "Guarda como borrador. Desde el detalle puedes cambiar estado y descargar el PDF."),
        h2("5.2 Estados"),
        makeTable(
          ["Estado", "Descripción"],
          [
            ["BORRADOR",  "Recién creada, no enviada al cliente"],
            ["ENVIADA",   "Cliente ya la recibió. Se activan opciones Aceptada / Rechazada"],
            ["ACEPTADA",  "Cliente aprobó la cotización"],
            ["RECHAZADA", "Cliente no aceptó. Puede reabrirse como borrador"],
          ],
        ),
        tip("El PDF se genera con el estado actual. Si haces cambios, descarga de nuevo para obtener la versión actualizada."),
        pageBreak(),

        // CAP 6
        h1("6. Importación desde Excel"),
        p("Importa bases de datos externas. El sistema crea empresas, contactos y oportunidades vinculados automáticamente."),
        h2("6.1 Preparar el archivo"),
        bullet("Primera fila: encabezados de columnas"),
        bullet("Campos obligatorios: al menos una columna de empresa"),
        bullet("Campos recomendados: contacto, oportunidad, valor, etapa"),
        bullet("Columnas extra: se guardan automáticamente como datos adicionales"),
        nota("Si el nombre de una empresa ya existe en el CRM, no se duplica. Se vinculan los nuevos contactos a la empresa existente."),
        h2("6.2 Proceso"),
        ...paso(1, "Subir archivo", "Ve a 📥 Datos → Importar. Selecciona el archivo .xlsx."),
        ...paso(2, "Mapear columnas", "Asigna qué columna del Excel corresponde a empresa, contacto y oportunidad. El sistema muestra una muestra real de los datos para verificar."),
        ...paso(3, "Confirmar importación", "Los tres campos obligatorios deben estar mapeados. Haz clic en Importar."),
        ...paso(4, "Resultado", "El sistema muestra cuántos registros se crearon. Verifica en Clientes y Contactos."),
        tip("Si la importación no quedó bien, usa Datos → Limpiar para eliminar los registros y volver a intentar."),
        pageBreak(),

        // CAP 7
        h1("7. Reportes y metas"),
        p("Los reportes muestran el desempeño comercial: valor ganado, tasa de cierre, pipeline por etapa, top clientes y actividad mensual."),
        h2("7.1 KPIs principales"),
        bullet("Clientes activos: total de empresas y contactos"),
        bullet("En negociación: cantidad y valor potencial de oportunidades activas"),
        bullet("Valor ganado: suma de oportunidades en etapa GANADA"),
        bullet("Tasa de cierre: % ganadas vs total cerradas (ganadas + perdidas)"),
        h2("7.2 Metas de ventas"),
        p("Haz clic en \"🎯 Configurar metas\" en la gráfica mensual. Define metas anuales o por mes específico. La gráfica muestra una línea punteada amarilla indicando el objetivo, con barra de progreso porcentual."),
        tip("Filtra por año y mes para analizar períodos específicos. El embudo y top clientes se actualizan con el filtro activo."),
        pageBreak(),

        // CAP 8
        h1("8. Configuración y equipo"),
        h2("8.1 Configuración general"),
        p("En ⚙️ Configuración puedes cambiar el nombre de tu empresa (aparece en el sidebar y en los PDFs de cotizaciones)."),
        h2("8.2 Módulos opcionales"),
        bullet("🎭 Funciones: para teatros y espectáculos. Gestiona funciones con aforo y NPS"),
        bullet("🎪 Audiencia: gestión de espectadores con segmentación"),
        h2("8.3 Equipo"),
        p("En 👥 Equipo gestiona los usuarios. Roles disponibles:"),
        makeTable(
          ["Rol", "Permisos"],
          [
            ["ADMINISTRADOR", "Acceso completo, puede eliminar registros y gestionar usuarios"],
            ["GERENTE",       "Acceso completo de lectura y escritura, sin eliminar"],
            ["COMERCIAL",     "Puede crear y editar sus registros, sin acceso a configuración"],
          ],
        ),
        nota("Cada usuario pertenece exclusivamente a tu organización. Los datos de diferentes organizaciones están completamente aislados."),
        pageBreak(),

        // CAP 9 FAQ
        h1("9. Preguntas frecuentes"),
        h2("¿Puedo importar el mismo archivo dos veces?"),
        p("Sí, pero puede crear duplicados si los nombres varían (mayúsculas, espacios). Limpia y revisa los datos antes de importar."),
        h2("¿Cómo activo las notificaciones por email?"),
        p("Requiere configurar la clave RESEND_API_KEY en las variables de entorno del servidor. Contacta al administrador técnico."),
        h2("¿El PDF de cotización incluye el logo de mi empresa?"),
        p("Actualmente usa el nombre de tu empresa y el logo genérico de Evoluteca. En versiones futuras podrás subir tu propio logo."),
        h2("¿Puedo exportar datos del CRM?"),
        p("Si. Todas las paginas de listado tienen un boton Exportar Excel en la esquina superior. Puedes exportar: Clientes, Contactos, Cotizaciones activas, Cotizaciones formales, Agenda, Equipo, Catalogo de servicios, Funciones y Audiencia."),
        h2("¿Qué pasa si cierro el navegador mientras creo una cotización?"),
        p("Los datos se guardan solo al hacer clic en Guardar. Guarda frecuentemente como borrador para no perder información."),

        new Paragraph({ spacing: { after: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: "¿Necesitas ayuda adicional?", bold: true, size: 26, color: AZUL })],
          spacing: { before: 400, after: 120 },
        }),
        p("Este CRM fue desarrollado por Felipe Gómez Jaramillo."),
        p("Sitio web: felipegomezjaramillo.com"),
        p("Plataforma: evoluteca-crm.vercel.app"),
        p("Para soporte técnico o nuevas funcionalidades, contacta directamente al desarrollador."),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="manual-evoluteca-crm.docx"',
    },
  });
}


