import { describe, expect, it } from "vitest";
import { chequearPropuesta, limpiarRevisionIA, margenDe, margenPromedio, type DatosRevision } from "./revision-propuesta";

// Viernes 9 de octubre de 2026, 10:00 a. m. en Bogotá (UTC-5).
const AHORA = new Date("2026-10-09T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`); // fecha de calendario (medianoche UTC)

const base: DatosRevision = {
  modalidad: "FEE_FIJO",
  items: [{ descripcion: "Plan Pro", cantidad: 1, precioUnit: 1000 }],
  fechaValidez: dia("2026-10-30"),
  emailDestino: "compras@cliente.co",
};
const titulos = (d: DatosRevision) => chequearPropuesta(d, AHORA).map(c => `${c.nivel}: ${c.titulo}`);

describe("chequearPropuesta", () => {
  it("una propuesta completa y sin costo registrado no tiene observaciones", () => {
    expect(chequearPropuesta(base, AHORA)).toEqual([]);
  });

  it("alerta si el total es cero", () => {
    expect(titulos({ ...base, items: [] })).toContain("alerta: La propuesta no tiene valor");
  });

  it("alerta los ítems en cero aunque el total no lo sea", () => {
    const r = titulos({ ...base, items: [...base.items!, { descripcion: "Cortesía", cantidad: 1, precioUnit: 0 }] });
    expect(r).toContain("alerta: Un ítem va sin precio");
  });

  it("detecta el descuento frente al catálogo sin importar mayúsculas ni espacios", () => {
    const catalogo = [{ nombre: "  plan   PRO ", precioBase: 1250 }];
    expect(titulos({ ...base, catalogo })).toEqual(['alerta: Descuento de 20% en "Plan Pro"']);
    expect(titulos({ ...base, catalogo: [{ nombre: "Plan Pro", precioBase: 1050 }] })).toEqual(['aviso: Descuento de 5% en "Plan Pro"']);
    expect(titulos({ ...base, catalogo: [{ nombre: "Plan Pro", precioBase: 900 }] })).toEqual([]);
  });

  it("margen: pierde dinero, bajo frente al promedio, o en línea", () => {
    expect(titulos({ ...base, costo: 1200 })).toEqual(["alerta: Esta propuesta pierde dinero"]);
    expect(titulos({ ...base, costo: 900, margenPromedio: 0.3 })).toEqual(["aviso: Margen bajo: 10%"]);
    expect(titulos({ ...base, costo: 750, margenPromedio: 0.3 })).toEqual(["ok: Margen de 25%"]);
    expect(titulos({ ...base, costo: 750 })).toEqual(["ok: Margen de 25%"]);
  });

  it("vigencia: sin fecha, vencida, o vigente hoy", () => {
    expect(titulos({ ...base, fechaValidez: null })).toEqual(["aviso: Sin fecha de vigencia"]);
    expect(titulos({ ...base, fechaValidez: dia("2026-10-08") })).toEqual(["alerta: La vigencia ya venció"]);
    expect(titulos({ ...base, fechaValidez: dia("2026-10-09") })).toEqual([]);
  });

  it("de noche en Bogotá (ya es otro día en UTC) la vigencia de hoy no ha vencido", () => {
    const noche = new Date("2026-10-10T03:30:00Z"); // 9 oct, 10:30 p. m. Bogotá
    expect(chequearPropuesta({ ...base, fechaValidez: dia("2026-10-09") }, noche)).toEqual([]);
  });

  it("avisa si no hay correo del cliente", () => {
    expect(titulos({ ...base, emailDestino: "  " })).toEqual(["aviso: Sin correo del cliente"]);
  });

  it("en success fee no revisa ítems ni catálogo", () => {
    const d: DatosRevision = {
      ...base, modalidad: "SUCCESS_FEE", items: [], catalogo: [{ nombre: "Plan Pro", precioBase: 5000 }],
      lineasAhorro: [{ gastoBaseMensual: 5000, ahorroEstimadoMensual: 1000 }], porcentajeHonorarios: 30, horizonteMeses: 12,
    };
    expect(titulos(d)).toEqual([]);
  });
});

describe("margen", () => {
  it("margenDe exige costo y valor positivos", () => {
    expect(margenDe(1000, 600)).toBeCloseTo(0.4);
    expect(margenDe(1000, null)).toBeNull();
    expect(margenDe(0, 600)).toBeNull();
  });

  it("margenPromedio ignora los vacíos", () => {
    expect(margenPromedio([0.2, null, 0.4])).toBeCloseTo(0.3);
    expect(margenPromedio([null])).toBeNull();
  });
});

describe("limpiarRevisionIA", () => {
  it("recorta textos, quita observaciones vacías y deja máximo 4", () => {
    const o = (titulo: string) => ({ tipo: "mejora" as const, titulo, detalle: " d " });
    const r = limpiarRevisionIA({ veredicto: "AJUSTAR", resumen: " ok ", observaciones: [o(" a "), o(" "), o("b"), o("c"), o("d"), o("e")] });
    expect(r.resumen).toBe("ok");
    expect(r.observaciones.map(x => x.titulo)).toEqual(["a", "b", "c", "d"]);
    expect(r.observaciones[0].detalle).toBe("d");
  });
});
