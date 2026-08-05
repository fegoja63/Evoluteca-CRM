import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { excedeTope } from "@/lib/importar-limite";

type Mapeo = Record<string, string>; // campoDelCRM -> columnaDelExcel

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  const modulo = formData.get("modulo") as string;
  const mapeoRaw = formData.get("mapeo") as string;
  const colsExtraRaw = formData.get("colsExtra") as string;

  if (!file || !modulo || !mapeoRaw) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const mapeo: Mapeo = JSON.parse(mapeoRaw);
  const colsExtra: string[] = colsExtraRaw ? JSON.parse(colsExtraRaw) : [];
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets.reduce((best, curr) =>
    (curr.rowCount > best.rowCount ? curr : best), wb.worksheets[0]);

  function leerCelda(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && "result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "");
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }

  const headerMap: { col: number; nombre: string }[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = leerCelda(cell).trim();
    if (val) headerMap.push({ col: colNumber, nombre: val });
  });

  function getCol(fila: Record<string, string>, campo: string): string | null {
    const colExcel = mapeo[campo];
    if (!colExcel || colExcel === "__ignorar__") return null;
    return fila[colExcel]?.trim() || null;
  }

  // Columnas marcadas explícitamente como extras por el usuario
  const colsExtraSet = new Set(colsExtra);

  function getExtras(fila: Record<string, string>): Record<string, string> | null {
    const extras: Record<string, string> = {};
    for (const col of Array.from(colsExtraSet)) {
      const val = fila[col]?.trim();
      if (val) extras[col] = val;
    }
    return Object.keys(extras).length > 0 ? extras : null;
  }

  // Convierte el texto de una celda a Date. `leerCelda` ya devuelve ISO cuando
  // Excel guarda la celda como fecha real, así que `new Date(...)` la reconstruye;
  // si viene texto no parseable devolvemos null (la fila se cuenta como error).
  function parseFecha(v: string | null): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function enteroODefault(v: string | null, def: number): number {
    if (!v) return def;
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? def : n;
  }

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headerMap.forEach(({ col, nombre }) => { fila[nombre] = leerCelda(row.getCell(col)).trim(); });
    if (Object.values(fila).some((v) => v)) filas.push(fila);
  });

  const tope = excedeTope(filas);
  if (tope) return tope;

  let creados = 0;
  let errores = 0;

  // Se inserta EN LOTE (createMany) en vez de fila por fila: un archivo de
  // cientos/miles de filas hacía cientos/miles de viajes a la base (minutos);
  // en lote es una sola operación (segundos). Las filas sin el campo obligatorio
  // se descartan y se cuentan como errores antes de insertar.
  if (modulo === "empresas") {
    const data = [];
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      data.push({
        nombre,
        sector: getCol(fila, "sector"),
        telefono: getCol(fila, "telefono"),
        sitioWeb: getCol(fila, "sitioWeb"),
        notas: getCol(fila, "notas"),
        extras: getExtras(fila) ?? undefined,
        tenantId,
      });
    }
    creados = (await prisma.empresa.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "contactos") {
    const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));

    const data = [];
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      const empresaNombre = getCol(fila, "empresa");
      const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
      data.push({
        nombre,
        email: getCol(fila, "email"),
        telefono: getCol(fila, "telefono"),
        cargo: getCol(fila, "cargo"),
        notas: getCol(fila, "notas"),
        extras: getExtras(fila) ?? undefined,
        empresaId: empresaId || null,
        tenantId,
      });
    }
    creados = (await prisma.contacto.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "oportunidades") {
    const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));
    const ETAPAS_VALIDAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];

    const data = [];
    for (const fila of filas) {
      const titulo = getCol(fila, "titulo");
      if (!titulo) { errores++; continue; }
      const empresaNombre = getCol(fila, "empresa");
      const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
      const etapaRaw = getCol(fila, "etapa")?.toUpperCase().replace(/\s/g, "_") ?? "";
      const etapa = ETAPAS_VALIDAS.includes(etapaRaw) ? etapaRaw as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA" : "PROSPECTO";
      const valorRaw = getCol(fila, "valor");
      const valor = valorRaw ? Number(valorRaw.replace(/[^0-9.]/g, "")) : null;
      data.push({
        titulo,
        etapa,
        valor: valor && !isNaN(valor) ? valor : null,
        notas: getCol(fila, "notas"),
        extras: getExtras(fila) ?? undefined,
        empresaId: empresaId || null,
        tenantId,
      });
    }
    creados = (await prisma.oportunidad.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "espectadores") {
    const SEGMENTOS_VALIDOS = ["INDIVIDUAL", "GRUPO", "EMPRESA", "COLEGIO"];
    const data = [];
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      const segRaw = getCol(fila, "segmento")?.toUpperCase() ?? "";
      const segmento = SEGMENTOS_VALIDOS.includes(segRaw) ? segRaw as "INDIVIDUAL" | "GRUPO" | "EMPRESA" | "COLEGIO" : "INDIVIDUAL";
      data.push({
        nombre,
        email: getCol(fila, "email"),
        telefono: getCol(fila, "telefono"),
        segmento,
        notas: getCol(fila, "notas"),
        extras: getExtras(fila) ?? undefined,
        tenantId,
      });
    }
    creados = (await prisma.espectador.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "productos") {
    // Producto no tiene columna `extras`, así que las columnas marcadas como
    // "extra" simplemente se ignoran para este módulo.
    const data = [];
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      const precioRaw = getCol(fila, "precioBase");
      const precio = precioRaw ? Number(precioRaw.replace(/[^0-9.]/g, "")) : 0;
      data.push({
        nombre,
        descripcion: getCol(fila, "descripcion"),
        precioBase: precio && !isNaN(precio) ? precio : 0,
        tenantId,
      });
    }
    creados = (await prisma.producto.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "funciones") {
    const CANALES_VALIDOS = ["PLATAFORMA", "TAQUILLA", "INVITADOS", "EMPRESA"];
    const data = [];
    for (const fila of filas) {
      const titulo = getCol(fila, "titulo");
      const fecha = parseFecha(getCol(fila, "fecha"));
      // titulo y fecha son obligatorios en la base: sin fecha válida la fila
      // no puede insertarse, así que se descarta y se cuenta como error.
      if (!titulo || !fecha) { errores++; continue; }
      const canalRaw = getCol(fila, "canal")?.toUpperCase() ?? "";
      const canal = CANALES_VALIDOS.includes(canalRaw)
        ? canalRaw as "PLATAFORMA" | "TAQUILLA" | "INVITADOS" | "EMPRESA" : "PLATAFORMA";
      const ingresoRaw = getCol(fila, "ingresoEstimado");
      const ingreso = ingresoRaw ? Number(ingresoRaw.replace(/[^0-9.]/g, "")) : null;
      data.push({
        titulo,
        fecha,
        canal,
        sillasTotales: enteroODefault(getCol(fila, "sillasTotales"), 239),
        sillasVendidas: enteroODefault(getCol(fila, "sillasVendidas"), 0),
        ingresoEstimado: ingreso && !isNaN(ingreso) ? ingreso : null,
        notas: getCol(fila, "notas"),
        tenantId,
      });
    }
    creados = (await prisma.funcion.createMany({ data, skipDuplicates: true })).count;
  } else if (modulo === "agenda") {
    const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));
    const TIPOS_VALIDOS = ["LLAMADA", "REUNION", "TAREA", "EMAIL", "VISITA_COMERCIAL", "VISITA_TECNICA"];
    const data = [];
    for (const fila of filas) {
      const titulo = getCol(fila, "titulo");
      const fecha = parseFecha(getCol(fila, "fecha"));
      if (!titulo || !fecha) { errores++; continue; }
      const tipoRaw = getCol(fila, "tipo")?.toUpperCase().replace(/\s/g, "_") ?? "";
      const tipo = TIPOS_VALIDOS.includes(tipoRaw)
        ? tipoRaw as "LLAMADA" | "REUNION" | "TAREA" | "EMAIL" | "VISITA_COMERCIAL" | "VISITA_TECNICA" : "TAREA";
      const completadaRaw = (getCol(fila, "completada") ?? "").toLowerCase();
      const completada = ["si", "sí", "true", "1", "x", "yes"].includes(completadaRaw);
      const empresaNombre = getCol(fila, "empresa");
      const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
      data.push({
        titulo,
        fecha,
        tipo,
        completada,
        // `estado` se mantiene sincronizado con `completada` (ver schema).
        estado: (completada ? "COMPLETADA" : "PENDIENTE") as "COMPLETADA" | "PENDIENTE",
        notas: getCol(fila, "notas"),
        empresaId: empresaId || null,
        tenantId,
      });
    }
    creados = (await prisma.actividad.createMany({ data, skipDuplicates: true })).count;
  } else {
    return NextResponse.json({ error: "Módulo no soportado" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, creados, errores, total: filas.length });
}
