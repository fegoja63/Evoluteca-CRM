/**
 * Seed de datos demo para Evoluteca CRM
 * Tenant: "Demo OLTC" — consultora de optimización de gasto TIC / telecom /
 * servicios públicos que cobra por resultado (success fee: % del ahorro real
 * generado durante un horizonte de meses). Módulo `ahorros` activo.
 *
 * Cuenta de demostración para prospectos tipo OLTC y banco de pruebas del
 * módulo de cotización Success Fee.
 *
 * Ejecutar con:
 *   npx tsx scripts/seed-demo-oltc.ts
 * (o: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/seed-demo-oltc.ts)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const dia = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// Valor estimado del contrato = Σ(ahorro mensual) × % × meses.
function valorSF(lineas: { ahorroEstimadoMensual: number }[], pct: number, meses: number) {
  return lineas.reduce((s, l) => s + l.ahorroEstimadoMensual, 0) * (pct / 100) * meses;
}

async function main() {
  console.log("🌱 Iniciando seed Demo OLTC...\n");

  const previo = await prisma.tenant.findFirst({ where: { slug: "demo-oltc" } });
  if (previo) {
    await prisma.tenant.delete({ where: { id: previo.id } });
    console.log("🗑  Tenant demo-oltc previo eliminado.");
  }

  // ── TENANT ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      nombre: "Demo OLTC",
      slug: "demo-oltc",
      plan: "empresa",
      activo: true,
      modulos: { ahorros: true },
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre} (módulo Ahorros / Success Fee activo)`);

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const passHash = await bcrypt.hash("Demo2026!", 10);
  const admin = await prisma.usuario.create({
    data: { nombre: "Carolina Restrepo", email: "admin@demo-oltc.com", passwordHash: passHash, rol: "ADMINISTRADOR", tenantId: tenant.id },
  });
  const gerente = await prisma.usuario.create({
    data: { nombre: "Ricardo Mejía", email: "gerente@demo-oltc.com", passwordHash: passHash, rol: "GERENTE", tenantId: tenant.id },
  });
  const comercial = await prisma.usuario.create({
    data: { nombre: "Andrés Villa", email: "comercial@demo-oltc.com", passwordHash: passHash, rol: "COMERCIAL", tenantId: tenant.id },
  });
  const vendedores = [admin.id, gerente.id, comercial.id];
  console.log(`✅ Usuarios: ${admin.nombre} (admin), ${gerente.nombre} (gerente), ${comercial.nombre} (comercial)`);
  console.log(`   Acceso demo:  admin@demo-oltc.com  /  Demo2026!`);

  // ── EMPRESAS CLIENTE (sectores típicos de OLTC) ───────────────────────────
  const empresasSpecs: { nombre: string; sector: string; tags: string[] }[] = [
    { nombre: "Banco Andino S.A.",              sector: "Servicios Financieros", tags: ["financiero", "potencial-alto"] },
    { nombre: "Seguros del Pacífico",           sector: "Seguros",               tags: ["asegurador"] },
    { nombre: "Contact Center Global BPO",      sector: "BPO",                   tags: ["bpo", "telecom-intensivo"] },
    { nombre: "Laboratorios Farma Vida",        sector: "Farmacéutica",          tags: ["farma", "recurrente"] },
    { nombre: "Industrias Metálicas del Sur",   sector: "Industria",             tags: ["industria", "energía-alta"] },
    { nombre: "Retail Cadena Éxito Express",    sector: "Retail",                tags: ["retail", "multi-sede"] },
    { nombre: "Universidad Los Cerros",         sector: "Educación",             tags: ["educación"] },
    { nombre: "Fundación Progreso Social",      sector: "Educación",             tags: ["fundación"] },
    { nombre: "Aseguradora Continental",        sector: "Seguros",               tags: ["asegurador", "potencial-alto"] },
    { nombre: "TeleContacto Outsourcing",       sector: "BPO",                   tags: ["bpo"] },
    { nombre: "Cooperativa Financiera Unida",   sector: "Servicios Financieros", tags: ["financiero"] },
    { nombre: "Alimentos Procesados Norte",     sector: "Industria",             tags: ["industria"] },
    { nombre: "Droguerías La Rebaja Regional",  sector: "Retail",                tags: ["retail", "multi-sede"] },
    { nombre: "Clínica Farmacéutica Central",   sector: "Farmacéutica",          tags: ["farma"] },
    { nombre: "Banco Cooperativo del Café",     sector: "Servicios Financieros", tags: ["financiero"] },
    { nombre: "Manufacturas Textiles Andes",    sector: "Industria",             tags: ["industria", "energía-alta"] },
  ];

  const empresas = await Promise.all(
    empresasSpecs.map((e, i) =>
      prisma.empresa.create({
        data: {
          nombre: e.nombre,
          sector: e.sector,
          email: `contacto@${e.nombre.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.co`,
          telefono: `60${1 + (i % 8)} ${100 + i} ${2000 + i * 10}`,
          etiquetas: e.tags,
          tenantId: tenant.id,
        },
      })
    )
  );
  console.log(`✅ ${empresas.length} empresas cliente creadas`);

  // ── CONTACTOS (roles que deciden sobre gasto) ─────────────────────────────
  const cargos = ["CFO / Director Financiero", "Gerente de Compras", "Gerente de TI", "Gerente Administrativo"];
  const nombresContacto = ["Laura Gómez", "Camilo Torres", "Patricia Ruiz", "Jorge Bernal", "Diana Salazar", "Felipe Ortiz", "Marcela Peña", "Óscar Ramírez"];
  let ci = 0;
  const contactos: { id: string; empresaId: string }[] = [];
  for (const emp of empresas) {
    const n = 1 + (ci % 2); // 1 o 2 contactos
    for (let k = 0; k < n; k++) {
      const c = await prisma.contacto.create({
        data: {
          nombre: nombresContacto[ci % nombresContacto.length],
          cargo: cargos[(ci + k) % cargos.length],
          email: `${nombresContacto[ci % nombresContacto.length].split(" ")[0].toLowerCase()}@${emp.nombre.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.co`,
          telefono: `31${ci % 9} ${200 + ci} ${3000 + ci}`,
          empresaId: emp.id,
          tenantId: tenant.id,
        },
      });
      contactos.push({ id: c.id, empresaId: emp.id });
      ci++;
    }
  }
  console.log(`✅ ${contactos.length} contactos creados`);

  // ── PIPELINE: oportunidades en varias etapas (sin cotización formal) ──────
  const etapas = ["PROSPECTO", "PROSPECTO", "CALIFICADO", "CALIFICADO", "NEGOCIACION", "GANADA"] as const;
  for (let i = 0; i < 8; i++) {
    const emp = empresas[(i + 6) % empresas.length];
    const cont = contactos.find(c => c.empresaId === emp.id);
    await prisma.oportunidad.create({
      data: {
        titulo: `Optimización de gasto — ${emp.nombre}`,
        valor: 15_000_000 + i * 9_000_000,
        etapa: etapas[i % etapas.length],
        origenLead: i % 2 === 0 ? "Referido" : "Prospección",
        probabilidad: [20, 40, 60, 75, 90][i % 5],
        empresaId: emp.id,
        contactoId: cont?.id ?? null,
        tenantId: tenant.id,
        creadoBy: vendedores[i % vendedores.length],
        creadoEn: dia(-30 + i * 3),
      },
    });
  }
  console.log("✅ 8 oportunidades en pipeline");

  // ── COTIZACIONES SUCCESS FEE (con líneas de ahorro) ───────────────────────
  // Cada una crea su oportunidad en etapa PROPUESTA con el valor estimado del
  // honorario, más la cotización con sus líneas de ahorro por área.
  const propuestas: {
    empresaIdx: number;
    estado: "BORRADOR" | "ENVIADA" | "ACEPTADA";
    pct: number;
    meses: number;
    lineas: { area: string; gastoBaseMensual: number; ahorroEstimadoMensual: number }[];
  }[] = [
    {
      empresaIdx: 0, estado: "ENVIADA", pct: 50, meses: 18,
      lineas: [
        { area: "Telecomunicaciones (datos + voz)", gastoBaseMensual: 42_000_000, ahorroEstimadoMensual: 12_600_000 },
        { area: "Servicios de nube (TIC)",          gastoBaseMensual: 28_000_000, ahorroEstimadoMensual: 5_600_000 },
      ],
    },
    {
      empresaIdx: 2, estado: "ENVIADA", pct: 50, meses: 18,
      lineas: [
        { area: "Telecomunicaciones (contact center)", gastoBaseMensual: 65_000_000, ahorroEstimadoMensual: 19_500_000 },
        { area: "Energía eléctrica",                    gastoBaseMensual: 22_000_000, ahorroEstimadoMensual: 3_300_000 },
      ],
    },
    {
      empresaIdx: 4, estado: "ACEPTADA", pct: 50, meses: 18,
      lineas: [
        { area: "Energía eléctrica (planta)", gastoBaseMensual: 88_000_000, ahorroEstimadoMensual: 17_600_000 },
        { area: "Agua y alcantarillado",      gastoBaseMensual: 14_000_000, ahorroEstimadoMensual: 2_800_000 },
        { area: "Gestión de residuos",        gastoBaseMensual: 6_000_000,  ahorroEstimadoMensual: 1_500_000 },
      ],
    },
    {
      empresaIdx: 5, estado: "BORRADOR", pct: 45, meses: 18,
      lineas: [
        { area: "Telecomunicaciones (multi-sede)", gastoBaseMensual: 38_000_000, ahorroEstimadoMensual: 9_500_000 },
      ],
    },
    {
      empresaIdx: 8, estado: "ENVIADA", pct: 50, meses: 24,
      lineas: [
        { area: "Telecomunicaciones",       gastoBaseMensual: 31_000_000, ahorroEstimadoMensual: 7_750_000 },
        { area: "Servicios de nube (TIC)",  gastoBaseMensual: 19_000_000, ahorroEstimadoMensual: 3_800_000 },
      ],
    },
  ];

  for (let i = 0; i < propuestas.length; i++) {
    const p = propuestas[i];
    const emp = empresas[p.empresaIdx];
    const cont = contactos.find(c => c.empresaId === emp.id);
    const valor = valorSF(p.lineas, p.pct, p.meses);

    const op = await prisma.oportunidad.create({
      data: {
        titulo: `Cotización — ${emp.nombre}`,
        valor,
        etapa: p.estado === "ACEPTADA" ? "GANADA" : "PROPUESTA",
        empresaId: emp.id,
        contactoId: cont?.id ?? null,
        probabilidad: p.estado === "ACEPTADA" ? 100 : 60,
        tenantId: tenant.id,
        creadoBy: vendedores[i % vendedores.length],
        creadoEn: dia(-20 + i * 2),
      },
    });

    await prisma.cotizacion.create({
      data: {
        estado: p.estado,
        modalidad: "SUCCESS_FEE",
        porcentajeHonorarios: p.pct,
        horizonteMeses: p.meses,
        notas: "Honorarios contingentes al ahorro real validado mes a mes. Sin ahorro comprobado, no hay cobro.",
        fechaValidez: dia(20),
        empresaId: emp.id,
        contactoId: cont?.id ?? null,
        oportunidadId: op.id,
        tenantId: tenant.id,
        creadoEn: dia(-20 + i * 2),
        lineasAhorro: {
          create: p.lineas.map(l => ({
            area: l.area,
            gastoBaseMensual: l.gastoBaseMensual,
            ahorroEstimadoMensual: l.ahorroEstimadoMensual,
          })),
        },
      },
    });
    console.log(`   • Cotización ${p.estado} — ${emp.nombre}: honorario estimado ${valor.toLocaleString("es-CO")} COP`);
  }
  console.log(`✅ ${propuestas.length} cotizaciones Success Fee creadas`);

  console.log("\n🎉 Seed Demo OLTC completado.\n");
  console.log("   Ingreso:  admin@demo-oltc.com  /  Demo2026!");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
