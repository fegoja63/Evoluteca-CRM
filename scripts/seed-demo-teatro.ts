/**
 * Seed de datos demo para Evoluteca CRM
 * Tenant: "Demo Teatro" — teatro / espacio de espectáculos con TODOS los
 * módulos activos: CRM general (clientes, pipeline, cotizaciones, agenda,
 * reportes) + Funciones + Audiencia (asistencia, retención, membresías, NPS).
 *
 * Pensado como cuenta de demostración para que un prospecto tipo Teatro
 * Belarte explore de primera mano el alcance completo del producto antes
 * de comprar, y como prueba de humo de que todo el flujo funciona junto.
 *
 * Ejecutar con:
 *   npx tsx scripts/seed-demo-teatro.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const dia = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("🌱 Iniciando seed Demo Teatro...\n");

  const previo = await prisma.tenant.findFirst({ where: { slug: "demo-teatro" } });
  if (previo) {
    await prisma.tenant.delete({ where: { id: previo.id } });
    console.log("🗑  Tenant demo-teatro previo eliminado.");
  }

  // ── TENANT ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      nombre: "Demo Teatro",
      slug: "demo-teatro",
      plan: "empresa",
      activo: true,
      modulos: { funciones: true, audiencia: true },
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre} (Funciones + Audiencia activos)`);

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const passHash = await bcrypt.hash("Demo2026!", 10);

  const admin = await prisma.usuario.create({
    data: { nombre: "María Fernanda Ospina", email: "admin@demo-teatro.com", passwordHash: passHash, rol: "ADMINISTRADOR", tenantId: tenant.id },
  });
  const gerente = await prisma.usuario.create({
    data: { nombre: "Julián Cárdenas", email: "gerente@demo-teatro.com", passwordHash: passHash, rol: "GERENTE", tenantId: tenant.id },
  });
  const comercial = await prisma.usuario.create({
    data: { nombre: "Natalia Reyes", email: "comercial@demo-teatro.com", passwordHash: passHash, rol: "COMERCIAL", tenantId: tenant.id },
  });
  console.log(`✅ Usuarios creados: ${admin.nombre} (admin), ${gerente.nombre} (gerente), ${comercial.nombre} (comercial)`);

  // ── CATÁLOGO — alquiler B2B ──────────────────────────────────────────────
  await Promise.all([
    prisma.producto.create({ data: { nombre: "Alquiler sala — medio día", descripcion: "Hasta 4 horas, incluye sillas, sonido y luces básicas", precioBase: 3500000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Alquiler sala — día completo", descripcion: "Jornada completa, incluye montaje y desmontaje", precioBase: 6500000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Paquete corporativo con catering", descripcion: "Alquiler + coffee break para hasta 200 personas", precioBase: 9800000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Función privada colegio", descripcion: "Función exclusiva en horario matutino, hasta 239 estudiantes", precioBase: 4200000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Producción técnica adicional", descripcion: "Refuerzo de luces, sonido o grabación audiovisual", precioBase: 1800000, activo: true, tenantId: tenant.id } }),
  ]);
  console.log("✅ Catálogo creado: 5 servicios de alquiler B2B");

  // ── CLIENTES B2B (colegios, corporativos, agencias) ─────────────────────
  const [colSanMarcos, colBilingue, empTech, empSeguros, agenciaEventos, ongCultura] = await Promise.all([
    prisma.empresa.create({ data: { nombre: "Colegio San Marcos", sector: "Educación", email: "eventos@sanmarcos.edu.co", telefono: "601 555 0101", etiquetas: ["colegio", "recurrente"], notas: "Alquila la sala para su acto de graduación cada noviembre.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Colegio Bilingüe del Norte", sector: "Educación", email: "coordinacion@bilingueNorte.edu.co", telefono: "601 555 0102", etiquetas: ["colegio", "nuevo"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Tech Solutions Colombia", sector: "Tecnología", email: "eventos@techsolutions.co", telefono: "601 555 0201", etiquetas: ["corporativo", "potencial-alto"], notas: "Buscan sede para su kickoff anual.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Aseguradora Confianza S.A", sector: "Otro", email: "comunicaciones@confianza.co", telefono: "601 555 0202", etiquetas: ["corporativo"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Agencia Momentum Eventos", sector: "Medios y Comunicación", email: "produccion@momentumeventos.co", telefono: "601 555 0301", etiquetas: ["agencia", "recurrente"], notas: "Intermediarios frecuentes para eventos corporativos de terceros.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Fundación Cultura Viva", sector: "Arte y Cultura", email: "proyectos@culturaviva.org", telefono: "601 555 0401", etiquetas: ["ong"], tenantId: tenant.id } }),
  ]);
  console.log("✅ Empresas B2B creadas: 6 (colegios, corporativos, agencia, ONG)");

  const [con1, con2, con3, con4, con5, con6] = await Promise.all([
    prisma.contacto.create({ data: { nombre: "Rectoría — Padre Luis Gómez", email: "rectoria@sanmarcos.edu.co", telefono: "310 111 2222", cargo: "Rector", empresaId: colSanMarcos.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Carolina Méndez", email: "c.mendez@bilingueNorte.edu.co", telefono: "311 222 3333", cargo: "Coordinadora de Eventos", empresaId: colBilingue.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Andrés Salazar", email: "a.salazar@techsolutions.co", telefono: "312 333 4444", cargo: "Head of People", empresaId: empTech.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Lorena Villamil", email: "l.villamil@confianza.co", telefono: "313 444 5555", cargo: "Directora de Comunicaciones", empresaId: empSeguros.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Esteban Rojas", email: "e.rojas@momentumeventos.co", telefono: "314 555 6666", cargo: "Productor General", empresaId: agenciaEventos.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Isabel Cuéllar", email: "i.cuellar@culturaviva.org", telefono: "315 666 7777", cargo: "Directora de Proyectos", empresaId: ongCultura.id, tenantId: tenant.id } }),
  ]);
  console.log("✅ Contactos creados: 6");

  // ── PIPELINE (alquiler B2B) ──────────────────────────────────────────────
  const [op1, op2, op3, op4, op5, op6] = await Promise.all([
    prisma.oportunidad.create({ data: { titulo: "Graduación promoción 2026 — San Marcos", etapa: "GANADA", valor: 6500000, costo: 800000, probabilidad: 100, empresaId: colSanMarcos.id, contactoId: con1.id, origenLead: "Referido", recurrente: true, fechaCierre: dia(-20), sede: "Sala principal", notas: "Cliente recurrente, cuarto año consecutivo.", tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.oportunidad.create({ data: { titulo: "Kickoff anual Tech Solutions", etapa: "NEGOCIACION", valor: 9800000, costo: 1500000, probabilidad: 65, empresaId: empTech.id, contactoId: con3.id, origenLead: "LinkedIn", fechaCierre: dia(12), sede: "Sala principal + foyer", notas: "Piden cotización con catering incluido. Segunda reunión el jueves.", tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.oportunidad.create({ data: { titulo: "Función privada Colegio Bilingüe del Norte", etapa: "PROPUESTA", valor: 4200000, costo: 500000, probabilidad: 45, empresaId: colBilingue.id, contactoId: con2.id, origenLead: "Web", fechaCierre: dia(25), sede: "Sala principal", notas: "Propuesta enviada, esperando aprobación del comité.", tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.oportunidad.create({ data: { titulo: "Lanzamiento de marca Aseguradora Confianza", etapa: "CALIFICADO", valor: 9800000, probabilidad: 30, empresaId: empSeguros.id, contactoId: con4.id, origenLead: "Frío", fechaCierre: dia(40), tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.oportunidad.create({ data: { titulo: "Evento cultural Fundación Cultura Viva", etapa: "PROSPECTO", valor: 3500000, probabilidad: 20, empresaId: ongCultura.id, contactoId: con6.id, origenLead: "Instagram", fechaCierre: dia(55), tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.oportunidad.create({ data: { titulo: "Evento corporativo vía Agencia Momentum", etapa: "PERDIDA", valor: 5200000, probabilidad: 0, empresaId: agenciaEventos.id, contactoId: con5.id, origenLead: "Referido", notas: "El cliente final canceló el evento.", fechaCierre: dia(-8), tenantId: tenant.id, creadoBy: comercial.id } }),
  ]);
  console.log("✅ Oportunidades creadas: 6 (1 ganada, 1 negociación, 1 propuesta, 1 calificado, 1 prospecto, 1 perdida)");

  // ── ACTIVIDADES ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.actividad.create({ data: { titulo: "Llamada de seguimiento — Tech Solutions", tipo: "LLAMADA", fecha: dia(-4), completada: false, empresaId: empTech.id, contactoId: con3.id, oportunidadId: op2.id, notas: "Confirmar si aprobaron el catering", tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.actividad.create({ data: { titulo: "Enviar propuesta ajustada — Bilingüe del Norte", tipo: "EMAIL", fecha: dia(-2), completada: false, empresaId: colBilingue.id, contactoId: con2.id, oportunidadId: op3.id, tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.actividad.create({ data: { titulo: "Reunión inicial Aseguradora Confianza", tipo: "REUNION", fecha: dia(3), completada: false, empresaId: empSeguros.id, contactoId: con4.id, oportunidadId: op4.id, tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.actividad.create({ data: { titulo: "Firma de contrato graduación San Marcos", tipo: "REUNION", fecha: dia(-22), completada: true, empresaId: colSanMarcos.id, contactoId: con1.id, oportunidadId: op1.id, tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.actividad.create({ data: { titulo: "Visita técnica a la sala — Tech Solutions", tipo: "REUNION", fecha: dia(6), completada: false, empresaId: empTech.id, contactoId: con3.id, oportunidadId: op2.id, notas: "Llevar cotización de catering impresa", tenantId: tenant.id, creadoBy: comercial.id } }),
    prisma.actividad.create({ data: { titulo: "Cotizar producción técnica adicional", tipo: "TAREA", fecha: dia(8), completada: false, empresaId: empSeguros.id, contactoId: con4.id, oportunidadId: op4.id, tenantId: tenant.id, creadoBy: comercial.id } }),
  ]);
  console.log("✅ Actividades creadas: 6 (2 vencidas, 1 completada, 3 próximas)");

  // ── COTIZACIONES ──────────────────────────────────────────────────────────
  await prisma.cotizacion.create({
    data: {
      estado: "ACEPTADA", sede: "Sala principal", fechaEvento: dia(-20), fechaValidez: dia(-10),
      empresaId: colSanMarcos.id, contactoId: con1.id, oportunidadId: op1.id, tenantId: tenant.id,
      items: { create: [{ descripcion: "Alquiler sala — día completo", cantidad: 1, precioUnit: 6500000 }] },
    },
  });
  await prisma.cotizacion.create({
    data: {
      estado: "ENVIADA", fechaValidez: dia(15), creadoEn: dia(-4),
      empresaId: empTech.id, contactoId: con3.id, oportunidadId: op2.id, tenantId: tenant.id,
      notas: "Incluye catering para 200 personas.",
      items: { create: [
        { descripcion: "Paquete corporativo con catering", cantidad: 1, precioUnit: 9800000 },
        { descripcion: "Producción técnica adicional", cantidad: 1, precioUnit: 1800000 },
      ] },
    },
  });
  await prisma.cotizacion.create({
    data: {
      estado: "BORRADOR", fechaValidez: dia(20),
      empresaId: colBilingue.id, contactoId: con2.id, oportunidadId: op3.id, tenantId: tenant.id,
      items: { create: [{ descripcion: "Función privada colegio", cantidad: 1, precioUnit: 4200000 }] },
    },
  });
  console.log("✅ Cotizaciones creadas: 3 (aceptada, enviada, borrador)");

  // ── METAS DE VENTA ────────────────────────────────────────────────────────
  const hoy = new Date();
  await prisma.metaVenta.create({ data: { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, valorObjetivo: 15000000, tenantId: tenant.id } });
  await prisma.metaVenta.create({ data: { anio: hoy.getFullYear(), mes: null, valorObjetivo: 150000000, tenantId: tenant.id } });
  console.log("✅ Metas de venta creadas (mensual + anual)");

  // ══════════════════════════════════════════════════════════════════════
  //  MÓDULO FUNCIONES
  // ══════════════════════════════════════════════════════════════════════

  type FData = { titulo: string; dias: number; sillas: number; canal: "PLATAFORMA" | "TAQUILLA" | "INVITADOS" | "EMPRESA"; ingreso: number };
  const funcionesData: FData[] = [
    // Hace ~4-5 meses (para segmento "Frío" en recencia)
    { titulo: "La Casa de Bernarda Alba", dias: -150, sillas: 190, canal: "PLATAFORMA", ingreso: 15200000 },
    { titulo: "La Casa de Bernarda Alba", dias: -148, sillas: 165, canal: "PLATAFORMA", ingreso: 13200000 },
    { titulo: "Concierto Sinfónico de Cámara", dias: -135, sillas: 120, canal: "TAQUILLA", ingreso: 9600000 },
    { titulo: "Concierto Sinfónico de Cámara", dias: -133, sillas: 98, canal: "TAQUILLA", ingreso: 7840000 },
    // Hace ~2-3 meses (para segmento "Tibio")
    { titulo: "Hamlet — Versión Contemporánea", dias: -85, sillas: 205, canal: "PLATAFORMA", ingreso: 16400000 },
    { titulo: "Hamlet — Versión Contemporánea", dias: -83, sillas: 178, canal: "PLATAFORMA", ingreso: 14240000 },
    { titulo: "Noche de Stand-up Comedy", dias: -70, sillas: 145, canal: "TAQUILLA", ingreso: 8700000 },
    { titulo: "Recital de Danza Contemporánea", dias: -55, sillas: 110, canal: "PLATAFORMA", ingreso: 8800000 },
    // Hace ~2-4 semanas (para segmento "Activo" y candidatos a cola de NPS)
    { titulo: "Don Quijote — Adaptación Teatral", dias: -28, sillas: 195, canal: "PLATAFORMA", ingreso: 15600000 },
    { titulo: "Don Quijote — Adaptación Teatral", dias: -26, sillas: 210, canal: "PLATAFORMA", ingreso: 16800000 },
    { titulo: "Concierto Acústico — Trío Andino", dias: -14, sillas: 130, canal: "TAQUILLA", ingreso: 7800000 },
    { titulo: "Función especial — Colegio San Marcos", dias: -20, sillas: 239, canal: "EMPRESA", ingreso: 6500000 },
    { titulo: "Obra Infantil — El Mago de Oz", dias: -5, sillas: 100, canal: "PLATAFORMA", ingreso: 6000000 },
    // Próximas (una de ellas con ocupación baja a <5 días para disparar la alerta en vivo)
    { titulo: "Réquiem — Concierto Coral", dias: 3, sillas: 45, canal: "PLATAFORMA", ingreso: 3600000 },
    { titulo: "La Casa de Bernarda Alba (reestreno)", dias: 9, sillas: 88, canal: "PLATAFORMA", ingreso: 7040000 },
    { titulo: "Noche de Jazz en el Teatro", dias: 16, sillas: 60, canal: "TAQUILLA", ingreso: 3600000 },
  ];

  const funciones = [];
  for (const f of funcionesData) {
    const fn = await prisma.funcion.create({
      data: {
        titulo: f.titulo,
        fecha: dia(f.dias),
        sillasTotales: 239,
        sillasVendidas: f.sillas,
        canal: f.canal,
        ingresoEstimado: f.ingreso,
        tenantId: tenant.id,
      },
    });
    funciones.push(fn);
  }
  console.log(`✅ Funciones creadas: ${funciones.length} (incluye 1 próxima con ocupación 19% a 3 días — dispara la alerta de ocupación baja)`);

  // ══════════════════════════════════════════════════════════════════════
  //  MÓDULO AUDIENCIA — espectadores + asistencias + membresías + NPS
  // ══════════════════════════════════════════════════════════════════════

  const nombresEspectadores = [
    "Camila Torres", "Juan David Peña", "Valeria Ospina", "Santiago Rojas", "Manuela Cárdenas",
    "Nicolás Vargas", "Daniela Muñoz", "Sebastián Herrera", "Isabella Gómez", "Mateo Castillo",
    "Gabriela Ríos", "Samuel Duarte", "Luciana Salazar", "Emiliano Cuéllar", "Antonia Bermúdez",
    "David Aguirre", "Sara Londoño", "Tomás Restrepo", "Mariana Quintero", "Felipe Navarro",
    "Laura Escobar", "Andrés Zapata", "Paula Jiménez", "Diego Correa", "Alejandra Mora",
    "Cristian Buitrago", "Natalia Serrano", "Julián Prieto", "Valentina Suárez", "Óscar Medina",
    "Catalina Fajardo", "Ricardo Delgado", "Melissa Vanegas", "Esteban Guerrero", "Sofía Palacios",
  ];

  const espectadores = [];
  for (let i = 0; i < nombresEspectadores.length; i++) {
    const nombre = nombresEspectadores[i];
    const slug = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".");
    const esp = await prisma.espectador.create({
      data: {
        nombre,
        email: `${slug}@ejemplo.com`,
        telefono: `3${(10 + i).toString().padStart(2, "0")} ${(1000000 + i * 137).toString().slice(0, 3)} ${(1000 + i * 91).toString().slice(-4)}`,
        segmento: i % 9 === 0 ? "GRUPO" : i % 11 === 0 ? "COLEGIO" : "INDIVIDUAL",
        tenantId: tenant.id,
      },
    });
    espectadores.push(esp);
  }
  console.log(`✅ Espectadores creados: ${espectadores.length}`);

  // Índices de función por ventana temporal (0-3: hace ~4-5 meses / 4-7: hace
  // ~2-3 meses / 8-12: hace 2-4 semanas) — ver funcionesData arriba.
  // Plan de asistencia por espectador (índices en `funciones`), diseñado para
  // que emerjan los 3 segmentos de recencia y una tasa de recompra realista:
  //  - "Mecenas" (5): asisten a funciones en las 3 ventanas -> siempre "Activo"
  //  - "Fanático" (7): asisten sobre todo en tibio + activo, repiten seguido
  //  - Recurrentes activos sin membresía (8): 2 funciones recientes
  //  - Solo-frío / solo-tibio (10): asistieron una vez, no han vuelto (recencia B/C)
  //  - Una sola función reciente (5): recién llegados, aún sin patrón
  const planAsistencia: number[][] = [
    // Mecenas — asisten mucho, en todas las ventanas
    [0, 4, 8, 11], [1, 5, 9, 12], [2, 6, 8, 10], [3, 7, 9, 11], [0, 5, 8, 9, 12],
    // Fanáticos — repiten en tibio + activo
    [4, 8, 9], [5, 9, 10], [6, 8, 11], [7, 9, 12], [4, 8, 10], [5, 11], [6, 8, 9],
    // Recurrentes activos recientes, sin membresía asignada aún
    [8, 9], [9, 10], [8, 11], [9, 12], [8, 10], [11, 12], [8, 9, 10], [9, 11],
    // Solo asistieron en la ventana fría o tibia — no han vuelto (candidatos a reactivación)
    [0], [1], [2], [3], [4], [5], [6], [7], [0, 1], [2, 3],
    // Recién llegados — una sola función muy reciente
    [12], [11], [10], [9], [8],
  ];

  const nivelPorIndice: Record<number, "MECENAS" | "FANATICO"> = {};
  for (let i = 0; i < 5; i++) nivelPorIndice[i] = "MECENAS";
  for (let i = 5; i < 12; i++) nivelPorIndice[i] = "FANATICO";

  let totalAsistencias = 0;
  for (let i = 0; i < espectadores.length; i++) {
    const esp = espectadores[i];
    const plan = planAsistencia[i] ?? [8];
    if (nivelPorIndice[i]) {
      await prisma.espectador.update({ where: { id: esp.id }, data: { nivelMembresia: nivelPorIndice[i] } });
    }
    for (const fIdx of plan) {
      const fn = funciones[fIdx];
      await prisma.asistencia.create({ data: { funcionId: fn.id, espectadorId: esp.id, tenantId: tenant.id } });
      totalAsistencias++;
    }
  }
  console.log(`✅ Asistencias registradas: ${totalAsistencias} (genera tasa de recompra y segmentos A/B/C reales)`);
  console.log(`✅ Membresías asignadas: 5 Mecenas, 7 Fanático`);

  // ── NPS: respuestas para funciones antiguas, dejando pendientes las 2
  // funciones más recientes (>24h) para que la Cola de NPS tenga contenido ──
  const funcionesConNpsYaRespondido = [0, 1, 2, 4, 5, 6, 8, 9]; // frío + tibio + una parte de activo
  let totalNps = 0;
  for (const fIdx of funcionesConNpsYaRespondido) {
    const fn = funciones[fIdx];
    const asistentes = await prisma.asistencia.findMany({ where: { funcionId: fn.id }, take: 3 });
    for (const a of asistentes) {
      const puntuacion = 6 + Math.floor(Math.abs(Math.sin(fIdx * 7 + totalNps)) * 5); // 6-10, determinístico
      await prisma.npsRespuesta.create({
        data: { puntuacion, funcionId: fn.id, espectadorId: a.espectadorId, comentario: puntuacion >= 9 ? "Excelente experiencia, ¡volveremos pronto!" : null },
      });
      // Marca la asistencia como ya contactada para que no aparezca en la cola
      await prisma.asistencia.update({ where: { id: a.id }, data: { npsSolicitadoEn: new Date() } });
      totalNps++;
    }
  }
  // La función índice 10 (hace 14 días) se marca como "solicitada" pero SIN
  // respuesta -> ya fue contactada, no debe aparecer en la cola.
  const asistFuncion10 = await prisma.asistencia.findMany({ where: { funcionId: funciones[10].id } });
  for (const a of asistFuncion10) {
    await prisma.asistencia.update({ where: { id: a.id }, data: { npsSolicitadoEn: dia(-13) } });
  }
  // Las funciones índice 11 y 12 (hace 20 y 5 días) se dejan SIN marcar ->
  // quedan pendientes en la Cola de NPS para la demo en vivo.
  console.log(`✅ Respuestas NPS registradas: ${totalNps}`);
  console.log(`✅ Cola de NPS pendiente: asistentes de las 2 funciones más recientes quedan sin contactar (demo en vivo)`);

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         SEED DEMO TEATRO COMPLETADO ✅                     ║
╠════════════════════════════════════════════════════════════╣
║  Tenant:      Demo Teatro (Funciones + Audiencia activos)  ║
║  Usuarios:    3 (admin, gerente, comercial)                ║
║  Empresas B2B: 6 · Contactos: 6 · Pipeline: 6 oportunidades║
║  Cotizaciones: 3 · Metas de venta: mensual + anual         ║
║  Funciones:   16 (pasadas + 3 próximas)                    ║
║  Espectadores: 35 · Asistencias: ${String(totalAsistencias).padEnd(3)} · NPS: ${String(totalNps).padEnd(3)}          ║
║  Membresías:  5 Mecenas, 7 Fanático                         ║
╠════════════════════════════════════════════════════════════╣
║  CREDENCIALES DE ACCESO:                                    ║
║  URL: https://crm.evoluteca.com/login                       ║
║  ───────────────────────────────────────────────────────   ║
║  Admin:     admin@demo-teatro.com                           ║
║  Gerente:   gerente@demo-teatro.com                         ║
║  Comercial: comercial@demo-teatro.com                       ║
║  Password (todos): Demo2026!                                ║
╚════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
