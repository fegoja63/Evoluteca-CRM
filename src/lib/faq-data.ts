// Contenido de la base de ayuda in-app (página Ayuda). Reutiliza el conocimiento
// del manual de usuario (src/app/api/manual/pdf/route.ts) en formato de
// pregunta/respuesta corta y buscable, en vez de un PDF de 10 capítulos.
// Al agregar una funcionalidad nueva al manual, conviene agregar aquí también
// su pregunta más frecuente.

export type Faq = {
  pregunta: string;
  respuesta: string;
  categoria: string;
};

export const FAQS: Faq[] = [
  // ── Primeros pasos ──
  { categoria: "Primeros pasos", pregunta: "¿Cómo ingreso por primera vez al CRM?",
    respuesta: "Tu asesor Evoluteca activa la cuenta de tu empresa y te envía tu correo y una contraseña temporal para ingresar a crm.evoluteca.com. Te recomendamos cambiar tu contraseña desde Mi perfil apenas entres." },
  { categoria: "Primeros pasos", pregunta: "Olvidé mi contraseña, ¿cómo la recupero?",
    respuesta: "En la pantalla de inicio de sesión haz clic en \"¿Olvidaste tu contraseña?\", ingresa tu correo y recibirás un email con un enlace para restablecerla, válido por 1 hora. El Administrador de tu organización también puede restablecerla desde el panel de Equipo, sin necesidad de email." },
  { categoria: "Primeros pasos", pregunta: "¿Puedo usar el CRM desde el celular?",
    respuesta: "Sí, está optimizado para móvil. En pantallas pequeñas aparece una barra de navegación inferior y un botón flotante + con accesos rápidos a nueva actividad, nuevo cliente, nueva cotización y pipeline." },
  { categoria: "Primeros pasos", pregunta: "¿Cómo creo una cuenta nueva para otra empresa?",
    respuesta: "El registro de cuentas nuevas no es autoservicio: solo tu asesor Evoluteca puede activar una organización nueva en la plataforma." },

  // ── Clientes y contactos ──
  { categoria: "Clientes y contactos", pregunta: "¿Cómo creo un cliente nuevo?",
    respuesta: "Ve a Clientes, botón \"+ Nuevo cliente\". Solo el nombre de la empresa es obligatorio; email, teléfono, sector, sitio web y notas son opcionales." },
  { categoria: "Clientes y contactos", pregunta: "¿Qué es la ficha 360° de un cliente?",
    respuesta: "Al hacer clic en un cliente ves en un solo lugar sus datos generales, contactos vinculados, oportunidades y su etapa, actividades registradas, cotizaciones formales emitidas y un timeline cronológico con todas las interacciones." },
  { categoria: "Clientes y contactos", pregunta: "¿Cómo registro una llamada o reunión rápido, sin ir a la Agenda?",
    respuesta: "En la ficha del cliente, sección Actividades, usa los botones rápidos Llamada, Email o Reunión — abren el formulario ya con ese tipo pre-seleccionado, sin salir de la pantalla." },
  { categoria: "Clientes y contactos", pregunta: "¿Cómo envío un WhatsApp a un cliente o contacto desde el CRM?",
    respuesta: "En la ficha de contacto o cliente, el botón WhatsApp abre plantillas prellenadas (saludo inicial, seguimiento de cotización, confirmar reunión, recordatorio de evento, cierre de negocio o mensaje libre). Puedes editar el texto antes de enviarlo — nunca se envía sin que lo veas primero." },
  { categoria: "Clientes y contactos", pregunta: "¿Cómo guardo una nota interna sobre un cliente?",
    respuesta: "En la ficha de cliente, contacto u oportunidad, haz clic en el área de notas para editarla. Presiona Ctrl+Enter para guardar o Esc para cancelar. Las notas son internas, nunca se muestran al cliente." },
  { categoria: "Clientes y contactos", pregunta: "Eliminé un cliente por error, ¿puedo recuperarlo?",
    respuesta: "Sí. Al eliminar un cliente o contacto no se borra de inmediato: se mueve a la Papelera (menú lateral), desde donde Administrador o Gerente pueden restaurarlo con todos sus datos e historial intactos, o eliminarlo definitivamente (esto último no se puede deshacer)." },
  { categoria: "Clientes y contactos", pregunta: "¿Puedo adjuntar archivos a un cliente, contacto u oportunidad?",
    respuesta: "Sí, en la sección \"Archivos adjuntos\" de cada ficha puedes subir contratos, cédulas, fotos o cotizaciones firmadas (máximo 5MB por archivo). Los archivos se guardan de forma segura dentro del CRM, no se comparten entre organizaciones distintas." },

  // ── Pipeline de ventas ──
  { categoria: "Pipeline de ventas", pregunta: "¿Qué significan las etapas del pipeline?",
    respuesta: "Prospecto (lead sin calificar), Calificado (cliente potencial real con necesidad y presupuesto), Cotización (propuesta presentada), Negociación (ajustando condiciones), Ganada (negocio cerrado) y Perdida (no se cerró)." },
  { categoria: "Pipeline de ventas", pregunta: "¿Puedo cambiar el nombre de las etapas del pipeline?",
    respuesta: "Sí. En Configuración → Etapas del pipeline, el Administrador puede renombrar cualquier etapa (por ejemplo cambiar \"Cotización\" por \"Propuesta enviada\") y reordenarlas arrastrándolas. Ganada y Perdida nunca se pueden ocultar; las demás solo si no tienen oportunidades asignadas en ese momento." },
  { categoria: "Pipeline de ventas", pregunta: "¿Qué significan los colores en el borde de las tarjetas del pipeline?",
    respuesta: "Indican la antigüedad de la oportunidad: verde menos de 15 días, amarillo entre 15 y 30 días, rojo más de 30 días (estancada, requiere acción urgente). Las oportunidades Ganadas o Perdidas no muestran indicador." },
  { categoria: "Pipeline de ventas", pregunta: "¿Cómo registro el motivo por el que se perdió un negocio?",
    respuesta: "Al mover una oportunidad a Perdida (arrastrando la tarjeta o desde su ficha), el sistema muestra un modal para elegir el motivo (precio, competencia, evento cancelado, sin respuesta, presupuesto, fuera de fechas, u otro personalizado) antes de completar el cambio. Si cancelas el modal, la oportunidad no se mueve." },
  { categoria: "Pipeline de ventas", pregunta: "¿El pipeline tiene una vista de tabla además del kanban?",
    respuesta: "Sí. Usa el toggle Kanban / Tabla en la barra de filtros. La vista tabla muestra todas las oportunidades en filas con columnas ordenables (empresa, etapa, valor, probabilidad, fecha de cierre)." },
  { categoria: "Pipeline de ventas", pregunta: "¿El CRM guarda el historial de cambios de etapa de una oportunidad?",
    respuesta: "Sí, automáticamente. En la ficha de la oportunidad, el panel \"Historial de etapas\" muestra cada cambio con fecha, días en la etapa anterior y el usuario que lo hizo — no requiere ninguna acción manual." },
  { categoria: "Pipeline de ventas", pregunta: "¿Puedo ver solo las oportunidades de un vendedor específico?",
    respuesta: "Sí, si eres Administrador o Gerente. En Pipeline aparece un selector \"Vendedor\" adicional (no visible para el rol Comercial, que ya solo ve sus propios negocios)." },
  { categoria: "Pipeline de ventas", pregunta: "Cuando avanzo una oportunidad de etapa, ¿me pide el número de cotización?",
    respuesta: "Sí, opcionalmente. Al mover una oportunidad desde Prospecto o Calificado hacia cualquier otra etapa (excepto Perdida), el sistema ofrece registrar el número de cotización asociado — puedes dejarlo en blanco sin problema." },

  // ── Agenda ──
  { categoria: "Agenda", pregunta: "¿Qué tipos de actividad puedo registrar en la Agenda?",
    respuesta: "Llamada, Reunión, Tarea y Email. Cada actividad puede vincularse a un cliente, contacto y/o oportunidad." },
  { categoria: "Agenda", pregunta: "¿Cómo marco una actividad como completada?",
    respuesta: "Marca el checkbox junto a la actividad; se mostrará tachada. Usa el filtro \"Solo pendientes\" para enfocarte en lo que falta." },
  { categoria: "Agenda", pregunta: "¿El CRM me avisa si tengo actividades vencidas?",
    respuesta: "Sí. Cada mañana a las 8am se envían por email hasta 3 alertas automáticas: actividades vencidas, negocios estancados (sin actividad en más de 14 días) y cierres próximos (en los siguientes 7 días). Solo llega el correo de las categorías que realmente tengan situaciones pendientes." },
  { categoria: "Agenda", pregunta: "¿Puedo sincronizar mis actividades con Google Calendar u Outlook?",
    respuesta: "Puedes exportarlas: el botón iCal en la Agenda descarga un archivo .ics compatible con Google Calendar, Apple Calendar y Outlook. No es una sincronización automática en tiempo real, es una fotografía de tus actividades pendientes en ese momento — descárgalo de nuevo cada vez que quieras actualizar." },

  // ── Cotizaciones ──
  { categoria: "Cotizaciones", pregunta: "¿Cómo creo una cotización formal?",
    respuesta: "Ve a Nueva cotización, elige Cliente/Contacto/Oportunidad (existente o nuevo sin salir del formulario), agrega los ítems de servicio, define impuesto si aplica y guarda como borrador. Desde el detalle puedes cambiar el estado y descargar el PDF." },
  { categoria: "Cotizaciones", pregunta: "¿Puedo cotizar a un cliente nuevo sin salir de la pantalla de Nueva cotización?",
    respuesta: "Sí. Cada campo (Cliente, Contacto, Oportunidad vinculada) tiene botones Existente / + Nuevo — puedes crear un cliente y un contacto nuevos sin cambiar de pantalla, y quedan vinculados automáticamente entre sí." },
  { categoria: "Cotizaciones", pregunta: "¿Qué estados puede tener una cotización?",
    respuesta: "Borrador (recién creada), Enviada (el cliente ya la recibió), Aceptada y Rechazada (esta última puede reabrirse como borrador)." },
  { categoria: "Cotizaciones", pregunta: "¿Cómo agrego impuesto (IVA) a una cotización?",
    respuesta: "Junto a la tabla de ítems escribe el nombre del impuesto (por defecto \"IVA\", editable) y su porcentaje. El sistema calcula automáticamente Subtotal, Impuesto y Total, y lo muestra igual en el PDF, el email y el link público." },
  { categoria: "Cotizaciones", pregunta: "¿El PDF de la cotización incluye el logo de mi empresa?",
    respuesta: "Sí, si lo configuraste en Configuración → Logo de la empresa (imagen PNG o JPG, máximo 2MB, subida directo desde tu computador)." },
  { categoria: "Cotizaciones", pregunta: "¿Puedo enviar la cotización a un correo distinto al del contacto registrado?",
    respuesta: "Sí. Al hacer clic en \"✉ Enviar email\" el campo de destinatario viene pre-llenado con el correo del contacto, pero es editable antes de enviar." },
  { categoria: "Cotizaciones", pregunta: "¿Cómo reutilizo un paquete de servicios que uso seguido?",
    respuesta: "Guárdalo como plantilla en el módulo Plantillas, o desde una cotización existente con el botón \"★ Guardar plantilla\". Editar o eliminar una plantilla después no afecta las cotizaciones ya creadas a partir de ella." },
  { categoria: "Cotizaciones", pregunta: "¿Qué pasa si una cotización vence sin respuesta del cliente?",
    respuesta: "El sistema muestra badges automáticos: ámbar \"Vence en Xd\" (7 días o menos) y rojo \"Vencida Xd\" o \"Vence hoy\". Estos badges desaparecen cuando la cotización pasa a Aceptada o Rechazada." },

  // ── Importación de Excel ──
  { categoria: "Importación de datos", pregunta: "¿Cómo importo mi base de datos de Excel?",
    respuesta: "Ve a Datos → Importar, sube tu archivo .xlsx y mapea qué columna corresponde a cada campo del CRM (empresa, contacto, oportunidad, valor, etapa, etc.). El sistema muestra un resumen de cuántos clientes, contactos y oportunidades se crearon." },
  { categoria: "Importación de datos", pregunta: "¿Qué pasa si importo el mismo archivo dos veces?",
    respuesta: "Si el nombre de la empresa coincide exactamente, el sistema la reutiliza; si varía (mayúsculas, espacios extra), crea una empresa duplicada. Limpia o normaliza los datos antes de reimportar." },
  { categoria: "Importación de datos", pregunta: "La importación no salió como esperaba, ¿puedo deshacerla?",
    respuesta: "Sí, usa la sección Datos → Limpiar para eliminar los registros importados y volver a intentar." },
  { categoria: "Importación de datos", pregunta: "Los registros que importé no aparecen para un vendedor, ¿por qué?",
    respuesta: "Los registros importados no tienen vendedor asignado por defecto, así que un usuario Comercial no los ve hasta que se le asignen. El Administrador puede asignarlos en bloque desde el panel \"Asignar registros sin dueño\" al final de la página Equipo." },

  // ── Reportes y metas ──
  { categoria: "Reportes", pregunta: "¿Qué mide la \"tasa de cierre\" en Reportes?",
    respuesta: "El porcentaje de negocios ganados sobre el total de negocios cerrados (ganados + perdidos) en el período filtrado." },
  { categoria: "Reportes", pregunta: "¿Cómo configuro una meta de ventas mensual o anual?",
    respuesta: "En Reportes, botón \"Configurar metas\" dentro de la gráfica mensual. Deja el campo Mes en blanco para una meta anual, o elige un mes específico para una meta mensual." },
  { categoria: "Reportes", pregunta: "¿Reportes muestra cuánto tarda en promedio cerrarse un negocio?",
    respuesta: "Sí, en la tarjeta \"Negocios cerrados\" aparece el promedio de días desde que se creó la oportunidad hasta que pasó a Ganada, para el período filtrado." },
  { categoria: "Reportes", pregunta: "¿Puedo comparar el mes actual contra el mes anterior?",
    respuesta: "Sí, junto a la gráfica de \"Actividad mensual\" aparece un indicador con el porcentaje de variación del valor ganado respecto al mes inmediatamente anterior (puede cruzar de un año a otro, por ejemplo enero contra diciembre)." },
  { categoria: "Reportes", pregunta: "¿Puedo filtrar los reportes por sede o segmento de cliente?",
    respuesta: "Sí, si tu base de datos tiene esa información (por ejemplo, cargada por importación de Excel), aparecen selectores adicionales \"Segmento\" y \"Sede\" en la barra de filtros de Reportes." },
  { categoria: "Reportes", pregunta: "¿Dónde veo el desempeño individual de cada vendedor contra su meta?",
    respuesta: "En Equipo → Rendimiento (visible para Administrador y Gerente). Muestra el valor ganado del mes y el % alcanzado respecto a la meta mensual de cada vendedor." },

  // ── Dashboard ──
  { categoria: "Dashboard", pregunta: "¿Qué es el Dashboard y qué muestra?",
    respuesta: "Es la pantalla principal: un tablero gerencial de una sola página con meta del mes y del año, KPIs clave (pipeline activo, forecast, ganados del mes, actividades vencidas y de hoy), ranking de vendedores, oportunidades calientes, últimas ganadas y salud comercial." },
  { categoria: "Dashboard", pregunta: "¿Por qué no veo el medidor circular de meta del mes?",
    respuesta: "Los gauges de meta del mes y del año solo aparecen si tienes una meta configurada para ese período. Configúrala desde Reportes → Configurar metas." },

  // ── Configuración y equipo ──
  { categoria: "Configuración", pregunta: "¿Qué puede hacer cada rol de usuario (Comercial, Gerente, Administrador)?",
    respuesta: "Comercial ve y gestiona solo sus propios registros. Gerente además ve todo el equipo, reportes consolidados y puede eliminar registros y editar metas. Administrador además configura el CRM, gestiona usuarios y reasigna registros sin dueño." },
  { categoria: "Configuración", pregunta: "¿Cómo activo o desactivo las notificaciones automáticas por email?",
    respuesta: "En Configuración, el Administrador puede apagar o encender el toggle \"Notificaciones automáticas por email\". Al desactivarlo, ningún miembro del equipo recibe los correos diarios de actividades vencidas, negocios estancados y cierres próximos." },
  { categoria: "Configuración", pregunta: "¿Cómo conecto un formulario web o WhatsApp Business para que los leads entren solos al CRM?",
    respuesta: "En Configuración → Captura externa de leads, genera una clave de API. Compártela junto con la dirección del servicio a quien configure tu formulario o automatización — cada lead recibido crea automáticamente un Cliente, un Contacto y una Oportunidad en la etapa Prospecto, asignada automáticamente al vendedor con menos carga de trabajo en ese momento." },
  { categoria: "Configuración", pregunta: "¿Qué son los módulos opcionales Funciones y Audiencia?",
    respuesta: "Funciones es para empresas de teatro o espectáculos (aforo, boletería, NPS). Audiencia gestiona espectadores con segmentación (individual, grupo, empresa, colegio). Se activan desde Configuración → Módulos según el tipo de negocio." },
  { categoria: "Configuración", pregunta: "¿Cómo cambio mi nombre, correo o contraseña?",
    respuesta: "En Mi perfil (al final del menú lateral). Cambiar la contraseña requiere ingresar la actual como verificación." },
  { categoria: "Configuración", pregunta: "¿Puedo exportar mis datos del CRM?",
    respuesta: "Sí. Todas las páginas de listado tienen un botón \"Excel\" para exportar: Clientes, Contactos, Cotizaciones, Agenda, Equipo, Catálogo, Funciones y Audiencia." },

  // ── General ──
  { categoria: "General", pregunta: "¿Qué pasa si cierro el navegador mientras estoy creando una cotización?",
    respuesta: "Los datos se guardan solo al hacer clic en el botón de guardar. Si cierras antes, se pierde lo no guardado — guarda frecuentemente como borrador." },
  { categoria: "General", pregunta: "¿Mis datos están aislados de otras empresas que usan Evoluteca CRM?",
    respuesta: "Sí, completamente. Cada organización (tenant) solo puede ver y gestionar su propia información; los datos de diferentes empresas nunca se mezclan." },
];
