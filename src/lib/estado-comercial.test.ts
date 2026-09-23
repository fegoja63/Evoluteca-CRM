import { describe, it, expect } from "vitest";
import { estadoComercial, ultimoMovimientoDe, type SenalesOportunidad } from "./estado-comercial";

// Fecha de referencia fija para que las pruebas no dependan del reloj real.
const AHORA = new Date("2026-09-15T12:00:00.000Z");
const UMBRAL = 14; // días sin movimiento para "estancada"

function haceDias(dias: number): string {
  return new Date(AHORA.getTime() - dias * 86_400_000).toISOString();
}
function enDias(dias: number): string {
  return new Date(AHORA.getTime() + dias * 86_400_000).toISOString();
}

// Oportunidad base "sana": activa, recién trabajada, sin fecha de cierre.
function base(over: Partial<SenalesOportunidad> = {}): SenalesOportunidad {
  return { etapa: "PROSPECTO", probabilidad: 50, ultimoMovimiento: haceDias(1), creadoEn: haceDias(30), fechaCierre: null, ...over };
}
const calc = (o: SenalesOportunidad) => estadoComercial(o, UMBRAL, AHORA);

describe("estadoComercial", () => {
  it("no aplica a negocios cerrados (Ganada/Perdida)", () => {
    expect(calc(base({ etapa: "GANADA" }))).toBeNull();
    expect(calc(base({ etapa: "PERDIDA" }))).toBeNull();
  });

  it("En riesgo cuando lleva ≥ el doble del umbral sin movimiento", () => {
    const e = calc(base({ ultimoMovimiento: haceDias(28) }));
    expect(e?.clave).toBe("riesgo");
    expect(e?.razon).toContain("28 días sin contacto");
    expect(e?.accionTipo).toBe("LLAMADA");
  });

  it("En riesgo cuando la fecha de cierre está vencida", () => {
    const e = calc(base({ ultimoMovimiento: haceDias(1), fechaCierre: enDias(-3) }));
    expect(e?.clave).toBe("riesgo");
    expect(e?.razon).toContain("Cierre vencido");
  });

  it("Requiere atención entre el umbral y su doble", () => {
    const e = calc(base({ ultimoMovimiento: haceDias(14) }));
    expect(e?.clave).toBe("atencion");
    expect(e?.razon).toContain("14 días sin contacto");
  });

  it("Requiere atención cuando cierra en 7 días o menos", () => {
    const e = calc(base({ ultimoMovimiento: haceDias(1), fechaCierre: enDias(5) }));
    expect(e?.clave).toBe("atencion");
    expect(e?.razon).toContain("Cierra en 5 días");
  });

  it("Requiere atención con mensaje especial si cierra hoy", () => {
    const e = calc(base({ ultimoMovimiento: haceDias(1), fechaCierre: enDias(0) }));
    expect(e?.clave).toBe("atencion");
    expect(e?.razon).toBe("La fecha de cierre es hoy");
  });

  it("Alta intención en etapa avanzada con probabilidad ≥ 70", () => {
    const e = calc(base({ etapa: "NEGOCIACION", probabilidad: 75, ultimoMovimiento: haceDias(2) }));
    expect(e?.clave).toBe("alta");
    expect(e?.razon).toContain("75%");
  });

  it("NO es alta intención con probabilidad 69 (queda En marcha)", () => {
    const e = calc(base({ etapa: "PROPUESTA", probabilidad: 69, ultimoMovimiento: haceDias(2) }));
    expect(e?.clave).toBe("marcha");
  });

  it("En marcha por defecto: activa, reciente y sin alarmas", () => {
    const e = calc(base());
    expect(e?.clave).toBe("marcha");
    expect(e?.accionTipo).toBe("TAREA");
  });

  it("El riesgo por estancamiento manda sobre la alta intención", () => {
    // Etapa avanzada y probabilidad alta, pero 30 días sin contacto.
    const e = calc(base({ etapa: "NEGOCIACION", probabilidad: 90, ultimoMovimiento: haceDias(30) }));
    expect(e?.clave).toBe("riesgo");
  });

  it("Un umbral inválido (0) cae al default de 14 días", () => {
    const o = base({ ultimoMovimiento: haceDias(15) });
    expect(estadoComercial(o, 0, AHORA)?.clave).toBe("atencion");
  });
});

describe("ultimoMovimientoDe", () => {
  it("toma la señal de vida más reciente entre creación, actividad y cambio de etapa", () => {
    const r = ultimoMovimientoDe({
      creadoEn: haceDias(30),
      actividades: [{ fecha: haceDias(3) }],
      cambiosEtapa: [{ creadoEn: haceDias(10) }],
    });
    expect(r.toISOString()).toBe(haceDias(3));
  });

  it("usa la creación cuando no hay actividades ni cambios de etapa", () => {
    const r = ultimoMovimientoDe({ creadoEn: haceDias(5) });
    expect(r.toISOString()).toBe(haceDias(5));
  });

  it("un correo reciente cuenta como última señal de vida", () => {
    const r = ultimoMovimientoDe({
      creadoEn: haceDias(40),
      actividades: [{ fecha: haceDias(35) }],
      correos: [{ fecha: haceDias(2) }],
    });
    expect(r.toISOString()).toBe(haceDias(2));
  });

  it("un correo reciente saca a un negocio de 'requiere atención' (deja de estar estancado)", () => {
    // 20 días sin movimiento (entre el umbral 14 y su doble 28) => atención.
    const o = base({ etapa: "PROPUESTA", ultimoMovimiento: haceDias(20) });
    expect(calc(o)?.clave).toBe("atencion");
    // Con un correo de hace 2 días, la última señal de vida es reciente.
    const um = ultimoMovimientoDe({ creadoEn: haceDias(60), correos: [{ fecha: haceDias(2) }] });
    expect(estadoComercial({ ...o, ultimoMovimiento: um }, UMBRAL, AHORA)?.clave).not.toBe("atencion");
  });

  it("una tarea agendada a futuro NO cuenta como movimiento", () => {
    const r = ultimoMovimientoDe({
      creadoEn: haceDias(40),
      actividades: [{ fecha: enDias(10) }, { fecha: haceDias(20) }],
    }, AHORA);
    expect(r.toISOString()).toBe(haceDias(20));
  });

  it("un negocio sin contacto sigue estancado aunque tenga una tarea futura agendada", () => {
    const um = ultimoMovimientoDe({ creadoEn: haceDias(60), actividades: [{ fecha: enDias(5) }] }, AHORA);
    expect(calc(base({ ultimoMovimiento: um }))?.clave).toBe("riesgo");
  });
});
