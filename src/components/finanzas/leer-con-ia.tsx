"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSparkles, IconUpload, IconDeviceFloppy, IconCircleCheck, IconFilePlus } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { formatoDia } from "@/lib/fecha-bogota";
import { totalesBalance, balanceCuadra, type Balance, type Periodo } from "@/lib/finanzas/estados";
import { repartirAcumulado, mesesEntre, type Acumulado } from "@/lib/finanzas/lectura-ia";
import { millones, mesCorto } from "@/lib/finanzas/formato";
import { TablaMeses, enviar } from "./comun";

type Lectura = {
  periodos: Periodo[];
  acumulado: Acumulado | null;
  balance: (Balance & { corte: string }) | null;
  advertencias: string[];
  unidadDocumento: string;
};

const UNIDAD: Record<string, string> = { miles: "miles de pesos", millones: "millones de pesos" };

const MB = 1024 * 1024;
const MAX_ARCHIVO = 15 * MB;     // tope del archivo
const MAX_DIRECTO = 3.5 * MB;    // hasta aquí va en una sola petición; más, por partes
const TAMANO_PARTE = Math.floor(3.5 * MB);
const MAX_IMAGEN = 3.5 * MB;     // la IA no acepta imágenes de más de 5 MB: se achican antes

/** Una foto muy pesada se achica en el navegador (JPEG, lado mayor 3000 px). */
async function achicarFoto(f: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size <= MAX_IMAGEN) return f;
  try {
    const bmp = await createImageBitmap(f);
    const escala = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext("2d")!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>(r => lienzo.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f; // si el navegador no la puede abrir, que el servidor diga qué hacer
  }
}

/** Manda el archivo: directo si es pequeño; si no, por partes y luego pide leerlo. */
async function enviarParaLeer(f: File, avance: (texto: string) => void): Promise<Response> {
  const form = new FormData();
  if (f.size <= MAX_DIRECTO) {
    form.append("archivo", f);
  } else {
    const subidaId = crypto.randomUUID();
    const total = Math.ceil(f.size / TAMANO_PARTE);
    for (let i = 0; i < total; i++) {
      avance(`Subiendo ${i + 1} de ${total}…`);
      const parte = new FormData();
      parte.append("subidaId", subidaId);
      parte.append("indice", String(i));
      parte.append("total", String(total));
      parte.append("nombre", f.name);
      parte.append("parte", f.slice(i * TAMANO_PARTE, (i + 1) * TAMANO_PARTE), f.name);
      const r = await fetch("/api/finanzas/subir-parte", { method: "POST", body: parte });
      if (!r.ok) return r;
    }
    form.append("subidaId", subidaId);
  }
  avance("Leyendo… puede tardar un minuto");
  return fetch("/api/finanzas/leer-ia", { method: "POST", body: form });
}

/** 1. Leer con IA los estados del contador; el usuario revisa y guarda. */
export function LeerConIA() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [avance, setAvance] = useState("");
  const [lectura, setLectura] = useState<Lectura | null>(null);
  // Meses a guardar: los que leyó la IA, o el acumulado repartido si el usuario lo pide.
  const [meses, setMeses] = useState<Periodo[]>([]);
  const [repartido, setRepartido] = useState(false);
  const [guardando, setGuardando] = useState<"meses" | "balance" | "todo" | null>(null);
  // Después de guardar: qué quedó guardado, y el botón para cargar otro informe.
  const [guardado, setGuardado] = useState<string | null>(null);
  const [claveInput, setClaveInput] = useState(0);

  async function leer() {
    if (!archivo) return;
    setLeyendo(true);
    setLectura(null);
    const res = await enviarParaLeer(await achicarFoto(archivo), setAvance).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setLeyendo(false);
    setAvance("");
    if (!res) { toast.error("No se pudo enviar el archivo. Revise su conexión e inténtelo de nuevo."); return; }
    if (!res.ok) { toast.error(data.error ?? "No se pudo leer el documento."); return; }
    setLectura(data);
    setMeses(data.periodos);
    setRepartido(false);
  }

  async function guardarMeses() {
    setGuardando("meses");
    try {
      await enviar("/api/finanzas/periodos", "PUT", { periodos: meses });
      toast.success(`${meses.length} mes(es) guardado(s).`);
      setMeses([]);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(null);
    }
  }

  async function guardarBalance() {
    if (!lectura?.balance) return;
    setGuardando("balance");
    try {
      await enviar("/api/finanzas/balance", "PUT", lectura.balance);
      toast.success("Balance guardado.");
      setLectura({ ...lectura, balance: null });
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(null);
    }
  }

  /**
   * Guarda de una vez todo lo que la IA leyó: los meses (si el estado de
   * resultados viene acumulado del año, pide confirmar el reparto en meses
   * iguales) y el balance. Antes había que encontrar dos botones y, con un
   * acumulado, primero "Repartir": era fácil irse sin guardar nada.
   */
  async function guardarTodo() {
    if (!lectura) return;
    let mesesAGuardar = meses;
    if (mesesAGuardar.length === 0 && lectura.acumulado) {
      const n = mesesEntre(lectura.acumulado.desde, lectura.acumulado.hasta).length;
      if (!confirm(`El estado de resultados viene acumulado de ${mesCorto(lectura.acumulado.desde)} a ${mesCorto(lectura.acumulado.hasta)}. Se guardará repartido en ${n} meses iguales (es un promedio, no el dato real de cada mes). ¿Continuar?`)) return;
      mesesAGuardar = repartirAcumulado(lectura.acumulado);
    }
    setGuardando("todo");
    const hecho: string[] = [];
    try {
      if (mesesAGuardar.length > 0) {
        await enviar("/api/finanzas/periodos", "PUT", { periodos: mesesAGuardar });
        hecho.push(`${mesesAGuardar.length} mes(es) del estado de resultados`);
      }
      if (lectura.balance) {
        await enviar("/api/finanzas/balance", "PUT", lectura.balance);
        hecho.push(`el balance al ${formatoDia(lectura.balance.corte)}`);
      }
      setGuardado(hecho.join(" y "));
      setLectura(null);
      setMeses([]);
      setArchivo(null);
      setClaveInput(k => k + 1);
      router.refresh();
    } catch (e) {
      // Lo que alcanzó a guardarse queda guardado; se dice qué faltó.
      toast.error(`${hecho.length ? `Se guardó ${hecho.join(" y ")}, pero ` : ""}${(e as Error).message}`);
    } finally {
      setGuardando(null);
    }
  }

  function cargarOtro() {
    setGuardado(null);
    setLectura(null);
    setMeses([]);
    setArchivo(null);
    setClaveInput(k => k + 1);
  }

  const sinNada = lectura && meses.length === 0 && !lectura.acumulado && !lectura.balance;
  const hayQueGuardar = !!lectura && (meses.length > 0 || !!lectura.acumulado || !!lectura.balance);

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <IconSparkles size={18} className="text-brand-600" />1. Leer los estados del contador con IA
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Suba los estados financieros tal como se los entregó su contador: PDF, Excel, Word, una foto o cualquier otro archivo
          (hasta 15 MB). La IA propone las cifras y usted las revisa antes de guardar. Cuenta como una acción de IA de su plan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={boton("secundario", "sm", "cursor-pointer")}>
          <IconUpload size={15} />{archivo ? archivo.name : "Elegir archivo (PDF, Excel, Word, foto u otro)"}
          <input key={claveInput} type="file" className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > MAX_ARCHIVO && !/^image\//.test(f.type)) { toast.error("El archivo pesa más de 15 MB. Suba solo los estados financieros."); e.target.value = ""; return; }
              setArchivo(f); setLectura(null); setGuardado(null);
            }} />
        </label>
        <button type="button" onClick={leer} disabled={!archivo || leyendo} className={boton("marca", "sm")}>
          {leyendo ? (avance || "Leyendo… puede tardar un minuto") : "Leer con IA"}
        </button>
      </div>

      {guardado && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="flex flex-1 items-center gap-1.5 text-sm text-emerald-800">
            <IconCircleCheck size={16} />Listo: se guardó {guardado}. Ya lo ve en Resumen, Estados e Indicadores.
          </p>
          <button type="button" onClick={cargarOtro} className={boton("secundario", "sm")}>
            <IconFilePlus size={15} />Cargar otro informe
          </button>
        </div>
      )}
      {lectura && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {UNIDAD[lectura.unidadDocumento] && (
            <p className="text-xs text-slate-500">El documento venía en {UNIDAD[lectura.unidadDocumento]}; las cifras ya están convertidas a pesos.</p>
          )}
          {lectura.advertencias.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-semibold">Revise esto:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{lectura.advertencias.map(a => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {sinNada && <p className="text-sm text-slate-600">No se encontraron estados financieros en este documento.</p>}

          {hayQueGuardar && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <p className="flex-1 text-sm text-slate-700">Revise las cifras de abajo y guárdelas. Puede corregir cualquier mes después en &quot;Meses cargados&quot;.</p>
              <button type="button" onClick={guardarTodo} disabled={guardando !== null} className={boton("primario", "sm")}>
                <IconDeviceFloppy size={15} />{guardando === "todo" ? "Guardando…" : "Guardar todo lo leído"}
              </button>
            </div>
          )}

          {lectura.acumulado && !repartido && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                El estado de resultados viene acumulado de <strong>{mesCorto(lectura.acumulado.desde)}</strong> a{" "}
                <strong>{mesCorto(lectura.acumulado.hasta)}</strong>: ventas {millones(lectura.acumulado.ventas)}, costo{" "}
                {millones(lectura.acumulado.costoVentas)}. Para verlo mes a mes se puede repartir en partes iguales; es un promedio
                aproximado, no el dato real de cada mes.
              </p>
              <button type="button" className={boton("secundario", "sm")}
                onClick={() => { setMeses(repartirAcumulado(lectura.acumulado!)); setRepartido(true); }}>
                Repartir en {mesesEntre(lectura.acumulado.desde, lectura.acumulado.hasta).length} meses iguales
              </button>
            </div>
          )}

          {meses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Estado de resultados: <strong>{meses.length}</strong> mes(es){repartido ? " (promedio repartido)" : ""}. Si un mes ya estaba cargado, se reemplaza.
              </p>
              <TablaMeses periodos={meses} />
              <button type="button" onClick={guardarMeses} disabled={guardando !== null} className={boton("primario", "sm")}>
                {guardando === "meses" ? "Guardando…" : `Guardar ${meses.length} mes(es)`}
              </button>
            </div>
          )}

          {lectura.balance && <BalanceLeido balance={lectura.balance} guardando={guardando === "balance"} onGuardar={guardarBalance} />}
        </div>
      )}
    </section>
  );
}

function BalanceLeido({ balance: b, guardando, onGuardar }: { balance: Balance & { corte: string }; guardando: boolean; onGuardar: () => void }) {
  const t = totalesBalance(b);
  const filas: [string, number][] = [
    ["Caja y bancos", b.caja], ["Cuentas por cobrar", b.cuentasPorCobrar], ["Inventario", b.inventario],
    ["Otros activos corrientes", b.otrosActivosCorrientes], ["Activos fijos", b.activosFijos], ["Proveedores", b.proveedores],
    ["Obligaciones financieras CP", b.obligacionesCP], ["Impuestos y laborales", b.impuestosLaborales], ["Deuda de largo plazo", b.deudaLP],
    ["Patrimonio", b.patrimonio],
  ];
  const cuadra = balanceCuadra(b);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">Balance general al <strong>{formatoDia(b.corte)}</strong>:</p>
      <div className="grid gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2">
        {filas.map(([n, v]) => (
          <div key={n} className="flex justify-between gap-2">
            <span className="text-slate-600">{n}</span>
            <span className="tabular-nums">{millones(v)}</span>
          </div>
        ))}
      </div>
      <p className={cn("rounded-lg px-3 py-2 text-sm", cuadra ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
        Activo {millones(t.activoTotal)} · Pasivo + patrimonio {millones(t.pasivoTotal + b.patrimonio)} ·{" "}
        {cuadra ? "cuadra." : `no cuadra por ${millones(t.diferencia)}: revíselo antes de guardar (puede corregirlo abajo después).`}
      </p>
      <button type="button" onClick={onGuardar} disabled={guardando} className={boton("primario", "sm")}>
        {guardando ? "Guardando…" : "Guardar este balance"}
      </button>
    </div>
  );
}
