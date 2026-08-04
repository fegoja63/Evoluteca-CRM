/**
 * Crea ventas (oportunidades GANADAS) en AGOSTO 2026 para el tenant demo,
 * para que el dashboard/reportes no muestren el mes en cero.
 *
 * Ejecutar:  npx tsx scripts/crear-ventas-agosto-2026.ts
 * Idempotente: usa un prefijo en el título y no duplica si ya existen.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREFIJO = "[Ago-2026]";

function fecha(dia: number) {
  // Mediodía hora local para evitar corrimientos de día por timezone.
  return new Date(2026, 7, dia, 12, 0, 0); // mes 7 = agosto
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("❌ Tenant demo no encontrado"); return; }

  const comerciales = await prisma.usuario.findMany({
    where: { tenantId: tenant.id, rol: "COMERCIAL", activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  if (comerciales.length === 0) { console.error("❌ No hay comerciales en el tenant"); return; }

  // Empresas objetivo (con su primer contacto, si tiene) — clientes plausibles.
  const nombresObjetivo = [
    "Inversiones Pacífico S.A.S",
    "Banco Regional del Norte",
    "Clínica Salud Total",
    "Tech Solutions Colombia",
    "Constructora Andina Ltda",
  ];

  // Definición de las 5 ventas.
  const ventas = [
    { empresa: nombresObjetivo[0], titulo: "Consultoría estratégica Q3", valor: 12000000, costo: 3200000, dia: 5,  recurrente: true,  origen: "Referido" },
    { empresa: nombresObjetivo[1], titulo: "Diseño de indicadores KPI corporativos", valor: 8800000, costo: 2100000, dia: 11, recurrente: false, origen: "LinkedIn" },
    { empresa: nombresObjetivo[2], titulo: "Capacitación corporativa — liderazgo", valor: 5600000, costo: 1400000, dia: 18, recurrente: false, origen: "Web" },
    { empresa: nombresObjetivo[3], titulo: "Implementación de procesos comerciales", valor: 14500000, costo: 4300000, dia: 22, recurrente: false, origen: "Referido" },
    { empresa: nombresObjetivo[4], titulo: "Auditoría organizacional integral", valor: 7200000, costo: 1800000, dia: 27, recurrente: false, origen: "Evento" },
  ];

  let creadas = 0;
  for (let i = 0; i < ventas.length; i++) {
    const v = ventas[i];
    const titulo = `${PREFIJO} ${v.titulo}`;

    // Idempotencia: si ya existe una con ese título en el tenant, saltar.
    const existe = await prisma.oportunidad.findFirst({
      where: { tenantId: tenant.id, titulo, eliminadoEn: null },
      select: { id: true },
    });
    if (existe) { console.log(`↷ Ya existe, se salta: ${titulo}`); continue; }

    const empresa = await prisma.empresa.findFirst({
      where: { tenantId: tenant.id, nombre: v.empresa, eliminadoEn: null },
      select: { id: true, nombre: true, contactos: { where: { eliminadoEn: null }, select: { id: true }, take: 1 } },
    });
    if (!empresa) { console.warn(`⚠ Empresa no encontrada, se salta: ${v.empresa}`); continue; }

    const comercial = comerciales[i % comerciales.length];
    const fechaCierre = fecha(v.dia);
    // Creada ~40 días antes del cierre, para un "tiempo de cierre" realista y positivo.
    const creadoEn = new Date(fechaCierre.getTime() - 40 * 24 * 60 * 60 * 1000);

    const op = await prisma.oportunidad.create({
      data: {
        titulo,
        etapa: "GANADA",
        valor: v.valor,
        costo: v.costo,
        probabilidad: 100,
        recurrente: v.recurrente,
        origenLead: v.origen,
        fechaCierre,
        creadoEn,
        empresaId: empresa.id,
        contactoId: empresa.contactos[0]?.id ?? null,
        tenantId: tenant.id,
        creadoBy: comercial.id,
        notas: "Venta cerrada. Registro de demostración para agosto 2026.",
      },
    });

    // Historial de etapa: quedó en GANADA en la fecha de cierre.
    await prisma.cambioEtapa.create({
      data: {
        etapaAnterior: "NEGOCIACION",
        etapaNueva: "GANADA",
        creadoEn: fechaCierre,
        creadoBy: comercial.id,
        creadoByNombre: comercial.nombre,
        oportunidadId: op.id,
      },
    });

    creadas++;
    console.log(`✅ ${titulo} → ${empresa.nombre} | ${v.valor.toLocaleString()} COP | ${comercial.nombre} | cierre ${fechaCierre.toISOString().slice(0,10)}`);
  }

  const total = ventas.reduce((a, v) => a + v.valor, 0);
  console.log(`\n${creadas} ventas creadas. Valor total agosto 2026 (si todas nuevas): ${total.toLocaleString()} COP`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
