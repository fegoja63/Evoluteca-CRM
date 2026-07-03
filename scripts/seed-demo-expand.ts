/**
 * Expansión del demo — 50+ oportunidades, 3 vendedores, más clientes y actividades
 * Ejecutar con: npx tsx scripts/seed-demo-expand.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Expandiendo demo...\n");

  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("❌ Tenant demo no encontrado. Ejecuta seed-demo.ts primero."); return; }

  const passHash = await bcrypt.hash("Demo2026!", 10);

  // ── TERCER VENDEDOR ───────────────────────────────────────────────────────
  const v3exist = await prisma.usuario.findFirst({ where: { email: "miguel@demo-evoluteca.com" } });
  const vendedor3 = v3exist ?? await prisma.usuario.create({
    data: {
      nombre: "Miguel Ángel Forero",
      email: "miguel@demo-evoluteca.com",
      passwordHash: passHash,
      rol: "COMERCIAL",
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Vendedor 3: ${vendedor3.nombre}`);

  // Recuperar vendedores existentes
  const sofia  = await prisma.usuario.findFirst({ where: { email: "sofia@demo-evoluteca.com"  } });
  const andres = await prisma.usuario.findFirst({ where: { email: "andres@demo-evoluteca.com" } });
  const v1 = sofia!.id;
  const v2 = andres!.id;
  const v3 = vendedor3.id;

  // ── NUEVAS EMPRESAS ───────────────────────────────────────────────────────
  const nuevasEmpresas = await Promise.all([
    prisma.empresa.create({ data: { nombre: "Banco Regional del Norte",   sector: "Tecnología",             email: "contacto@bancoreginorte.co",    telefono: "601 100 2000", etiquetas: ["banca","potencial-alto"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Colegio Bilingüe San Marcos", sector: "Educación",             email: "rector@smarcos.edu.co",          telefono: "602 200 3000", etiquetas: ["educación","recurrente"], tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Restaurantes La Brasa S.A",   sector: "Hospitalidad y Turismo", email: "admin@labrasa.com.co",           telefono: "603 300 4000", etiquetas: ["gastronomía"],            tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Clínica Especialistas Unidas", sector: "Salud",                email: "gestion@especialistasunidas.co", telefono: "604 400 5000", etiquetas: ["salud","premium"],        tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Importadora Oriente Ltda",     sector: "Otro",                 email: "compras@importadoraoriente.co",  telefono: "605 500 6000", etiquetas: ["importación","nuevo"],    tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Tech Solutions Colombia",       sector: "Tecnología",           email: "cto@techsolco.com",              telefono: "606 600 7000", etiquetas: ["tech","potencial-alto"],  tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Cooperativa Agropecuaria Llanos", sector: "Otro",              email: "gerencia@coopllanos.co",          telefono: "607 700 8000", etiquetas: ["agro"],                  tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Aseguradora Confianza S.A",    sector: "Tecnología",           email: "ops@aseguradoraconfianza.co",    telefono: "608 800 9000", etiquetas: ["seguros","frecuente"],    tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Editorial Nuevos Horizontes",   sector: "Medios y Comunicación", email: "dir@nuevoshorizontes.co",       telefono: "609 900 1000", etiquetas: ["editorial"],              tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "ONG Sembrando Futuro",          sector: "Educación",            email: "director@sembrandofuturo.org",   telefono: "310 010 1111", etiquetas: ["ong","social"],           tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Aerolínea Regional Vuelos",     sector: "Hospitalidad y Turismo", email: "ops@vuelos-regional.co",       telefono: "311 020 2222", etiquetas: ["aviación","grande"],      tenantId: tenant.id } }),
    prisma.empresa.create({ data: { nombre: "Farmacéutica BioMed",           sector: "Salud",                email: "ventas@biomed.com.co",           telefono: "312 030 3333", etiquetas: ["farmacia","potencial-alto"], tenantId: tenant.id } }),
  ]);
  console.log(`✅ Nuevas empresas: ${nuevasEmpresas.length}`);

  const [emp9,emp10,emp11,emp12,emp13,emp14,emp15,emp16,emp17,emp18,emp19,emp20] = nuevasEmpresas;

  // ── NUEVOS CONTACTOS ──────────────────────────────────────────────────────
  const nuevosContactos = await Promise.all([
    prisma.contacto.create({ data: { nombre: "Hernán Ospina",       email: "h.ospina@bancoreginorte.co",       telefono: "313 040 4444", cargo: "Gerente de Operaciones",   empresaId: emp9.id,  tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Lucía Bermúdez",      email: "l.bermudez@smarcos.edu.co",        telefono: "314 050 5555", cargo: "Coordinadora Académica",   empresaId: emp10.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Roberto Arango",      email: "r.arango@labrasa.com.co",          telefono: "315 060 6666", cargo: "Director de Expansión",    empresaId: emp11.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Natalia Suárez",      email: "n.suarez@especialistasunidas.co",  telefono: "316 070 7777", cargo: "Gerente Administrativa",   empresaId: emp12.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Esteban Molina",      email: "e.molina@importadoraoriente.co",   telefono: "317 080 8888", cargo: "Jefe de Logística",        empresaId: emp13.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Verónica Palacios",   email: "v.palacios@techsolco.com",         telefono: "318 090 9999", cargo: "CEO",                      empresaId: emp14.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Armando Celis",       email: "a.celis@coopllanos.co",            telefono: "319 101 0101", cargo: "Presidente",               empresaId: emp15.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Margarita Flórez",    email: "m.florez@aseguradoraconfianza.co", telefono: "320 111 1212", cargo: "Directora Comercial",      empresaId: emp16.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Julián Cárdenas",     email: "j.cardenas@nuevoshorizontes.co",   telefono: "321 121 2323", cargo: "Editor General",           empresaId: emp17.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Gloria Mejía",        email: "g.mejia@sembrandofuturo.org",      telefono: "322 131 3434", cargo: "Directora Ejecutiva",      empresaId: emp18.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Rodrigo Sánchez",     email: "r.sanchez@vuelos-regional.co",     telefono: "323 141 4545", cargo: "Director de Formación",    empresaId: emp19.id, tenantId: tenant.id } }),
    prisma.contacto.create({ data: { nombre: "Isabela Montoya",     email: "i.montoya@biomed.com.co",          telefono: "324 151 5656", cargo: "Gerente de Desarrollo",    empresaId: emp20.id, tenantId: tenant.id } }),
  ]);
  console.log(`✅ Nuevos contactos: ${nuevosContactos.length}`);

  const [c11,c12,c13,c14,c15,c16,c17,c18,c19,c20,c21,c22] = nuevosContactos;

  // ── 45 OPORTUNIDADES NUEVAS ───────────────────────────────────────────────
  const hoy = new Date();
  const d = (n: number) => new Date(hoy.getTime() + n * 86400000);

  const ops = [
    // ── SOFÍA (v1) — 15 oportunidades ────────────────────────────────────
    { titulo: "Transformación cultural Banco Regional",        etapa:"NEGOCIACION", valor:28000000, costo:7000000, prob:75, eId:emp9.id,  cId:c11.id, origen:"Referido",  rec:true,  fc:d(12), fe:d(30),  notas:"Proceso largo pero muy prometedor. Aprobación de junta en 2 semanas.", by:v1 },
    { titulo: "Capacitación docentes Colegio San Marcos",      etapa:"GANADA",      valor:8400000,  costo:2000000, prob:100,eId:emp10.id, cId:c12.id, origen:"Web",        rec:true,  fc:d(-20),fe:d(-10), notas:"Ejecutado exitosamente. Renovar para segundo semestre.", by:v1 },
    { titulo: "Programa liderazgo restaurantes La Brasa",      etapa:"PROPUESTA",   valor:12500000, costo:3500000, prob:50, eId:emp11.id, cId:c13.id, origen:"Evento",     rec:false, fc:d(25), fe:d(45),  notas:"Propuesta enviada. Tienen 4 sedes interesadas.", by:v1 },
    { titulo: "Auditoría procesos clínica Especialistas",      etapa:"NEGOCIACION", valor:15000000, costo:4000000, prob:70, eId:emp12.id, cId:c14.id, origen:"LinkedIn",   rec:false, fc:d(8),  fe:null,   notas:"Reunión de cierre agendada para el viernes.", by:v1 },
    { titulo: "Consultoría logística Importadora Oriente",     etapa:"CALIFICADO",  valor:9800000,  costo:2500000, prob:35, eId:emp13.id, cId:c15.id, origen:"Frío",       rec:false, fc:d(40), fe:d(60),  notas:"Interesados. Necesitan aprobación de casa matriz.", by:v1 },
    { titulo: "KPIs operativos Tech Solutions",                etapa:"ACEPTADA",    valor:11000000, costo:2800000, prob:100,eId:emp14.id, cId:c16.id, origen:"Web",        rec:true,  fc:d(-5), fe:d(10),  notas:"Contrato firmado. Inicio en 2 semanas.", by:v1 },
    { titulo: "Estrategia comercial Cooperativa Llanos",       etapa:"PROSPECTO",   valor:7500000,  costo:1800000, prob:15, eId:emp15.id, cId:c17.id, origen:"Frío",       rec:false, fc:d(60), fe:null,   notas:"Primer contacto positivo. Agendar visita.", by:v1 },
    { titulo: "Reestructuración organizacional Aseguradora",   etapa:"PROPUESTA",   valor:22000000, costo:5500000, prob:45, eId:emp16.id, cId:c18.id, origen:"Referido",   rec:false, fc:d(20), fe:null,   notas:"Proceso complejo por el tamaño de la empresa.", by:v1 },
    { titulo: "Mentoría editorial Nuevos Horizontes",          etapa:"CALIFICADO",  valor:6000000,  costo:1500000, prob:30, eId:emp17.id, cId:c19.id, origen:"Instagram",  rec:false, fc:d(50), fe:null,   notas:"CEO muy interesado en mentoría personal.", by:v1 },
    { titulo: "Consultoría impacto social ONG Sembrando",      etapa:"GANADA",      valor:4500000,  costo:1200000, prob:100,eId:emp18.id, cId:c20.id, origen:"Web",        rec:false, fc:d(-40),fe:null,   notas:"Proyecto social cerrado. Excelentes referencias.", by:v1 },
    { titulo: "Formación tripulación Aerolínea Regional",      etapa:"NEGOCIACION", valor:35000000, costo:9000000, prob:65, eId:emp19.id, cId:c21.id, origen:"Evento",     rec:true,  fc:d(15), fe:d(90),  notas:"Contrato marco anual en negociación.", by:v1 },
    { titulo: "Procesos calidad BioMed Colombia",              etapa:"PROPUESTA",   valor:18500000, costo:4500000, prob:40, eId:emp20.id, cId:c22.id, origen:"LinkedIn",   rec:false, fc:d(30), fe:null,   notas:"Presentar casos de éxito del sector salud.", by:v1 },
    { titulo: "Taller innovación Banco Regional — Rama TI",    etapa:"CALIFICADO",  valor:8000000,  costo:2000000, prob:25, eId:emp9.id,  cId:c11.id, origen:"Referido",   rec:false, fc:d(45), fe:d(60),  notas:"Segunda oportunidad en el mismo cliente.", by:v1 },
    { titulo: "Rediseño malla curricular San Marcos",          etapa:"PERDIDA",     valor:5500000,  costo:1400000, prob:0,  eId:emp10.id, cId:c12.id, origen:"Web",        rec:false, fc:d(-15),fe:null,   notas:"Adjudicado a competidor local con precio menor.", by:v1 },
    { titulo: "Cultura de servicio La Brasa Franquicias",      etapa:"PROSPECTO",   valor:14000000, costo:3500000, prob:10, eId:emp11.id, cId:c13.id, origen:"Instagram",  rec:true,  fc:d(80), fe:null,   notas:"Expansión a 8 nuevas sedes. Contacto inicial.", by:v1 },

    // ── ANDRÉS (v2) — 15 oportunidades ───────────────────────────────────
    { titulo: "Sistema gestión calidad Clínica Especialistas", etapa:"GANADA",      valor:13500000, costo:3500000, prob:100,eId:emp12.id, cId:c14.id, origen:"Referido",   rec:false, fc:d(-30),fe:null,   notas:"Proyecto finalizado. Cliente muy satisfecho.", by:v2 },
    { titulo: "Optimización cadena suministro Importadora",    etapa:"NEGOCIACION", valor:16000000, costo:4200000, prob:72, eId:emp13.id, cId:c15.id, origen:"LinkedIn",   rec:false, fc:d(10), fe:d(30),  notas:"Propuesta ajustada. Esperando firma.", by:v2 },
    { titulo: "Transformación digital Tech Solutions fase 2",  etapa:"PROPUESTA",   valor:29000000, costo:7500000, prob:48, eId:emp14.id, cId:c16.id, origen:"Referido",   rec:true,  fc:d(35), fe:d(60),  notas:"Continuación del proyecto KPI. Alta probabilidad.", by:v2 },
    { titulo: "Estrategia cooperativa agropecuaria Llanos",    etapa:"CALIFICADO",  valor:11000000, costo:2800000, prob:32, eId:emp15.id, cId:c17.id, origen:"Evento",     rec:false, fc:d(55), fe:null,   notas:"Visita a la finca programada para el mes.", by:v2 },
    { titulo: "Indicadores comerciales Aseguradora Confianza", etapa:"GANADA",      valor:9500000,  costo:2400000, prob:100,eId:emp16.id, cId:c18.id, origen:"Web",        rec:true,  fc:d(-25),fe:null,   notas:"Segundo proyecto consecutivo. Excelente relación.", by:v2 },
    { titulo: "Programa editorial estratégico Nuevos Horizontes",etapa:"PROSPECTO", valor:7200000,  costo:1800000, prob:18, eId:emp17.id, cId:c19.id, origen:"Frío",       rec:false, fc:d(70), fe:null,   notas:"Interesados pero presupuesto limitado.", by:v2 },
    { titulo: "Medición impacto ONG Sembrando Futuro",         etapa:"NEGOCIACION", valor:5800000,  costo:1500000, prob:60, eId:emp18.id, cId:c20.id, origen:"Web",        rec:false, fc:d(12), fe:null,   notas:"Propuesta social con financiación internacional.", by:v2 },
    { titulo: "Seguridad aérea y protocolos Aerolínea",        etapa:"PROPUESTA",   valor:42000000, costo:11000000,prob:42, eId:emp19.id, cId:c21.id, origen:"Evento",     rec:true,  fc:d(40), fe:d(120), notas:"Proyecto grande. Reunión con directivos nacionales.", by:v2 },
    { titulo: "Innovación procesos BioMed fase 1",             etapa:"CALIFICADO",  valor:14000000, costo:3600000, prob:28, eId:emp20.id, cId:c22.id, origen:"LinkedIn",   rec:false, fc:d(65), fe:null,   notas:"Pendiente definir alcance exacto.", by:v2 },
    { titulo: "Diagnóstico organizacional Banco Regional",     etapa:"PERDIDA",     valor:12000000, costo:3000000, prob:0,  eId:emp9.id,  cId:c11.id, origen:"Frío",       rec:false, fc:d(-20),fe:null,   notas:"Decidieron postergar 6 meses. Re-contactar en enero.", by:v2 },
    { titulo: "Reestructuración académica Colegio San Marcos", etapa:"PROPUESTA",   valor:9800000,  costo:2500000, prob:44, eId:emp10.id, cId:c12.id, origen:"Referido",   rec:false, fc:d(22), fe:d(45),  notas:"Rector muy comprometido. Falta aprobación del consejo.", by:v2 },
    { titulo: "Consultoría expansión La Brasa Medellín",       etapa:"GANADA",      valor:7500000,  costo:1900000, prob:100,eId:emp11.id, cId:c13.id, origen:"Web",        rec:false, fc:d(-10),fe:null,   notas:"Proyecto exitoso. Abrieron 2 sedes nuevas.", by:v2 },
    { titulo: "Procesos hospitalarios Clínica Especialistas",  etapa:"NEGOCIACION", valor:19000000, costo:5000000, prob:68, eId:emp12.id, cId:c14.id, origen:"Referido",   rec:true,  fc:d(18), fe:null,   notas:"Tercera oportunidad con este cliente.", by:v2 },
    { titulo: "Planeación estratégica Importadora Oriente",    etapa:"PROSPECTO",   valor:8500000,  costo:2100000, prob:12, eId:emp13.id, cId:c15.id, origen:"Instagram",  rec:false, fc:d(90), fe:null,   notas:"Gerente nuevo interesado en consultoría.", by:v2 },
    { titulo: "Cultura innovadora Tech Solutions fase 3",      etapa:"CALIFICADO",  valor:17000000, costo:4300000, prob:35, eId:emp14.id, cId:c16.id, origen:"Referido",   rec:true,  fc:d(50), fe:d(80),  notas:"Cliente recurrente. Altas probabilidades.", by:v2 },

    // ── MIGUEL (v3) — 20 oportunidades ───────────────────────────────────
    { titulo: "Transformación liderazgo Cooperativa Llanos",   etapa:"GANADA",      valor:10500000, costo:2700000, prob:100,eId:emp15.id, cId:c17.id, origen:"Evento",     rec:false, fc:d(-35),fe:null,   notas:"Gran proyecto ejecutado. Testimonial disponible.", by:v3 },
    { titulo: "Eficiencia operativa Aseguradora Confianza",    etapa:"PROPUESTA",   valor:24000000, costo:6000000, prob:46, eId:emp16.id, cId:c18.id, origen:"Referido",   rec:false, fc:d(28), fe:null,   notas:"RFP respondido. Competimos con 2 firmas más.", by:v3 },
    { titulo: "Estrategia contenidos Nuevos Horizontes",       etapa:"NEGOCIACION", valor:6500000,  costo:1700000, prob:62, eId:emp17.id, cId:c19.id, origen:"LinkedIn",   rec:true,  fc:d(9),  fe:null,   notas:"Acuerdo en precio. Revisando contrato.", by:v3 },
    { titulo: "Medición resultados ONG Sembrando",             etapa:"CALIFICADO",  valor:4200000,  costo:1100000, prob:28, eId:emp18.id, cId:c20.id, origen:"Web",        rec:false, fc:d(55), fe:null,   notas:"Requieren co-financiación. Gestionando con cooperante.", by:v3 },
    { titulo: "Cultura seguridad Aerolínea Regional",          etapa:"GANADA",      valor:21000000, costo:5500000, prob:100,eId:emp19.id, cId:c21.id, origen:"Referido",   rec:true,  fc:d(-15),fe:d(-5),  notas:"Programa anual firmado. Excelente relación.", by:v3 },
    { titulo: "Procesos regulatorios BioMed fase 2",           etapa:"PROPUESTA",   valor:31000000, costo:8000000, prob:42, eId:emp20.id, cId:c22.id, origen:"LinkedIn",   rec:false, fc:d(33), fe:null,   notas:"Requisitos FDA hacen el proyecto más complejo.", by:v3 },
    { titulo: "Competencias digitales Banco Regional",         etapa:"NEGOCIACION", valor:17500000, costo:4500000, prob:71, eId:emp9.id,  cId:c11.id, origen:"Evento",     rec:true,  fc:d(6),  fe:d(30),  notas:"Programa de 6 meses. Contrato en revisión legal.", by:v3 },
    { titulo: "Innovación pedagógica Colegio San Marcos",      etapa:"GANADA",      valor:7800000,  costo:2000000, prob:100,eId:emp10.id, cId:c12.id, origen:"Web",        rec:true,  fc:d(-50),fe:null,   notas:"Implementación completa. Renovando para 2027.", by:v3 },
    { titulo: "Gestión de experiencia La Brasa",               etapa:"CALIFICADO",  valor:9200000,  costo:2300000, prob:33, eId:emp11.id, cId:c13.id, origen:"Instagram",  rec:false, fc:d(48), fe:null,   notas:"Encargado de expansión muy interesado.", by:v3 },
    { titulo: "Indicadores clínicos Especialistas Unidas",     etapa:"PROPUESTA",   valor:13800000, costo:3500000, prob:43, eId:emp12.id, cId:c14.id, origen:"Referido",   rec:false, fc:d(27), fe:null,   notas:"Propuesta técnica enviada. Requieren demo.", by:v3 },
    { titulo: "Protocolo exportación Importadora Oriente",     etapa:"PERDIDA",     valor:6800000,  costo:1700000, prob:0,  eId:emp13.id, cId:c15.id, origen:"Frío",       rec:false, fc:d(-18),fe:null,   notas:"Presupuesto no aprobado este año.", by:v3 },
    { titulo: "Cultura ágil Tech Solutions",                   etapa:"GANADA",      valor:15500000, costo:4000000, prob:100,eId:emp14.id, cId:c16.id, origen:"Web",        rec:false, fc:d(-8), fe:null,   notas:"Implementación ágil exitosa. Premio interno del cliente.", by:v3 },
    { titulo: "Escuela de líderes Cooperativa Llanos",         etapa:"NEGOCIACION", valor:12000000, costo:3100000, prob:67, eId:emp15.id, cId:c17.id, origen:"Referido",   rec:true,  fc:d(14), fe:d(60),  notas:"Segunda fase del proyecto anterior.", by:v3 },
    { titulo: "Transformación comercial Aseguradora",          etapa:"PROSPECTO",   valor:19500000, costo:5000000, prob:15, eId:emp16.id, cId:c18.id, origen:"LinkedIn",   rec:false, fc:d(85), fe:null,   notas:"Nuevo contacto en el área comercial.", by:v3 },
    { titulo: "Estrategia editorial digital Nuevos Horizontes",etapa:"CALIFICADO",  valor:8800000,  costo:2200000, prob:30, eId:emp17.id, cId:c19.id, origen:"Evento",     rec:false, fc:d(52), fe:null,   notas:"Mercado editorial en transición digital.", by:v3 },
    { titulo: "Sostenibilidad ONG Sembrando Futuro",           etapa:"PROPUESTA",   valor:3800000,  costo:1000000, prob:38, eId:emp18.id, cId:c20.id, origen:"Web",        rec:false, fc:d(32), fe:null,   notas:"Propuesta de autofinanciación a largo plazo.", by:v3 },
    { titulo: "Liderazgo femenino Aerolínea Regional",         etapa:"NEGOCIACION", valor:14000000, costo:3600000, prob:73, eId:emp19.id, cId:c21.id, origen:"Referido",   rec:false, fc:d(11), fe:d(45),  notas:"Programa especial. Alta prioridad del cliente.", by:v3 },
    { titulo: "Farmacovigilancia BioMed — capacitación",       etapa:"PROPUESTA",   valor:9500000,  costo:2400000, prob:41, eId:emp20.id, cId:c22.id, origen:"LinkedIn",   rec:false, fc:d(29), fe:null,   notas:"Requisito regulatorio. Cliente motivado.", by:v3 },
    { titulo: "Diagnóstico clima laboral Banco Regional",      etapa:"CALIFICADO",  valor:11500000, costo:2900000, prob:27, eId:emp9.id,  cId:c11.id, origen:"Frío",       rec:false, fc:d(58), fe:null,   notas:"Alta rotación de personal. Necesidad urgente.", by:v3 },
    { titulo: "Plan de retención talento Tech Solutions",      etapa:"PROSPECTO",   valor:13000000, costo:3300000, prob:13, eId:emp14.id, cId:c16.id, origen:"Instagram",  rec:false, fc:d(95), fe:null,   notas:"Reunión exploratoria agendada.", by:v3 },
  ];

  const etapaMap: Record<string, any> = {
    PROSPECTO:"PROSPECTO", CALIFICADO:"CALIFICADO", PROPUESTA:"PROPUESTA",
    NEGOCIACION:"NEGOCIACION", GANADA:"GANADA", PERDIDA:"PERDIDA", ACEPTADA:"GANADA",
  };

  let creadas = 0;
  for (const o of ops) {
    await prisma.oportunidad.create({
      data: {
        titulo: o.titulo,
        etapa: etapaMap[o.etapa],
        valor: o.valor,
        costo: o.costo,
        probabilidad: o.prob,
        empresaId: o.eId,
        contactoId: o.cId,
        origenLead: o.origen,
        recurrente: o.rec,
        fechaCierre: o.fc,
        fechaEvento: o.fe ?? null,
        notas: o.notas,
        creadoBy: o.by,
        tenantId: tenant.id,
      },
    });
    creadas++;
  }
  console.log(`✅ Oportunidades nuevas creadas: ${creadas}`);

  // ── ACTIVIDADES ADICIONALES ───────────────────────────────────────────────
  const actividadesExtra = [
    // Vencidas adicionales
    { titulo:"Enviar propuesta Aerolínea Regional", tipo:"EMAIL",   fecha:d(-4), comp:false, eId:emp19.id, cId:c21.id, by:v3 },
    { titulo:"Llamada seguimiento BioMed fase 2",  tipo:"LLAMADA", fecha:d(-6), comp:false, eId:emp20.id, cId:c22.id, by:v3 },
    { titulo:"Reunión cierre Aseguradora Confianza",tipo:"REUNION", fecha:d(-3), comp:false, eId:emp16.id, cId:c18.id, by:v3 },
    { titulo:"Revisión contrato Tech Solutions",    tipo:"TAREA",   fecha:d(-2), comp:false, eId:emp14.id, cId:c16.id, by:v2 },
    { titulo:"Llamada cliente Banco Regional TI",   tipo:"LLAMADA", fecha:d(-7), comp:false, eId:emp9.id,  cId:c11.id, by:v1 },
    // Completadas adicionales
    { titulo:"Taller innovación Cooperativa Llanos", tipo:"REUNION", fecha:d(-38), comp:true, eId:emp15.id, cId:c17.id, by:v3 },
    { titulo:"Entrega informe La Brasa Medellín",    tipo:"EMAIL",   fecha:d(-12), comp:true, eId:emp11.id, cId:c13.id, by:v2 },
    { titulo:"Presentación KPIs Tech Solutions",     tipo:"REUNION", fecha:d(-7),  comp:true, eId:emp14.id, cId:c16.id, by:v2 },
    { titulo:"Llamada seguimiento Aerolínea",        tipo:"LLAMADA", fecha:d(-18), comp:true, eId:emp19.id, cId:c21.id, by:v3 },
    { titulo:"Envío materiales Colegio San Marcos",  tipo:"EMAIL",   fecha:d(-55), comp:true, eId:emp10.id, cId:c12.id, by:v3 },
    // Próximas
    { titulo:"Demo plataforma BioMed",               tipo:"REUNION", fecha:d(3),  comp:false, eId:emp20.id, cId:c22.id, by:v3 },
    { titulo:"Llamada cierre Aerolínea liderazgo",   tipo:"LLAMADA", fecha:d(2),  comp:false, eId:emp19.id, cId:c21.id, by:v3 },
    { titulo:"Enviar contrato Banco Regional",       tipo:"EMAIL",   fecha:d(1),  comp:false, eId:emp9.id,  cId:c11.id, by:v3 },
    { titulo:"Reunión directivos Aseguradora",       tipo:"REUNION", fecha:d(5),  comp:false, eId:emp16.id, cId:c18.id, by:v3 },
    { titulo:"Propuesta cooperativa fase 2",         tipo:"TAREA",   fecha:d(4),  comp:false, eId:emp15.id, cId:c17.id, by:v3 },
    { titulo:"Llamada seguimiento ONG propuesta",    tipo:"LLAMADA", fecha:d(6),  comp:false, eId:emp18.id, cId:c20.id, by:v2 },
    { titulo:"Revisar borrador contrato Importadora",tipo:"TAREA",   fecha:d(3),  comp:false, eId:emp13.id, cId:c15.id, by:v2 },
    { titulo:"Reunión inicio proyecto Aseguradora",  tipo:"REUNION", fecha:d(8),  comp:false, eId:emp16.id, cId:c18.id, by:v2 },
    { titulo:"Enviar caso de éxito Clínica",         tipo:"EMAIL",   fecha:d(5),  comp:false, eId:emp12.id, cId:c14.id, by:v2 },
    { titulo:"Visita sede Colegio San Marcos",       tipo:"REUNION", fecha:d(12), comp:false, eId:emp10.id, cId:c12.id, by:v1 },
    { titulo:"Propuesta editorial Nuevos Horizontes",tipo:"TAREA",   fecha:d(7),  comp:false, eId:emp17.id, cId:c19.id, by:v1 },
    { titulo:"Demo KPI Importadora Oriente",         tipo:"REUNION", fecha:d(9),  comp:false, eId:emp13.id, cId:c15.id, by:v1 },
    { titulo:"Llamada exploratoria La Brasa franq.", tipo:"LLAMADA", fecha:d(11), comp:false, eId:emp11.id, cId:c13.id, by:v1 },
    { titulo:"Enviar referencia BioMed regulatoria", tipo:"EMAIL",   fecha:d(6),  comp:false, eId:emp20.id, cId:c22.id, by:v1 },
  ];

  for (const a of actividadesExtra) {
    await prisma.actividad.create({
      data: {
        titulo: a.titulo, tipo: a.tipo as any,
        fecha: a.fecha, completada: a.comp,
        empresaId: a.eId, contactoId: a.cId,
        creadoBy: a.by, tenantId: tenant.id,
      },
    });
  }
  console.log(`✅ Actividades adicionales: ${actividadesExtra.length}`);

  // Contar totales reales
  const totalOps  = await prisma.oportunidad.count({ where: { tenantId: tenant.id } });
  const totalActs = await prisma.actividad.count({ where: { tenantId: tenant.id } });
  const totalEmps = await prisma.empresa.count({ where: { tenantId: tenant.id } });

  console.log(`
╔══════════════════════════════════════════════════════╗
║         DEMO EXPANDIDO ✅                            ║
╠══════════════════════════════════════════════════════╣
║  Empresas totales:      ${String(totalEmps).padEnd(28)}║
║  Oportunidades totales: ${String(totalOps).padEnd(28)}║
║  Actividades totales:   ${String(totalActs).padEnd(28)}║
╠══════════════════════════════════════════════════════╣
║  VENDEDORES:                                         ║
║  Sofía Restrepo    sofia@demo-evoluteca.com          ║
║  Andrés Castillo   andres@demo-evoluteca.com         ║
║  Miguel Á. Forero  miguel@demo-evoluteca.com         ║
║  Password (todos): Demo2026!                         ║
╚══════════════════════════════════════════════════════╝
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
