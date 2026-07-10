import { describe, it, expect } from "vitest";
import { editarTenantSchema } from "./tenants";

describe("editarTenantSchema", () => {
  it("acepta un PATCH parcial de un solo módulo", () => {
    // Regresión: z.record(z.enum(...), ...) exige las 4 claves presentes;
    // un toggle real desde la UI solo manda el módulo que cambió.
    const r = editarTenantSchema.parse({ modulos: { expedientes: true } });
    expect(r.modulos).toEqual({ expedientes: true });
  });

  it("acepta activo/plan/emailsActivos por separado", () => {
    expect(editarTenantSchema.parse({ activo: false }).activo).toBe(false);
    expect(editarTenantSchema.parse({ plan: "empresa" }).plan).toBe("empresa");
    expect(editarTenantSchema.parse({ emailsActivos: false }).emailsActivos).toBe(false);
  });

  it("rechaza un plan que no existe", () => {
    expect(() => editarTenantSchema.parse({ plan: "premium" })).toThrow();
  });

  it("rechaza una clave de módulo desconocida", () => {
    expect(() => editarTenantSchema.parse({ modulos: { inventado: true } })).toThrow();
  });

  it("acepta un objeto vacío (PATCH sin cambios)", () => {
    expect(editarTenantSchema.parse({})).toEqual({});
  });
});
