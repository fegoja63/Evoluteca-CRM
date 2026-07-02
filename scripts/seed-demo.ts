/**
 * Seed de datos demo para Evoluteca CRM
 * Tenant: "Demo Evoluteca" — empresa de servicios genérica
 *
 * Ejecutar con:
 *   npx ts-node --project tsconfig.json -e "require('./scripts/seed-demo.ts')"
 * O directamente:
 *   npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed demo...\n");

  // ── Limpiar tenant demo previo si existe ──────────────────────────────────
  const previo = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (previo) {
    await prisma.tenant.delete({ where: { id: previo.id } });
    console.log("🗑  Tenant demo previo eliminado.");
  }

  // ── TENANT ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      nombre: "Demo Evoluteca",
      slug: "demo-evoluteca",
      plan: "empresa",
      activo: true,
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre}`);

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const passHash = await bcrypt.hash("Demo2026!", 10);

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Laura Mendoza",
      email: "admin@demo-evoluteca.com",
      passwordHash: passHash,
      rol: "ADMINISTRADOR",
      tenantId: tenant.id,
    },
  });

  const gerente = await prisma.usuario.create({
    data: {
      nombre: "Carlos Vargas",
      email: "gerente@demo-evoluteca.com",
      passwordHash: passHash,
      rol: "GERENTE",
      tenantId: tenant.id,
    },
  });

  const vendedor1 = await prisma.usuario.create({
    data: {
      nombre: "Sofía Restrepo",
      email: "sofia@demo-evoluteca.com",
      passwordHash: passHash,
      rol: "COMERCIAL",
      tenantId: tenant.id,
    },
  });

  const vendedor2 = await prisma.usuario.create({
    data: {
      nombre: "Andrés Castillo",
      email: "andres@demo-evoluteca.com",
      passwordHash: passHash,
      rol: "COMERCIAL",
      tenantId: tenant.id,
    },
  });

  console.log(`✅ Usuarios creados: ${admin.nombre}, ${gerente.nombre}, ${vendedor1.nombre}, ${vendedor2.nombre}`);

  // ── CATÁLOGO DE SERVICIOS ─────────────────────────────────────────────────
  const servicios = await Promise.all([
    prisma.producto.create({ data: { nombre: "Consultoría estratégica", descripcion: "Diagnóstico y plan de acción empresarial", precioBase: 4500000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Capacitación corporativa", descripcion: "Taller presencial o virtual, hasta 20 personas", precioBase: 2800000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Implementación de procesos", descripcion: "Levantamiento, diseño e implementación de procesos", precioBase: 6500000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Auditoría organizacional", descripcion: "Evaluación completa de estructura y operaciones", precioBase: 3800000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Mentoría ejecutiva", descripcion: "Sesiones 1:1 mensuales con consultor senior", precioBase: 1500000, activo: true, tenantId: tenant.id } }),
    prisma.producto.create({ data: { nombre: "Diseño de indicadores KPI", descripcion: "Definición y tablero de control de KPIs", precioBase: 2200000, activo: true, tenantId: tenant.id } }),
  ]);
  console.log(`✅ Catálogo creado: ${servicios.length} servicios`);

  // ── CLIENTES (EMPRESAS) ────────────────────────────────────────────────────
  const [emp1, emp2, emp3, emp4, emp5, emp6, emp7, emp8] = await Promise.all([
    prisma.empresa.create({ data: { nombre: "Inversiones Pacífico S.A.S", sector: "Tecnología", email: "contacto@inverspacifico.co", telefono: "601 234 5678", sitioWeb: "www.inverspacifico.co", etiquetas: ["cliente-frecuente", "premium"], notas: "Cliente desde 2022. Muy comprometido con mejora continua.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Constructora Andina Ltda", sector: "Otro", email: "gerencia@constructoraandina.com", telefono: "604 321 9876", sitioWeb: "www.constructoraandina.com", etiquetas: ["construcción", "potencial-alto"], notas: "Referido por Inversiones Pacífico.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Clínica Salud Total", sector: "Salud", email: "admin@saludtotal.med.co", telefono: "602 456 7890", etiquetas: ["salud", "recurrente"], notas: "Requieren capacitaciones trimestrales.", tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Grupo Educativo Futuro", sector: "Educación", email: "rectoría@gefuturo.edu.co", telefono: "601 987 6543", sitioWeb: "www.gefuturo.edu.co", etiquetas: ["educación"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Distribuidora Nacional S.A", sector: "Otro", email: "compras@distnacional.com", telefono: "605 111 2233", etiquetas: ["distribución", "nuevo"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Agencia Creativa Pixel", sector: "Medios y Comunicación", email: "hola@agenciapixel.co", telefono: "300 555 7777", sitioWeb: "www.agenciapixel.co", etiquetas: ["agencia", "pequeño"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Logística Express Colombia", sector: "Otro", email: "ops@logisticaexpress.co", telefono: "318 888 1234", etiquetas: ["logística", "potencial-alto"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Finca Raíz Premium", sector: "Hospitalidad y Turismo", email: "ventas@fincaraizpremium.com", telefono: "310 222 4455", etiquetas: ["inmobiliaria"], tenantId: tenant.id } }),
  ]);
  console.log(`✅ Empresas creadas: 8`);

  // ── CONTACTOS ─────────────────────────────────────────────────────────────
  const [con1, con2, con3, con4, con5, con6, con7, con8, con9, con10] = await Promise.all([
    prisma.contacto.create({ data: { nombre: "Valentina Torres", email: "v.torres@inverspacifico.co", telefono: "310 111 2222", cargo: "Gerente General", empresaId: emp1.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Ricardo Morales", email: "r.morales@inverspacifico.co", telefono: "311 333 4444", cargo: "Director Financiero", empresaId: emp1.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Felipe Ríos", email: "f.rios@constructoraandina.com", telefono: "312 555 6666", cargo: "Gerente de Proyectos", empresaId: emp2.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Marcela Gutiérrez", email: "m.gutierrez@saludtotal.med.co", telefono: "313 777 8888", cargo: "Directora Administrativa", empresaId: emp3.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Jorge Peña", email: "j.pena@gefuturo.edu.co", telefono: "314 999 0000", cargo: "Rector", empresaId: emp4.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Diana Salcedo", email: "d.salcedo@distnacional.com", telefono: "315 121 3434", cargo: "Jefe de Compras", empresaId: emp5.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Camilo Herrera", email: "c.herrera@agenciapixel.co", telefono: "316 565 7878", cargo: "CEO", empresaId: emp6.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Patricia Lozano", email: "p.lozano@logisticaexpress.co", telefono: "317 090 1212", cargo: "Directora de Operaciones", empresaId: emp7.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Sebastián Quiroz", email: "s.quiroz@fincaraizpremium.com", telefono: "318 343 5656", cargo: "Gerente Comercial", empresaId: emp8.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Andrea Nieto", email: "a.nieto@constructoraandina.com", telefono: "319 787 9090", cargo: "Coordinadora de Calidad", empresaId: emp2.id, tenantId: tenant.id } }),
  ]);
  console.log(`✅ Contactos creados: 10`);

  // ── OPORTUNIDADES ─────────────────────────────────────────────────────────
  const hoy = new Date();
  const dias = (n: number) => new Date(hoy.getTime() + n * 24 * 60 * 60 * 1000);

  const [op1, op2, op3, op4, op5, op6, op7, op8, op9] = await Promise.all([
    // GANADAS
    prisma.oportunidad.create({ data: { titulo: "Consultoría estratégica Q1 2026", etapa: "GANADA", valor: 9000000, costo: 2500000, probabilidad: 100, empresaId: emp1.id, contactoId: con1.id, origenLead: "Referido", recurrente: true, fechaCierre: dias(-30), notas: "Proyecto exitoso, cliente muy satisfecho. Renovación en Q2.", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.oportunidad.create({ data: { titulo: "Capacitación liderazgo gerencial", etapa: "GANADA", valor: 5600000, costo: 1200000, probabilidad: 100, empresaId: emp3.id, contactoId: con4.id, origenLead: "Web", recurrente: false, fechaCierre: dias(-45), tenantId: tenant.id, creadoBy: vendedor2.id } }),
    // NEGOCIACION
    prisma.oportunidad.create({ data: { titulo: "Implementación sistema de procesos", etapa: "NEGOCIACION", valor: 13000000, costo: 4000000, probabilidad: 70, empresaId: emp2.id, contactoId: con3.id, origenLead: "Referido", recurrente: false, fechaCierre: dias(15), notas: "Están revisando propuesta con su junta. Llamar el jueves.", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.oportunidad.create({ data: { titulo: "Rediseño de indicadores KPI corporativos", etapa: "NEGOCIACION", valor: 8800000, costo: 2000000, probabilidad: 65, empresaId: emp7.id, contactoId: con8.id, origenLead: "LinkedIn", recurrente: true, fechaCierre: dias(20), notas: "Segunda reunión programada para la próxima semana.", tenantId: tenant.id, creadoBy: vendedor2.id } }),
    // PROPUESTA
    prisma.oportunidad.create({ data: { titulo: "Auditoría organizacional integral", etapa: "PROPUESTA", valor: 7600000, costo: 1800000, probabilidad: 45, empresaId: emp1.id, contactoId: con2.id, origenLead: "Referido", recurrente: false, fechaCierre: dias(30), notas: "Propuesta enviada el lunes. En espera de respuesta.", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.oportunidad.create({ data: { titulo: "Programa de mentoría ejecutiva anual", etapa: "PROPUESTA", valor: 18000000, costo: 3000000, probabilidad: 40, empresaId: emp4.id, contactoId: con5.id, origenLead: "Evento", recurrente: true, fechaCierre: dias(45), notas: "Interesados en el paquete anual. Reunión de presentación muy positiva.", tenantId: tenant.id, creadoBy: vendedor2.id } }),
    // CALIFICADO
    prisma.oportunidad.create({ data: { titulo: "Consultoría transformación digital", etapa: "CALIFICADO", valor: 22000000, costo: 5500000, probabilidad: 30, empresaId: emp5.id, contactoId: con6.id, origenLead: "Frío", recurrente: false, fechaCierre: dias(60), notas: "Empresa grande, proceso de aprobación largo. Vale la pena.", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    // PROSPECTO
    prisma.oportunidad.create({ data: { titulo: "Taller de innovación y creatividad", etapa: "PROSPECTO", valor: 3500000, probabilidad: 20, empresaId: emp6.id, contactoId: con7.id, origenLead: "Instagram", fechaCierre: dias(75), tenantId: tenant.id, creadoBy: vendedor2.id } }),
    // PERDIDA
    prisma.oportunidad.create({ data: { titulo: "Capacitación ventas B2B", etapa: "PERDIDA", valor: 4200000, probabilidad: 0, empresaId: emp8.id, contactoId: con9.id, origenLead: "Web", notas: "Decidieron hacerlo internamente. Re-contactar en 6 meses.", fechaCierre: dias(-10), tenantId: tenant.id, creadoBy: vendedor2.id } }),
  ]);
  console.log(`✅ Oportunidades creadas: 9 (2 ganadas, 2 negociación, 2 propuesta, 1 calificado, 1 prospecto, 1 perdida)`);

  // ── ACTIVIDADES ───────────────────────────────────────────────────────────
  await Promise.all([
    // Vencidas (para que aparezcan alertas en dashboard)
    prisma.actividad.create({ data: { titulo: "Llamada de seguimiento propuesta Andina", tipo: "LLAMADA", fecha: dias(-5), completada: false, empresaId: emp2.id, contactoId: con3.id, oportunidadId: op3.id, notas: "Confirmar si recibieron la propuesta", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Enviar ajuste de presupuesto KPI", tipo: "EMAIL", fecha: dias(-3), completada: false, empresaId: emp7.id, contactoId: con8.id, oportunidadId: op4.id, tenantId: tenant.id, creadoBy: vendedor2.id } }),
    prisma.actividad.create({ data: { titulo: "Reunión inicial Distribuidora Nacional", tipo: "REUNION", fecha: dias(-2), completada: false, empresaId: emp5.id, contactoId: con6.id, notas: "Primer contacto para calificar necesidades", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    // Completadas
    prisma.actividad.create({ data: { titulo: "Presentación de resultados Q1", tipo: "REUNION", fecha: dias(-35), completada: true, empresaId: emp1.id, contactoId: con1.id, oportunidadId: op1.id, tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Entrega informe consultoría", tipo: "EMAIL", fecha: dias(-28), completada: true, empresaId: emp1.id, contactoId: con1.id, oportunidadId: op1.id, tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Taller liderazgo — sesión 1", tipo: "REUNION", fecha: dias(-50), completada: true, empresaId: emp3.id, contactoId: con4.id, oportunidadId: op2.id, tenantId: tenant.id, creadoBy: vendedor2.id } }),
    // Próximas
    prisma.actividad.create({ data: { titulo: "Llamada cierre negociación Andina", tipo: "LLAMADA", fecha: dias(2), completada: false, empresaId: emp2.id, contactoId: con3.id, oportunidadId: op3.id, notas: "Objetivo: cerrar contrato esta semana", tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Demo herramienta KPI con Patricia", tipo: "REUNION", fecha: dias(4), completada: false, empresaId: emp7.id, contactoId: con8.id, oportunidadId: op4.id, tenantId: tenant.id, creadoBy: vendedor2.id } }),
    prisma.actividad.create({ data: { titulo: "Seguimiento propuesta auditoría", tipo: "LLAMADA", fecha: dias(3), completada: false, empresaId: emp1.id, contactoId: con2.id, oportunidadId: op5.id, tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Reunión presentación mentoría ejecutiva", tipo: "REUNION", fecha: dias(7), completada: false, empresaId: emp4.id, contactoId: con5.id, oportunidadId: op6.id, notas: "Llevar casos de éxito de clientes similares", tenantId: tenant.id, creadoBy: vendedor2.id } }),
    prisma.actividad.create({ data: { titulo: "Enviar propuesta Distribuidora Nacional", tipo: "TAREA", fecha: dias(5), completada: false, empresaId: emp5.id, contactoId: con6.id, oportunidadId: op7.id, tenantId: tenant.id, creadoBy: vendedor1.id } }),
    prisma.actividad.create({ data: { titulo: "Contactar Agencia Pixel por taller", tipo: "LLAMADA", fecha: dias(10), completada: false, empresaId: emp6.id, contactoId: con7.id, oportunidadId: op8.id, tenantId: tenant.id, creadoBy: vendedor2.id } }),
  ]);
  console.log(`✅ Actividades creadas: 12 (3 vencidas, 3 completadas, 6 próximas)`);

  // ── COTIZACIONES ──────────────────────────────────────────────────────────
  // Cotización ACEPTADA
  const cot1 = await prisma.cotizacion.create({
    data: {
      estado: "ACEPTADA",
      sede: "Oficinas cliente",
      fechaEvento: dias(-25),
      fechaValidez: dias(-5),
      notas: "Incluye 3 sesiones de seguimiento post-implementación.",
      empresaId: emp1.id,
      contactoId: con1.id,
      oportunidadId: op1.id,
      tenantId: tenant.id,
      items: {
        create: [
          { descripcion: "Consultoría estratégica — Fase diagnóstico", cantidad: 1, precioUnit: 4500000 },
          { descripcion: "Consultoría estratégica — Fase implementación", cantidad: 1, precioUnit: 4500000 },
        ],
      },
    },
  });

  // Cotización ENVIADA (sin respuesta > 3 días — activa alerta)
  const cot2 = await prisma.cotizacion.create({
    data: {
      estado: "ENVIADA",
      fechaValidez: dias(15),
      notas: "Propuesta ajustada según feedback de la reunión del 12 de junio.",
      empresaId: emp2.id,
      contactoId: con3.id,
      oportunidadId: op3.id,
      tenantId: tenant.id,
      creadoEn: dias(-5),
      items: {
        create: [
          { descripcion: "Levantamiento de procesos actuales", cantidad: 1, precioUnit: 2500000 },
          { descripcion: "Diseño de procesos optimizados", cantidad: 1, precioUnit: 4000000 },
          { descripcion: "Implementación y acompañamiento", cantidad: 1, precioUnit: 6500000 },
        ],
      },
    },
  });

  // Cotización ENVIADA reciente
  await prisma.cotizacion.create({
    data: {
      estado: "ENVIADA",
      fechaValidez: dias(20),
      empresaId: emp7.id,
      contactoId: con8.id,
      oportunidadId: op4.id,
      tenantId: tenant.id,
      creadoEn: dias(-1),
      items: {
        create: [
          { descripcion: "Diagnóstico de indicadores actuales", cantidad: 1, precioUnit: 1200000 },
          { descripcion: "Diseño tablero KPI ejecutivo", cantidad: 1, precioUnit: 2200000 },
          { descripcion: "Capacitación en uso del tablero", cantidad: 2, precioUnit: 1400000 },
          { descripcion: "Soporte post-implementación (3 meses)", cantidad: 1, precioUnit: 2000000 },
        ],
      },
    },
  });

  // Cotización BORRADOR
  await prisma.cotizacion.create({
    data: {
      estado: "BORRADOR",
      fechaValidez: dias(30),
      notas: "En revisión interna antes de enviar.",
      empresaId: emp4.id,
      contactoId: con5.id,
      oportunidadId: op6.id,
      tenantId: tenant.id,
      items: {
        create: [
          { descripcion: "Mentoría ejecutiva individual — 12 sesiones", cantidad: 12, precioUnit: 1500000 },
          { descripcion: "Evaluación inicial y plan de desarrollo", cantidad: 1, precioUnit: 800000 },
        ],
      },
    },
  });

  // Cotización RECHAZADA
  await prisma.cotizacion.create({
    data: {
      estado: "RECHAZADA",
      motivoRechazo: "presupuesto",
      notas: "Cliente indicó que el presupuesto fue recortado.",
      empresaId: emp8.id,
      contactoId: con9.id,
      oportunidadId: op9.id,
      tenantId: tenant.id,
      creadoEn: dias(-15),
      items: {
        create: [
          { descripcion: "Capacitación técnicas de venta B2B", cantidad: 1, precioUnit: 2800000 },
          { descripcion: "Taller de cierre de negocios", cantidad: 1, precioUnit: 1400000 },
        ],
      },
    },
  });

  console.log(`✅ Cotizaciones creadas: 5 (1 aceptada, 2 enviadas, 1 borrador, 1 rechazada)`);

  // ── PLANTILLA DE COTIZACIÓN ────────────────────────────────────────────────
  await prisma.plantillaCotizacion.create({
    data: {
      nombre: "Paquete Consultoría Estándar",
      notas: "Incluye diagnóstico, implementación y seguimiento.",
      tenantId: tenant.id,
      items: {
        create: [
          { descripcion: "Diagnóstico organizacional", cantidad: 1, precioUnit: 2500000 },
          { descripcion: "Plan de acción estratégico", cantidad: 1, precioUnit: 3000000 },
          { descripcion: "Acompañamiento en implementación", cantidad: 1, precioUnit: 4500000 },
          { descripcion: "Informe de resultados", cantidad: 1, precioUnit: 1000000 },
        ],
      },
    },
  });

  await prisma.plantillaCotizacion.create({
    data: {
      nombre: "Capacitación Corporativa Básica",
      tenantId: tenant.id,
      items: {
        create: [
          { descripcion: "Taller presencial (8 horas)", cantidad: 1, precioUnit: 2800000 },
          { descripcion: "Material de trabajo por participante", cantidad: 20, precioUnit: 35000 },
          { descripcion: "Informe de aprendizaje", cantidad: 1, precioUnit: 500000 },
        ],
      },
    },
  });

  console.log(`✅ Plantillas de cotización creadas: 2`);

  // ── METAS DE VENTA ────────────────────────────────────────────────────────
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

  await Promise.all([
    prisma.metaVenta.create({ data: { mes: mesActual, metaCOP: 40000000, tenantId: tenant.id } }),
    prisma.metaVenta.create({ data: { mes: mesAnterior, metaCOP: 35000000, tenantId: tenant.id } }),
    prisma.metaVendedor.create({ data: { mes: mesActual, metaCOP: 20000000, usuarioId: vendedor1.id, tenantId: tenant.id } }),
    prisma.metaVendedor.create({ data: { mes: mesActual, metaCOP: 20000000, usuarioId: vendedor2.id, tenantId: tenant.id } }),
  ]);
  console.log(`✅ Metas de venta creadas`);

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║         SEED DEMO COMPLETADO ✅                      ║
╠══════════════════════════════════════════════════════╣
║  Tenant:     Demo Evoluteca                          ║
║  Usuarios:   4 (admin, gerente, 2 comerciales)       ║
║  Empresas:   8 clientes                              ║
║  Contactos:  10                                      ║
║  Pipeline:   9 oportunidades en 5 etapas             ║
║  Actividades: 12 (3 vencidas → alertas activas)      ║
║  Cotizaciones: 5 en distintos estados                ║
║  Catálogo:   6 servicios                             ║
║  Plantillas: 2                                       ║
╠══════════════════════════════════════════════════════╣
║  CREDENCIALES DE ACCESO:                             ║
║  URL: https://evoluteca-crm-six.vercel.app/login     ║
║  ─────────────────────────────────────────────────   ║
║  Admin:    admin@demo-evoluteca.com                  ║
║  Gerente:  gerente@demo-evoluteca.com                ║
║  Vendedor: sofia@demo-evoluteca.com                  ║
║  Vendedor: andres@demo-evoluteca.com                 ║
║  Password (todos): Demo2026!                         ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
