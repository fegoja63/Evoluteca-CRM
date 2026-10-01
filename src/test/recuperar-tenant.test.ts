/**
 * Recuperar un tenant desde un respaldo (scripts/recuperar-tenant.ts):
 * vuelve lo borrado, no pisa lo que se creó después ni toca otros tenants.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import os from "os";
import path from "path";
import { A, B, sembrar } from "./sembrar";
import { prisma, sinAislamiento } from "./prisma-vigilado";
import { recuperarTenant as recuperarSinGuardia, fuenteVolcado } from "@/lib/recuperar-tenant";

// El script busca por id en TODA la base a propósito: un id que ya exista,
// aunque sea en otro tenant, no se debe reinsertar.
const recuperarTenant: typeof recuperarSinGuardia = (...args) =>
  sinAislamiento("recuperar-tenant comprueba ids existentes en toda la base", () => recuperarSinGuardia(...args));

/** Mismo formato que scripts/backup-db.ts: un <Modelo>.json por tabla, SELECT * crudo. */
async function respaldarEn(carpeta: string) {
  for (const m of Prisma.dmmf.datamodel.models) {
    const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${m.dbName ?? m.name}"`);
    fs.writeFileSync(path.join(carpeta, `${m.name}.json`), JSON.stringify(filas, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && typeof v === "object" && typeof (v as { toFixed?: unknown }).toFixed === "function") return (v as { toFixed: () => string }).toFixed();
      if (Buffer.isBuffer(v)) return v.toString("base64");
      return v;
    }));
  }
}

/** Lo mismo que borra "Borrar todos los datos del CRM". */
async function borrarComoElBoton(tenantId: string) {
  await prisma.$transaction([
    prisma.itemCotizacion.deleteMany({ where: { cotizacion: { tenantId } } }),
    prisma.cotizacion.deleteMany({ where: { tenantId } }),
    prisma.eventoTimeline.deleteMany({ where: { tenantId } }),
    prisma.actividad.deleteMany({ where: { tenantId } }),
    prisma.oportunidad.deleteMany({ where: { tenantId } }),
    prisma.contacto.deleteMany({ where: { tenantId } }),
    prisma.empresa.deleteMany({ where: { tenantId } }),
  ]);
}

const conteo = async (tenantId: string) => ({
  empresas: await prisma.empresa.count({ where: { tenantId } }),
  contactos: await prisma.contacto.count({ where: { tenantId } }),
  oportunidades: await prisma.oportunidad.count({ where: { tenantId } }),
  actividades: await prisma.actividad.count({ where: { tenantId } }),
  cotizaciones: await prisma.cotizacion.count({ where: { tenantId } }),
  items: await prisma.itemCotizacion.count({ where: { cotizacion: { tenantId } } }),
  cambiosEtapa: await prisma.cambioEtapa.count({ where: { oportunidad: { tenantId } } }),
});

let carpeta: string;

beforeEach(async () => {
  await sembrar();
  carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "respaldo-prueba-"));
});

describe("recuperar un tenant desde un respaldo", () => {
  it("devuelve lo borrado sin pisar lo nuevo ni tocar otro tenant", { timeout: 240_000 }, async () => {
    const antesA = await conteo(A.tenantId);
    const antesB = await conteo(B.tenantId);
    expect(antesA.oportunidades).toBeGreaterThan(0);
    await respaldarEn(carpeta);

    await borrarComoElBoton(A.tenantId);
    expect((await conteo(A.tenantId)).oportunidades).toBe(0);

    // Lo que el cliente creó DESPUÉS del borrado tiene que sobrevivir.
    await prisma.empresa.create({ data: { id: "empresa-nueva-tras-borrado", tenantId: A.tenantId, nombre: "Creada después", creadoBy: A.admin } });

    const db = prisma as unknown as PrismaClient;

    // Simulación: no escribe.
    const sim = await recuperarTenant(db, carpeta, A.tenantId, { aplicar: false });
    expect(sim.modelos.Oportunidad.enRespaldo).toBe(antesA.oportunidades);
    expect(sim.modelos.Oportunidad.yaExisten).toBe(0);
    expect((await conteo(A.tenantId)).oportunidades).toBe(0);

    // Aplicar.
    const r = await recuperarTenant(db, carpeta, A.tenantId, { aplicar: true });
    const fallidas = Object.values(r.modelos).flatMap(m => m.fallidas);
    expect(fallidas).toEqual([]);

    const despuesA = await conteo(A.tenantId);
    expect(despuesA).toEqual({ ...antesA, empresas: antesA.empresas + 1 });
    expect(await prisma.empresa.findFirst({ where: { id: "empresa-nueva-tras-borrado", tenantId: A.tenantId } })).not.toBeNull();
    expect(await conteo(B.tenantId)).toEqual(antesB);

    // Correrlo otra vez no duplica nada.
    const otra = await recuperarTenant(db, carpeta, A.tenantId, { aplicar: true });
    expect(Object.values(otra.modelos).reduce((s, m) => s + m.insertadas, 0)).toBe(0);
    expect(await conteo(A.tenantId)).toEqual(despuesA);
  });

  it("no restaura configuración ni usuarios", async () => {
    await respaldarEn(carpeta);
    const r = await recuperarTenant(prisma as unknown as PrismaClient, carpeta, A.tenantId, { aplicar: false });
    for (const modelo of ["Tenant", "Usuario", "Producto", "MetaVenta", "EtapaPipeline", "RegistroAuditoria"]) {
      expect(r.modelos[modelo]).toBeUndefined();
    }
  });

  it("también desde el respaldo del servidor (indexado por nombre de tabla)", { timeout: 240_000 }, async () => {
    const antesA = await conteo(A.tenantId);
    // Como lo arma api/cron/respaldo: { <tabla>: filas[] }, pasado por JSON.
    const datos: Record<string, Record<string, unknown>[]> = {};
    for (const m of Prisma.dmmf.datamodel.models) {
      const tabla = m.dbName ?? m.name;
      datos[tabla] = JSON.parse(JSON.stringify(await prisma.$queryRawUnsafe(`SELECT * FROM "${tabla}"`), (_k, v) =>
        typeof v === "bigint" ? v.toString()
          : v && typeof v === "object" && typeof (v as { toFixed?: unknown }).toFixed === "function" ? (v as { toFixed: () => string }).toFixed()
          : v));
    }

    await borrarComoElBoton(A.tenantId);
    const r = await recuperarTenant(prisma as unknown as PrismaClient, fuenteVolcado(datos), A.tenantId, { aplicar: true });
    expect(Object.values(r.modelos).flatMap(m => m.fallidas)).toEqual([]);
    expect(await conteo(A.tenantId)).toEqual(antesA);
  });
});
