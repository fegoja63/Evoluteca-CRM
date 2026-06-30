import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

type MapeoCompleto = {
  empresa?: string;
  contacto?: string;
  emailContacto?: string;
  telefonoContacto?: string;
  cargoContacto?: string;
  tituloOportunidad?: string;
  valorOportunidad?: string;
  etapaOportunidad?: string;
  segmentoAudiencia?: string;
};

const ETAPAS_MAP: Record<string, string> = {
  "HECHO": "GANADA",
  "GANADO": "GANADA",
  "GANADA": "GANADA",
  "DESCARTADO": "PERDIDA",
  "PERDIDO": "PERDIDA",
  "PERDIDA": "PERDIDA",
  "PROPUESTA": "PROPUESTA",
  "NEGOCIACION": "NEGOCIACION",
  "NEGOCIACIÓN": "NEGOCIACION",
  "CALIFICADO": "CALIFICADO",
  "PROSPECTO": "PROSPECTO",
  "EN PROCESO": "PROPUESTA",
  "PROCESO": "PROPUESTA",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  const mapeoRaw = formData.get("mapeo") as string;
  const colsExtraRaw = formData.get("colsExtra") as string;

  if (!file || !mapeoRaw) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const mapeo: MapeoCompleto = JSON.parse(mapeoRaw);
  const colsExtra: string[] = colsExtraRaw ? JSON.parse(colsExtraRaw) : [];

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? "").trim()));

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headers.forEach((h, i) => { fila[h] = String(row.getCell(i + 1).value ?? "").trim(); });
    if (Object.values(fila).some((v) => v)) filas.push(fila);
  });

  function get(fila: Record<string, string>, campo: keyof MapeoCompleto): string | null {
    const col = mapeo[campo];
    if (!col) return null;
    return fila[col]?.trim() || null;
  }

  function getExtras(fila: Record<string, string>): Record<string, string> | null {
    const extras: Record<string, string> = {};
    const usadas = new Set(Object.values(mapeo).filter(Boolean));
    for (const col of colsExtra) {
      if (!usadas.has(col)) {
        const val = fila[col]?.trim();
        if (val) extras[col] = val;
      }
    }
    return Object.keys(extras).length > 0 ? extras : null;
  }

  // Cache de empresas ya creadas en esta importación
  const empresaCache = new Map<string, string>(); // nombre → id
  // Pre-cargar empresas existentes
  const existentes = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
  existentes.forEach((e) => empresaCache.set(e.nombre.toLowerCase(), e.id));

  let empresasCreadas = 0;
  let contactosCreados = 0;
  let oportunidadesCreadas = 0;
  let errores = 0;

  for (const fila of filas) {
    try {
      const nombreEmpresa = get(fila, "empresa");
      let empresaId: string | null = null;

      // Crear empresa si no existe
      if (nombreEmpresa) {
        const key = nombreEmpresa.toLowerCase();
        if (empresaCache.has(key)) {
          empresaId = empresaCache.get(key)!;
        } else {
          const emp = await prisma.empresa.create({
            data: {
              nombre: nombreEmpresa,
              extras: getExtras(fila),
              tenantId,
            },
          });
          empresaId = emp.id;
          empresaCache.set(key, emp.id);
          empresasCreadas++;
        }
      }

      // Crear contacto
      const nombreContacto = get(fila, "contacto");
      let contactoId: string | null = null;
      if (nombreContacto) {
        const c = await prisma.contacto.create({
          data: {
            nombre: nombreContacto,
            email: get(fila, "emailContacto"),
            telefono: get(fila, "telefonoContacto"),
            cargo: get(fila, "cargoContacto"),
            empresaId,
            tenantId,
          },
        });
        contactoId = c.id;
        contactosCreados++;
      }

      // Crear oportunidad
      const tituloOp = get(fila, "tituloOportunidad");
      if (tituloOp) {
        const etapaRaw = get(fila, "etapaOportunidad")?.toUpperCase().trim() ?? "";
        const etapa = (ETAPAS_MAP[etapaRaw] ?? "PROSPECTO") as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";
        const valorRaw = get(fila, "valorOportunidad")?.replace(/[^0-9.]/g, "");
        const valor = valorRaw && !isNaN(Number(valorRaw)) ? Number(valorRaw) : null;

        await prisma.oportunidad.create({
          data: {
            titulo: tituloOp,
            etapa,
            valor,
            empresaId,
            contactoId,
            extras: getExtras(fila),
            tenantId,
          },
        });
        oportunidadesCreadas++;
      }
    } catch {
      errores++;
    }
  }

  return NextResponse.json({
    ok: true,
    empresasCreadas,
    contactosCreados,
    oportunidadesCreadas,
    errores,
    total: filas.length,
  });
}
