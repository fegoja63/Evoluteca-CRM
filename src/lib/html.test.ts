import { describe, it, expect } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("neutraliza una etiqueta script", () => {
    expect(escapeHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });
  it("no toca texto normal con acentos", () => {
    expect(escapeHtml("Reunión con José Peña")).toBe("Reunión con José Peña");
  });
});
