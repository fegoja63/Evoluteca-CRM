import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo-evoluteca" } });
  if (!tenant) { console.error("Tenant demo no encontrado"); return; }

  const vendedor1 = await prisma.usuario.findFirst({ where: { email: "sofia@demo-evoluteca.com" } });
  const vendedor2 = await prisma.usuario.findFirst({ where: { email: "andres@demo-evoluteca.com" } });

  await prisma.plantillaCotizacion.create({
    data: {
      nombre: "Paquete Consultoría Estándar",
      notas: "Incluye diagnóstico, implementación y seguimiento.",
      tenantId: tenant.id,
      items: { create: [
        { descripcion: "Diagnóstico organizacional", cantidad: 1, precioUnit: 2500000 },
        { descripcion: "Plan de acción estratégico", cantidad: 1, precioUnit: 3000000 },
        { descripcion: "Acompañamiento en implementación", cantidad: 1, precioUnit: 4500000 },
        { descripcion: "Informe de resultados", cantidad: 1, precioUnit: 1000000 },
      ]},
    },
  });

  await prisma.plantillaCotizacion.create({
    data: {
      nombre: "Capacitación Corporativa Básica",
      tenantId: tenant.id,
      items: { create: [
        { descripcion: "Taller presencial (8 horas)", cantidad: 1, precioUnit: 2800000 },
        { descripcion: "Material de trabajo por participante", cantidad: 20, precioUnit: 35000 },
        { descripcion: "Informe de aprendizaje", cantidad: 1, precioUnit: 500000 },
      ]},
    },
  });
  console.log("✅ Plantillas creadas");

  const hoy = new Date();
  const mesActual  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

  await prisma.metaVenta.createMany({ data: [
    { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, valorObjetivo: 40000000, tenantId: tenant.id },
    { anio: hoy.getFullYear(), mes: hoy.getMonth(),     valorObjetivo: 35000000, tenantId: tenant.id },
  ], skipDuplicates: true });
  console.log("✅ Metas creadas");

  console.log(`
╔══════════════════════════════════════════════════════╗
║         DEMO LISTO ✅                                ║
╠══════════════════════════════════════════════════════╣
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

main().catch(console.error).finally(() => prisma.$disconnect());
