/**
 * Demo completa para el tenant `demo-evoluteca`: clientes, contactos, pipeline
 * con 28 oportunidades en las 6 etapas, cotizaciones, actividades, campos
 * personalizados, automatizaciones y objeciones.
 *
 * Las fechas de "última señal de vida" están escalonadas a propósito para que el
 * nuevo Estado comercial muestre los 4 estados (En riesgo / Requiere atención /
 * Alta intención / En marcha).
 *
 * SEGURIDAD
 *  - Todo lo que crea queda marcado con "[demo]" (o clave cp_demo_/email demo)
 *    para poder revertirlo sin tocar datos ajenos.
 *  - Guardarraíl de entorno: con --prod exige que DATABASE_URL apunte a
 *    producción (ep-holy-leaf); sin --prod exige desarrollo (ep-muddy-tree).
 *
 * USO
 *  Desarrollo:  npx tsx scripts/seed-demo-completo.ts
 *  Producción:  export DATABASE_URL="$(grep '^DIRECT_URL=' .env.produccion.ref | sed -E 's/^DIRECT_URL=//; s/^\"//; s/\"$//')"; npx tsx scripts/seed-demo-completo.ts --prod
 *  Revertir:    (misma URL) ... --prod --revertir
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const MARCA = "[demo]";
const SLUG = "demo-evoluteca";
const DIA = 86_400_000;
const ahora = new Date();
const d = (dias: number) => new Date(ahora.getTime() - dias * DIA); // dias>0 = pasado
// Meses concretos del año en curso, para fechas de cierre con lógica de calendario.
const Y = ahora.getFullYear();
const jul = (dia: number) => new Date(Y, 6, dia);
const ago = (dia: number) => new Date(Y, 7, dia);
const sep = (dia: number) => new Date(Y, 8, dia);
const EMAILS_VENDEDORES = ["sofia@demo-evoluteca.com", "andres@demo-evoluteca.com", "miguel@demo-evoluteca.com"];

function verificarEntorno() {
  const url = process.env.DATABASE_URL ?? "";
  const prod = process.argv.includes("--prod");
  const esHolyLeaf = url.includes("ep-holy-leaf");
  const esMuddyTree = url.includes("ep-muddy-tree");
  if (prod && !esHolyLeaf) { console.error("❌ --prod pero DATABASE_URL NO es producción (ep-holy-leaf). Abortado."); process.exit(1); }
  if (!prod && !esMuddyTree) { console.error("❌ DATABASE_URL no es desarrollo (ep-muddy-tree). Usa --prod para producción a propósito. Abortado."); process.exit(1); }
  console.log(`🔗 Entorno: ${esHolyLeaf ? "PRODUCCIÓN (ep-holy-leaf)" : "desarrollo (ep-muddy-tree)"}`);
}

async function revertir(tenantId: string) {
  console.log("↩️  Revirtiendo datos [demo]...");
  const w = { tenantId, notas: { contains: MARCA } };
  const a = await prisma.actividad.deleteMany({ where: w });
  const c = await prisma.cotizacion.deleteMany({ where: w });
  const o = await prisma.oportunidad.deleteMany({ where: w }); // cambiosEtapa cascada
  const co = await prisma.contacto.deleteMany({ where: w });
  const e = await prisma.empresa.deleteMany({ where: w });
  const cp = await prisma.campoPersonalizado.deleteMany({ where: { tenantId, clave: { startsWith: "cp_demo_" } } });
  const au = await prisma.automatizacion.deleteMany({ where: { tenantId, nombre: { startsWith: MARCA } } });
  const ob = await prisma.objecion.deleteMany({ where: { tenantId, categoria: { startsWith: "[demo]" } } });
  const us = await prisma.usuario.deleteMany({ where: { tenantId, email: { in: EMAILS_VENDEDORES } } });
  console.log(`   actividades ${a.count} · cotizaciones ${c.count} · oportunidades ${o.count} · contactos ${co.count} · empresas ${e.count} · campos ${cp.count} · automatizaciones ${au.count} · objeciones ${ob.count} · vendedores ${us.count}`);
}

async function main() {
  verificarEntorno();
  const tenant = await prisma.tenant.findFirst({ where: { slug: SLUG } });
  if (!tenant) { console.error("❌ Tenant demo no encontrado."); process.exit(1); }
  const tId = tenant.id;

  // Limpieza previa de datos [demo] para que re-correr no duplique (idempotente).
  await revertir(tId);
  if (process.argv.includes("--revertir")) { console.log("✅ Revertido. Fin."); return; }

  // ── VENDEDORES (equipo, para "Rendimiento del equipo") ────────────────────
  const passHash = await bcrypt.hash("Demo2026!", 10);
  const vendedores = await Promise.all(
    [["Sofía Ramírez", EMAILS_VENDEDORES[0]], ["Andrés Beltrán", EMAILS_VENDEDORES[1]], ["Miguel Ángel Forero", EMAILS_VENDEDORES[2]]].map(
      ([nombre, email]) => prisma.usuario.upsert({
        where: { email },
        update: { activo: true },
        create: { nombre, email, passwordHash: passHash, rol: "COMERCIAL", tenantId: tId },
      })
    )
  );
  const V = vendedores.map(v => v.id);
  console.log(`✅ Vendedores: ${vendedores.length}`);

  // ── EMPRESAS ──────────────────────────────────────────────────────────────
  const empresasData = [
    { nombre: "Inversiones Pacífico S.A.S", sector: "Tecnología", nit: "900.111.222-1", tel: "601 234 5678" },
    { nombre: "Constructora Andina Ltda", sector: "Otro", nit: "900.222.333-2", tel: "604 321 9876" },
    { nombre: "Clínica Salud Total", sector: "Salud", nit: "900.333.444-3", tel: "602 456 7890" },
    { nombre: "Banco Regional del Norte", sector: "Tecnología", nit: "900.444.555-4", tel: "601 100 2000" },
    { nombre: "Colegio Bilingüe San Marcos", sector: "Educación", nit: "900.555.666-5", tel: "602 200 3000" },
    { nombre: "Restaurantes La Brasa S.A", sector: "Hospitalidad y Turismo", nit: "900.666.777-6", tel: "603 300 4000" },
    { nombre: "Tech Solutions Colombia", sector: "Tecnología", nit: "900.777.888-7", tel: "606 600 7000" },
    { nombre: "Aseguradora Confianza S.A", sector: "Tecnología", nit: "900.888.999-8", tel: "608 800 9000" },
    { nombre: "Importadora Oriente Ltda", sector: "Otro", nit: "900.999.000-9", tel: "605 500 6000" },
    { nombre: "Farmacéutica BioMed", sector: "Salud", nit: "901.111.222-0", tel: "312 030 3333" },
    { nombre: "Editorial Nuevos Horizontes", sector: "Medios y Comunicación", nit: "901.222.333-1", tel: "609 900 1000" },
    { nombre: "Cooperativa Agropecuaria Llanos", sector: "Otro", nit: "901.333.444-2", tel: "607 700 8000" },
  ];
  // Cada cliente se asigna a un vendedor de forma pareja (4 por vendedor).
  const empresas = await Promise.all(empresasData.map((e, i) => prisma.empresa.create({
    data: {
      nombre: e.nombre, sector: e.sector, telefono: e.tel,
      email: `contacto@${e.nombre.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.co`,
      etiquetas: ["cliente-demo"], notas: `${MARCA} Cliente de demostración.`,
      extras: { cp_demo_nit: e.nit }, creadoBy: V[i % 3], tenantId: tId,
    },
  })));
  const E = empresas.map(x => x.id);
  console.log(`✅ Empresas: ${empresas.length}`);

  // ── CONTACTOS (uno por empresa + 2 extra) ─────────────────────────────────
  const nombresCont = ["Hernán Ospina", "Lucía Bermúdez", "Roberto Arango", "Natalia Suárez", "Esteban Molina", "Verónica Palacios", "Armando Celis", "Margarita Flórez", "Julián Cárdenas", "Isabela Montoya", "Gloria Mejía", "Rodrigo Sánchez", "Camila Ríos", "Daniel Quintero"];
  const cargos = ["Gerente General", "Directora Comercial", "Jefe de Compras", "Coordinadora", "CEO", "Gerente Administrativa", "Director de Operaciones", "Subgerente"];
  const contactos = await Promise.all(nombresCont.map((nombre, i) => prisma.contacto.create({
    data: {
      nombre, cargo: cargos[i % cargos.length],
      email: `${nombre.split(" ")[0].toLowerCase()}@${empresasData[i % 12].nombre.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.co`,
      telefono: `31${i} 000 00${i}0`, empresaId: E[i % 12],
      notas: `${MARCA} Contacto de demostración.`, tenantId: tId,
    },
  })));
  const C = contactos.map(x => x.id);
  console.log(`✅ Contactos: ${contactos.length}`);

  // ── OPORTUNIDADES ─────────────────────────────────────────────────────────
  // estado objetivo controlado por ultMov (días) y, para "atencion" por cierre,
  // por cierreDias pequeño con ultMov reciente. umbral del tenant = 28 días.
  type Spec = {
    titulo: string; emp: number; cont: number; valor: number; prob: number;
    etapa: "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";
    ultMov: number; cierreDias?: number; cierre?: Date; vend: number; proxima?: boolean; vencida?: boolean; motivo?: string;
  };
  const specs: Spec[] = [
    // PROSPECTO (5)
    { titulo: "Implementación CRM — Inversiones Pacífico", emp: 0, cont: 0, valor: 18_000_000, prob: 20, etapa: "PROSPECTO", ultMov: 3, vend: 0, proxima: true },
    { titulo: "Consultoría inicial — Constructora Andina", emp: 1, cont: 1, valor: 12_000_000, prob: 15, etapa: "PROSPECTO", ultMov: 4, vend: 1 },
    { titulo: "Diagnóstico comercial — Importadora Oriente", emp: 8, cont: 4, valor: 9_500_000, prob: 20, etapa: "PROSPECTO", ultMov: 40, vend: 2 }, // atención (estancada)
    { titulo: "Prospecto entrante — Editorial Nuevos Horizontes", emp: 10, cont: 10, valor: 7_000_000, prob: 10, etapa: "PROSPECTO", ultMov: 70, vend: 0 }, // riesgo
    { titulo: "Primer acercamiento — Coop. Agropecuaria Llanos", emp: 11, cont: 11, valor: 15_000_000, prob: 25, etapa: "PROSPECTO", ultMov: 2, vend: 1, proxima: true },
    // CALIFICADO (4)
    { titulo: "Plan anual soporte — Clínica Salud Total", emp: 2, cont: 2, valor: 24_000_000, prob: 40, etapa: "CALIFICADO", ultMov: 5, vend: 2 },
    { titulo: "Migración de datos — Banco Regional", emp: 3, cont: 3, valor: 45_000_000, prob: 45, etapa: "CALIFICADO", ultMov: 3, vend: 0, vencida: true },
    { titulo: "Licenciamiento — Colegio San Marcos", emp: 4, cont: 4, valor: 11_000_000, prob: 35, etapa: "CALIFICADO", ultMov: 42, vend: 1 }, // atención
    { titulo: "Ampliación equipo — Tech Solutions", emp: 6, cont: 6, valor: 20_000_000, prob: 40, etapa: "CALIFICADO", ultMov: 75, vend: 2 }, // riesgo
    // PROPUESTA (5)
    { titulo: "Propuesta suite completa — Aseguradora Confianza", emp: 7, cont: 7, valor: 60_000_000, prob: 75, etapa: "PROPUESTA", ultMov: 5, cierreDias: -25, vend: 0 }, // alta
    { titulo: "Propuesta módulos — Farmacéutica BioMed", emp: 9, cont: 9, valor: 38_000_000, prob: 80, etapa: "PROPUESTA", ultMov: 6, cierreDias: -30, vend: 1 }, // alta
    { titulo: "Propuesta soporte — Restaurantes La Brasa", emp: 5, cont: 5, valor: 16_000_000, prob: 55, etapa: "PROPUESTA", ultMov: 3, cierreDias: -5, vend: 2, proxima: true }, // atención (cierre próximo)
    { titulo: "Propuesta enviada — Inversiones Pacífico II", emp: 0, cont: 12, valor: 22_000_000, prob: 60, etapa: "PROPUESTA", ultMov: 60, vend: 0 }, // riesgo
    { titulo: "Propuesta piloto — Colegio San Marcos II", emp: 4, cont: 4, valor: 8_000_000, prob: 50, etapa: "PROPUESTA", ultMov: 4, cierreDias: -20, vend: 1 }, // marcha
    // NEGOCIACION (4)
    { titulo: "Negociación final — Banco Regional (fase 2)", emp: 3, cont: 3, valor: 80_000_000, prob: 85, etapa: "NEGOCIACION", ultMov: 4, cierreDias: -15, vend: 2 }, // alta
    { titulo: "Cierre de contrato — Clínica Salud Total", emp: 2, cont: 2, valor: 30_000_000, prob: 80, etapa: "NEGOCIACION", ultMov: 6, cierreDias: -18, vend: 0 }, // alta
    { titulo: "Ajuste de términos — Tech Solutions", emp: 6, cont: 6, valor: 26_000_000, prob: 65, etapa: "NEGOCIACION", ultMov: 3, cierreDias: -6, vend: 1, proxima: true }, // atención (cierre)
    { titulo: "Negociación estancada — Importadora Oriente", emp: 8, cont: 4, valor: 19_000_000, prob: 60, etapa: "NEGOCIACION", ultMov: 65, vend: 2 }, // riesgo
    // GANADA (8) — ventas en JULIO, AGOSTO y SEPTIEMBRE; suman ~$585M ≈ 78% de la
    // meta anual ($750M) para que a septiembre el cumplimiento del año sea ≥70%.
    { titulo: "Contrato firmado — Aseguradora Confianza", emp: 7, cont: 7, valor: 105_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: jul(8), vend: 0 },
    { titulo: "Proyecto ganado — Farmacéutica BioMed", emp: 9, cont: 9, valor: 70_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: jul(15), vend: 1 },
    { titulo: "Implementación — Banco Regional del Norte", emp: 3, cont: 3, valor: 65_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: ago(12), vend: 2 },
    { titulo: "Suite CRM — Tech Solutions Colombia", emp: 6, cont: 6, valor: 35_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: ago(20), vend: 0 },
    { titulo: "Renovación anual — Clínica Salud Total", emp: 2, cont: 2, valor: 85_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: sep(2), vend: 1 },
    { titulo: "Venta cerrada — Restaurantes La Brasa", emp: 5, cont: 5, valor: 75_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: sep(6), vend: 2 },
    { titulo: "Licencia + soporte — Inversiones Pacífico", emp: 0, cont: 0, valor: 80_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: sep(10), vend: 0 },
    { titulo: "Contrato marco — Coop. Agropecuaria Llanos", emp: 11, cont: 11, valor: 70_000_000, prob: 100, etapa: "GANADA", ultMov: 0, cierre: sep(12), vend: 1 },
    // PERDIDA (2) — nunca más allá del mes en curso (fechas ≤ hoy)
    { titulo: "Oportunidad perdida — Constructora Andina", emp: 1, cont: 1, valor: 21_000_000, prob: 0, etapa: "PERDIDA", ultMov: 0, cierre: ago(19), vend: 1, motivo: "Precio muy alto" },
    { titulo: "No prosperó — Editorial Nuevos Horizontes", emp: 10, cont: 10, valor: 9_000_000, prob: 0, etapa: "PERDIDA", ultMov: 0, cierre: sep(9), vend: 2, motivo: "Eligió a la competencia" },
  ];

  const ORDEN = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];
  const opps: { id: string; spec: Spec }[] = [];
  for (const s of specs) {
    const vIdx = s.emp % 3; // el negocio pertenece al vendedor de su cliente
    const esCerrada = s.etapa === "GANADA" || s.etapa === "PERDIDA";
    const cierreFecha = s.cierre ?? (s.cierreDias !== undefined ? d(s.cierreDias) : null);
    // "Última señal de vida": cerradas = su fecha de cierre; activas = ultMov.
    const ultMovFecha = esCerrada && cierreFecha ? cierreFecha : d(s.ultMov);
    const creadoEn = esCerrada && cierreFecha ? new Date(cierreFecha.getTime() - 45 * DIA) : d(Math.max(s.ultMov + 5, 30));
    const op = await prisma.oportunidad.create({
      data: {
        titulo: s.titulo, valor: s.valor, etapa: s.etapa, probabilidad: s.prob,
        empresaId: E[s.emp], contactoId: C[s.cont], creadoBy: V[vIdx],
        creadoEn,
        fechaCierre: cierreFecha,
        motivoPerdida: s.motivo ?? null,
        notas: `${MARCA} Oportunidad de demostración.`,
        extras: { cp_demo_competidor: s.prob >= 60 ? "Competidor X" : "" },
        tenantId: tId,
      },
    });
    // Historial de cambios de etapa: el último marca la "última señal de vida".
    const idx = ORDEN.indexOf(s.etapa);
    const cambios: { etapaAnterior: string; etapaNueva: string; creadoEn: Date }[] = [];
    for (let i = 1; i <= idx; i++) {
      const esUltimo = i === idx;
      cambios.push({ etapaAnterior: ORDEN[i - 1], etapaNueva: ORDEN[i], creadoEn: esUltimo ? ultMovFecha : new Date(ultMovFecha.getTime() - ((idx - i) * 7 + 5) * DIA) });
    }
    if (cambios.length) {
      await prisma.cambioEtapa.createMany({ data: cambios.map(c => ({ ...c, oportunidadId: op.id, creadoByNombre: vendedores[vIdx].nombre })) });
    }
    // Actividad pasada (completada), más antigua que ultMov para no alterarlo.
    await prisma.actividad.create({
      data: { tipo: "LLAMADA", titulo: `Contacto inicial — ${s.titulo.slice(0, 40)}`, fecha: new Date(ultMovFecha.getTime() - 2 * DIA), completada: true, estado: "COMPLETADA", responsableId: V[vIdx], oportunidadId: op.id, empresaId: E[s.emp], contactoId: C[s.cont], notas: `${MARCA} Actividad de demostración.`, tenantId: tId },
    });
    // Actividad próxima (pendiente, futura) para poblar Agenda.
    if (s.proxima) {
      await prisma.actividad.create({
        data: { tipo: "REUNION", titulo: `Reunión de seguimiento — ${s.titulo.slice(0, 40)}`, fecha: d(-3), completada: false, estado: "PENDIENTE", responsableId: V[vIdx], oportunidadId: op.id, empresaId: E[s.emp], contactoId: C[s.cont], notas: `${MARCA} Actividad de demostración.`, tenantId: tId },
      });
    }
    // Actividad vencida (pendiente, en el pasado) para encender la alerta.
    if (s.vencida) {
      await prisma.actividad.create({
        data: { tipo: "TAREA", titulo: `Enviar información — ${s.titulo.slice(0, 40)}`, fecha: d(2), completada: false, estado: "PENDIENTE", responsableId: V[vIdx], oportunidadId: op.id, empresaId: E[s.emp], contactoId: C[s.cont], notas: `${MARCA} Actividad de demostración.`, tenantId: tId },
      });
    }
    opps.push({ id: op.id, spec: s });
  }
  console.log(`✅ Oportunidades: ${opps.length}`);

  // ── COTIZACIONES (ligadas a oportunidades en Propuesta/Negociación) ───────
  const paraCotizar = opps.filter(o => o.spec.etapa === "PROPUESTA" || o.spec.etapa === "NEGOCIACION").slice(0, 5);
  let nCot = 0;
  for (const { id, spec } of paraCotizar) {
    const estado = spec.etapa === "NEGOCIACION" ? "ENVIADA" : "ENVIADA";
    await prisma.cotizacion.create({
      data: {
        estado, modalidad: "FEE_FIJO", empresaId: E[spec.emp], contactoId: C[spec.cont], oportunidadId: id,
        notas: `${MARCA} Cotización de demostración.`,
        condicionesComerciales: "Validez 30 días. Pago 50% anticipo, 50% contra entrega.",
        tenantId: tId,
        items: { create: [
          { descripcion: "Licencia Evoluteca CRM (anual)", cantidad: 1, precioUnit: Math.round(spec.valor * 0.6) },
          { descripcion: "Implementación y capacitación", cantidad: 1, precioUnit: Math.round(spec.valor * 0.3) },
          { descripcion: "Soporte premium (12 meses)", cantidad: 1, precioUnit: Math.round(spec.valor * 0.1) },
        ] },
      },
    });
    nCot++;
  }
  console.log(`✅ Cotizaciones: ${nCot}`);

  // ── CAMPOS PERSONALIZADOS ─────────────────────────────────────────────────
  await prisma.campoPersonalizado.createMany({
    data: [
      { entidad: "EMPRESA", clave: "cp_demo_nit", etiqueta: "NIT", tipo: "TEXTO", orden: 0, tenantId: tId },
      { entidad: "OPORTUNIDAD", clave: "cp_demo_competidor", etiqueta: "Competidor", tipo: "TEXTO", orden: 0, tenantId: tId },
    ],
  });
  console.log("✅ Campos personalizados: 2");

  // ── AUTOMATIZACIONES ──────────────────────────────────────────────────────
  await prisma.automatizacion.createMany({
    data: [
      { nombre: `${MARCA} Seguimiento al pasar a Propuesta`, evento: "OPORTUNIDAD_CAMBIA_ETAPA", etapaDestino: "PROPUESTA", accion: "CREAR_TAREA", config: { titulo: "Dar seguimiento a {oportunidad}", tipo: "LLAMADA", diasPlazo: 2, responsable: "DUENO" }, orden: 0, tenantId: tId },
      { nombre: `${MARCA} Aviso al crear oportunidad`, evento: "OPORTUNIDAD_CREADA", accion: "ENVIAR_CORREO", config: { destinatario: "DUENO", asunto: "Nueva oportunidad: {oportunidad}", cuerpo: "Se creó la oportunidad {oportunidad} para {cliente}." }, orden: 1, tenantId: tId },
    ],
  });
  console.log("✅ Automatizaciones: 2");

  // ── OBJECIONES (el módulo ya está activo) ─────────────────────────────────
  const yaHayObj = await prisma.objecion.count({ where: { tenantId: tId } });
  if (yaHayObj === 0) {
    await prisma.objecion.createMany({
      data: [
        { categoria: "[demo] Precio", objecion: "Está muy caro comparado con otras opciones.", respuesta: "Comparemos el costo total: incluye implementación, soporte y actualizaciones sin costo extra. ¿Qué presupuesto tenías en mente?", loQueNoDecir: "Es que somos los mejores, por eso cuesta.", orden: 0, tenantId: tId },
        { categoria: "[demo] Timing", objecion: "Ahora no es buen momento, tal vez el próximo trimestre.", respuesta: "Entiendo. Muchos clientes empiezan con un piloto pequeño para no frenar el trimestre. ¿Te muestro cómo se vería?", orden: 1, tenantId: tId },
        { categoria: "[demo] Competencia", objecion: "Estamos evaluando otra herramienta.", respuesta: "Perfecto que estén comparando. ¿Qué es lo más importante para ustedes en la decisión? Así te muestro cómo lo resolvemos.", orden: 2, tenantId: tId },
      ],
    });
    console.log("✅ Objeciones: 3");
  } else {
    console.log(`ℹ️  Objeciones: ya había ${yaHayObj}, no se tocaron.`);
  }

  // ── REGLA: una PERDIDA no puede cerrarse en el futuro ─────────────────────
  // No tiene lógica "perder" un negocio mañana. Se corrige cualquier caso del
  // tenant (incluye registros viejos que no son [demo]).
  const futFix = await prisma.oportunidad.updateMany({ where: { tenantId: tId, etapa: "PERDIDA", fechaCierre: { gt: ahora } }, data: { fechaCierre: ago(15) } });
  if (futFix.count) console.log(`🛠  Perdidas con fecha futura corregidas: ${futFix.count}`);

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  const porEtapa = await prisma.oportunidad.groupBy({ by: ["etapa"], where: { tenantId: tId, eliminadoEn: null }, _count: true });
  console.log("\n📊 Pipeline final por etapa:");
  for (const e of porEtapa) console.log(`   ${e.etapa}: ${e._count}`);
  console.log("\n✅ Demo completa cargada.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
