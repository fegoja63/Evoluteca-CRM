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
      modulos: { funciones: true, audiencia: true, salones: true },
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre} (Funciones + Audiencia + Salones activos)`);

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

  // ── CLIENTES B2B — 50 empresas (colegios, universidades, corporativos,
  // agencias, ONGs, entidades públicas, religiosas, clubes) ────────────────
  type EmpresaSpec = { nombre: string; sector: string; tag: string };
  const empresasSpecs: EmpresaSpec[] = [
    // Colegios (10)
    { nombre: "Colegio San Marcos", sector: "Educación", tag: "colegio" },
    { nombre: "Colegio Bilingüe del Norte", sector: "Educación", tag: "colegio" },
    { nombre: "Gimnasio Los Andes", sector: "Educación", tag: "colegio" },
    { nombre: "Colegio Nueva Granada", sector: "Educación", tag: "colegio" },
    { nombre: "Instituto Técnico San Rafael", sector: "Educación", tag: "colegio" },
    { nombre: "Liceo Moderno del Valle", sector: "Educación", tag: "colegio" },
    { nombre: "Colegio Campestre El Bosque", sector: "Educación", tag: "colegio" },
    { nombre: "Institución Educativa Santa Fe", sector: "Educación", tag: "colegio" },
    { nombre: "Colegio Anglo Colombiano", sector: "Educación", tag: "colegio" },
    { nombre: "Gimnasio Femenino del Norte", sector: "Educación", tag: "colegio" },
    // Universidades (3)
    { nombre: "Universidad del Rosario Norte", sector: "Educación", tag: "universidad" },
    { nombre: "Universidad Central Extensión", sector: "Educación", tag: "universidad" },
    { nombre: "Politécnico Gran Sabana", sector: "Educación", tag: "universidad" },
    // Corporativos (15)
    { nombre: "Tech Solutions Colombia", sector: "Tecnología", tag: "corporativo" },
    { nombre: "Aseguradora Confianza S.A", sector: "Otro", tag: "corporativo" },
    { nombre: "Banco Regional del Norte", sector: "Otro", tag: "corporativo" },
    { nombre: "Farmacéutica BioMed", sector: "Salud", tag: "corporativo" },
    { nombre: "Grupo Editorial Nuevos Horizontes", sector: "Medios y Comunicación", tag: "corporativo" },
    { nombre: "Constructora Andina Ltda", sector: "Otro", tag: "corporativo" },
    { nombre: "Distribuidora Nacional S.A", sector: "Otro", tag: "corporativo" },
    { nombre: "Logística Express Colombia", sector: "Otro", tag: "corporativo" },
    { nombre: "Retail Moda Total", sector: "Otro", tag: "corporativo" },
    { nombre: "Consultora Estratégica Prisma", sector: "Otro", tag: "corporativo" },
    { nombre: "Industrias Metálicas del Sur", sector: "Otro", tag: "corporativo" },
    { nombre: "Telecomunicaciones Andinas", sector: "Tecnología", tag: "corporativo" },
    { nombre: "Grupo Financiero Meridiano", sector: "Otro", tag: "corporativo" },
    { nombre: "Automotriz del Pacífico", sector: "Otro", tag: "corporativo" },
    { nombre: "Energía Renovable Colombia", sector: "Otro", tag: "corporativo" },
    // Agencias (5)
    { nombre: "Agencia Momentum Eventos", sector: "Medios y Comunicación", tag: "agencia" },
    { nombre: "Producciones Estelar", sector: "Medios y Comunicación", tag: "agencia" },
    { nombre: "Creativa Group Eventos", sector: "Medios y Comunicación", tag: "agencia" },
    { nombre: "Agencia Punto Vivo", sector: "Medios y Comunicación", tag: "agencia" },
    { nombre: "BTL Experiencias", sector: "Medios y Comunicación", tag: "agencia" },
    // ONGs (5)
    { nombre: "Fundación Cultura Viva", sector: "Arte y Cultura", tag: "ong" },
    { nombre: "Fundación Arte y Comunidad", sector: "Arte y Cultura", tag: "ong" },
    { nombre: "ONG Sembrando Futuro", sector: "Otro", tag: "ong" },
    { nombre: "Fundación Manos Unidas", sector: "Otro", tag: "ong" },
    { nombre: "Corporación Educativa Renacer", sector: "Educación", tag: "ong" },
    // Entidades públicas (5)
    { nombre: "Cámara de Comercio Local", sector: "Gobierno", tag: "publica" },
    { nombre: "Secretaría de Cultura Distrital", sector: "Gobierno", tag: "publica" },
    { nombre: "Alcaldía Local — Oficina de Eventos", sector: "Gobierno", tag: "publica" },
    { nombre: "Instituto Distrital de las Artes", sector: "Gobierno", tag: "publica" },
    { nombre: "Gobernación — Programa Cultural", sector: "Gobierno", tag: "publica" },
    // Religiosas (3)
    { nombre: "Parroquia San José", sector: "Religioso", tag: "religiosa" },
    { nombre: "Comunidad Cristiana Vida Nueva", sector: "Religioso", tag: "religiosa" },
    { nombre: "Arquidiócesis — Pastoral Juvenil", sector: "Religioso", tag: "religiosa" },
    // Clubes / asociaciones (4)
    { nombre: "Club Rotario Central", sector: "Otro", tag: "club" },
    { nombre: "Asociación de Egresados Unidos", sector: "Otro", tag: "club" },
    { nombre: "Club Social Los Fundadores", sector: "Otro", tag: "club" },
    { nombre: "Asociación Colombiana de Productores", sector: "Otro", tag: "club" },
  ];

  const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

  const empresas: { id: string; nombre: string }[] = [];
  for (let i = 0; i < empresasSpecs.length; i++) {
    const spec = empresasSpecs[i];
    const emp = await prisma.empresa.create({
      data: {
        nombre: spec.nombre,
        sector: spec.sector,
        email: `contacto@${slugify(spec.nombre)}.co`,
        telefono: `601 555 ${String(1000 + i).slice(-4)}`,
        etiquetas: [spec.tag],
        tenantId: tenant.id,
      },
    });
    empresas.push(emp);
  }
  console.log(`✅ Empresas B2B creadas: ${empresas.length}`);

  // ── CONTACTOS — 80 en total (30 empresas con 2, 20 empresas con 1) ───────
  const nombresPila = ["Andrés", "María", "Carlos", "Laura", "Juan", "Diana", "Felipe", "Camila", "Santiago", "Valentina", "Daniel", "Isabella", "Miguel", "Sofía", "Alejandro", "Gabriela", "Ricardo", "Paula", "Esteban", "Natalia"];
  const apellidos = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Hernández", "Pérez", "Sánchez", "Ramírez", "Torres", "Flórez", "Rojas", "Castro", "Ortiz", "Silva", "Vargas", "Molina", "Cárdenas", "Reyes", "Salazar"];
  const cargosPorTag: Record<string, string[]> = {
    colegio: ["Rector", "Coordinador de Eventos", "Coordinadora Académica"],
    universidad: ["Decano de Bienestar", "Coordinador de Eventos Institucionales"],
    corporativo: ["Gerente de Recursos Humanos", "Directora de Comunicaciones", "Head of People", "Gerente Comercial"],
    agencia: ["Productor General", "Director de Cuentas"],
    ong: ["Directora de Proyectos", "Coordinador de Alianzas"],
    publica: ["Coordinador de Cultura", "Profesional de Eventos"],
    religiosa: ["Párroco", "Coordinador de Pastoral"],
    club: ["Presidente", "Secretario General"],
  };

  let contactoIdx = 0;
  const contactosPorEmpresa: Record<string, { id: string; nombre: string }[]> = {};
  for (let i = 0; i < empresas.length; i++) {
    const emp = empresas[i];
    const spec = empresasSpecs[i];
    const cantidad = i < 30 ? 2 : 1; // 30×2 + 20×1 = 80
    contactosPorEmpresa[emp.id] = [];
    for (let j = 0; j < cantidad; j++) {
      const nombreCompleto = `${nombresPila[contactoIdx % nombresPila.length]} ${apellidos[(contactoIdx * 3) % apellidos.length]}`;
      const cargos = cargosPorTag[spec.tag] ?? ["Coordinador"];
      const con = await prisma.contacto.create({
        data: {
          nombre: nombreCompleto,
          cargo: cargos[j % cargos.length],
          email: `${slugify(nombreCompleto)}@ejemplo.com`,
          telefono: `3${String(10 + contactoIdx).padStart(2, "0")} ${String(2000000 + contactoIdx * 173).slice(0, 3)} ${String(1000 + contactoIdx * 57).slice(-4)}`,
          empresaId: emp.id,
          tenantId: tenant.id,
        },
      });
      contactosPorEmpresa[emp.id].push(con);
      contactoIdx++;
    }
  }
  console.log(`✅ Contactos creados: ${contactoIdx}`);

  // ── PIPELINE — 40 oportunidades: 20 activas repartidas en los 4 rangos de
  // antigüedad (<30, 30-60, 60-90, >90 días desde creadoEn), 12 ganadas
  // (3 en el mes en curso) y 8 perdidas, distribuidas en los últimos meses ──
  type Etapa = "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";
  type OpSpec = { etapa: Etapa; diasCreacion: number; diasCierre: number; valor: number; probabilidad: number };

  const opsSpecs: OpSpec[] = [];
  const etapasActivas: Etapa[] = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];
  const bucketsDias = [-8, -18, -40, -70, -110]; // 2× <30d, 1× 30-60d, 1× 60-90d, 1× >90d
  for (const etapa of etapasActivas) {
    for (const dc of bucketsDias) {
      const probBase = etapa === "PROSPECTO" ? 20 : etapa === "CALIFICADO" ? 35 : etapa === "PROPUESTA" ? 50 : 70;
      opsSpecs.push({ etapa, diasCreacion: dc, diasCierre: 15 + (Math.abs(dc) % 20), valor: 3500000 + (Math.abs(dc) % 7) * 1200000, probabilidad: probBase });
    }
  }
  // Ganadas — 3 dentro del mes en curso para que "Ganado este mes" no sea $0
  const ganadaDiasCierre = [-2, -5, -7, -35, -50, -65, -95, -125, -155, -185, -210, -240];
  for (const dc of ganadaDiasCierre) {
    opsSpecs.push({ etapa: "GANADA", diasCreacion: dc - 25, diasCierre: dc, valor: 4000000 + (Math.abs(dc) % 9) * 900000, probabilidad: 100 });
  }
  // Perdidas
  const perdidaDiasCierre = [-12, -28, -45, -60, -80, -100, -140, -170];
  for (const dc of perdidaDiasCierre) {
    opsSpecs.push({ etapa: "PERDIDA", diasCreacion: dc - 20, diasCierre: dc, valor: 3000000 + (Math.abs(dc) % 6) * 800000, probabilidad: 0 });
  }

  const serviciosTitulo = ["Alquiler sala", "Función privada", "Evento corporativo", "Lanzamiento de marca", "Graduación", "Congreso anual", "Asamblea general", "Concierto corporativo", "Celebración institucional", "Capacitación con acto cultural"];
  const origenes = ["Referido", "Web", "LinkedIn", "Frío", "Instagram"];

  const oportunidades: { id: string; titulo: string; empresaId: string | null; contactoId: string | null }[] = [];
  for (let i = 0; i < opsSpecs.length; i++) {
    const spec = opsSpecs[i];
    const emp = empresas[i % empresas.length];
    const con = contactosPorEmpresa[emp.id][i % contactosPorEmpresa[emp.id].length];
    const op = await prisma.oportunidad.create({
      data: {
        titulo: serviciosTitulo[i % serviciosTitulo.length],
        etapa: spec.etapa,
        valor: spec.valor,
        probabilidad: spec.probabilidad,
        empresaId: emp.id,
        contactoId: con.id,
        origenLead: origenes[i % origenes.length],
        fechaCierre: dia(spec.diasCierre),
        creadoEn: dia(spec.diasCreacion),
        tenantId: tenant.id,
        creadoBy: comercial.id,
      },
    });
    oportunidades.push(op);
  }
  console.log(`✅ Oportunidades creadas: ${oportunidades.length} (20 activas en los 4 rangos de antigüedad, 12 ganadas, 8 perdidas)`);

  // ── ACTIVIDADES — vinculadas a una muestra de oportunidades de distintas
  // etapas y antigüedades ──────────────────────────────────────────────────
  const actividadEspecs: { opIdx: number; tipo: "LLAMADA" | "EMAIL" | "REUNION" | "TAREA"; dias: number; completada: boolean; titulo: string }[] = [
    { opIdx: 15, tipo: "LLAMADA", dias: -4, completada: false, titulo: "Llamada de seguimiento" },
    { opIdx: 10, tipo: "EMAIL", dias: -2, completada: false, titulo: "Enviar propuesta ajustada" },
    { opIdx: 5, tipo: "REUNION", dias: 3, completada: false, titulo: "Reunión inicial de calificación" },
    { opIdx: 20, tipo: "REUNION", dias: -3, completada: true, titulo: "Firma de contrato" },
    { opIdx: 15, tipo: "REUNION", dias: 6, completada: false, titulo: "Visita técnica a la sala" },
    { opIdx: 0, tipo: "TAREA", dias: 8, completada: false, titulo: "Preparar propuesta inicial" },
    { opIdx: 1, tipo: "LLAMADA", dias: -6, completada: false, titulo: "Llamada de seguimiento" },
    { opIdx: 11, tipo: "EMAIL", dias: 5, completada: false, titulo: "Enviar cotización actualizada" },
    { opIdx: 16, tipo: "REUNION", dias: -10, completada: true, titulo: "Presentación de propuesta" },
    { opIdx: 6, tipo: "TAREA", dias: 4, completada: false, titulo: "Validar disponibilidad de fecha" },
    { opIdx: 21, tipo: "LLAMADA", dias: -8, completada: true, titulo: "Confirmación de pago" },
    { opIdx: 2, tipo: "REUNION", dias: 10, completada: false, titulo: "Reunión de seguimiento" },
    { opIdx: 17, tipo: "EMAIL", dias: -1, completada: false, titulo: "Enviar términos de contrato" },
    { opIdx: 12, tipo: "TAREA", dias: 7, completada: false, titulo: "Cotizar producción técnica adicional" },
    { opIdx: 7, tipo: "LLAMADA", dias: -12, completada: false, titulo: "Llamada de seguimiento" },
  ];
  for (const a of actividadEspecs) {
    const op = oportunidades[a.opIdx];
    const nombreEmpresa = empresas.find(e => e.id === op.empresaId)?.nombre ?? "";
    await prisma.actividad.create({
      data: {
        titulo: `${a.titulo} — ${nombreEmpresa}`,
        tipo: a.tipo,
        fecha: dia(a.dias),
        completada: a.completada,
        empresaId: op.empresaId,
        contactoId: op.contactoId,
        oportunidadId: op.id,
        tenantId: tenant.id,
        creadoBy: comercial.id,
      },
    });
  }
  console.log(`✅ Actividades creadas: ${actividadEspecs.length}`);

  // ── COTIZACIONES ──────────────────────────────────────────────────────────
  const cotizacionEspecs: { opIdx: number; estado: "ACEPTADA" | "ENVIADA" | "BORRADOR" | "RECHAZADA"; diasValidez: number; motivoRechazo?: string }[] = [
    { opIdx: 20, estado: "ACEPTADA", diasValidez: -5 },
    { opIdx: 15, estado: "ENVIADA", diasValidez: 15 },
    { opIdx: 10, estado: "BORRADOR", diasValidez: 20 },
    { opIdx: 32, estado: "RECHAZADA", diasValidez: -30, motivoRechazo: "presupuesto" },
    { opIdx: 16, estado: "ENVIADA", diasValidez: 18 },
    { opIdx: 21, estado: "ACEPTADA", diasValidez: -12 },
  ];
  for (const c of cotizacionEspecs) {
    const op = oportunidades[c.opIdx];
    await prisma.cotizacion.create({
      data: {
        estado: c.estado,
        fechaValidez: dia(c.diasValidez),
        motivoRechazo: c.motivoRechazo,
        empresaId: op.empresaId,
        contactoId: op.contactoId,
        oportunidadId: op.id,
        tenantId: tenant.id,
        items: { create: [{ descripcion: op.titulo, cantidad: 1, precioUnit: 4500000 }] },
      },
    });
  }
  console.log(`✅ Cotizaciones creadas: ${cotizacionEspecs.length}`);

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

  // ══════════════════════════════════════════════════════════════════════
  //  MÓDULO SALONES (el teatro también alquila su propia sala a terceros,
  //  así que sirve de demo real de disponibilidad/choque de fechas)
  // ══════════════════════════════════════════════════════════════════════

  const salaPrincipal = await prisma.salon.create({
    data: { nombre: "Sala Principal", capacidad: 239, descripcion: "Sala principal del teatro, capacidad completa.", tenantId: tenant.id },
  });
  const salaVip = await prisma.salon.create({
    data: { nombre: "Sala VIP / Foyer", capacidad: 80, descripcion: "Espacio más íntimo para eventos corporativos pequeños.", tenantId: tenant.id },
  });
  console.log("✅ Salones creados: 2 (Sala Principal, Sala VIP / Foyer)");

  type ReservaSpec = { salonId: string; empresaIdx: number; dias: number; estado: "ACEPTADA" | "ENVIADA" | "BORRADOR"; valor: number };
  const reservasSalones: ReservaSpec[] = [
    { salonId: salaPrincipal.id, empresaIdx: 2,  dias: -10, estado: "ACEPTADA", valor: 6500000 },
    { salonId: salaPrincipal.id, empresaIdx: 8,  dias: 5,   estado: "ACEPTADA", valor: 7200000 },
    { salonId: salaPrincipal.id, empresaIdx: 14, dias: 12,  estado: "ACEPTADA", valor: 5800000 },
    { salonId: salaPrincipal.id, empresaIdx: 20, dias: 12,  estado: "ENVIADA",  valor: 6100000 },
    { salonId: salaPrincipal.id, empresaIdx: 26, dias: 25,  estado: "ENVIADA",  valor: 4900000 },
    { salonId: salaPrincipal.id, empresaIdx: 33, dias: 40,  estado: "ACEPTADA", valor: 8300000 },
    { salonId: salaVip.id,       empresaIdx: 5,  dias: -5,  estado: "ACEPTADA", valor: 3200000 },
    { salonId: salaVip.id,       empresaIdx: 11, dias: 8,   estado: "ACEPTADA", valor: 2900000 },
    { salonId: salaVip.id,       empresaIdx: 18, dias: 18,  estado: "ACEPTADA", valor: 3500000 },
    { salonId: salaVip.id,       empresaIdx: 24, dias: 18,  estado: "BORRADOR", valor: 2700000 },
  ];
  for (const r of reservasSalones) {
    const emp = empresas[r.empresaIdx];
    const con = contactosPorEmpresa[emp.id]?.[0];
    await prisma.cotizacion.create({
      data: {
        estado: r.estado,
        salonId: r.salonId,
        fechaEvento: dia(r.dias),
        fechaValidez: dia(r.dias - 5),
        empresaId: emp.id,
        contactoId: con?.id,
        tenantId: tenant.id,
        items: { create: [{ descripcion: "Alquiler de sala — evento", cantidad: 1, precioUnit: r.valor }] },
      },
    });
  }
  console.log(`✅ Reservas de salones creadas: ${reservasSalones.length} (8 aceptadas, 2 pendientes)`);

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         SEED DEMO TEATRO COMPLETADO ✅                     ║
╠════════════════════════════════════════════════════════════╣
║  Tenant:      Demo Teatro (Funciones+Audiencia+Salones)    ║
║  Usuarios:    3 (admin, gerente, comercial)                ║
║  Empresas B2B: 50 · Contactos: 80 · Pipeline: 40 oport.    ║
║  Cotizaciones: 6 · Metas de venta: mensual + anual         ║
║  Funciones:   16 (pasadas + 3 próximas)                    ║
║  Espectadores: 35 · Asistencias: ${String(totalAsistencias).padEnd(3)} · NPS: ${String(totalNps).padEnd(3)}          ║
║  Membresías:  5 Mecenas, 7 Fanático                         ║
║  Salones:     2 · Reservas: 10 (8 aceptadas, 2 pendientes) ║
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
