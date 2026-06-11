import { numericTransformer } from "../../../entities/transformers";

/**
 * O numericTransformer garante que colunas numeric/decimal (que o driver
 * Postgres devolve como string) virem `number` na leitura, evitando bugs de
 * concatenação em cálculos monetários. A escrita é passthrough.
 */
describe("numericTransformer", () => {
  describe("from (DB -> app)", () => {
    it("converte string numérica para number preservando casas decimais", () => {
      expect(numericTransformer.from("10.50")).toBe(10.5);
      expect(numericTransformer.from("0")).toBe(0);
      expect(numericTransformer.from("1234.99")).toBe(1234.99);
    });

    it("não concatena: '10' e '5' viram números somáveis", () => {
      const a = numericTransformer.from("10") as number;
      const b = numericTransformer.from("5") as number;
      expect(a + b).toBe(15);
    });

    it("repassa null e undefined sem converter (não vira 0/NaN)", () => {
      expect(numericTransformer.from(null)).toBeNull();
      expect(numericTransformer.from(undefined)).toBeUndefined();
    });
  });

  describe("to (app -> DB)", () => {
    it("é passthrough do valor recebido", () => {
      expect(numericTransformer.to(10.5)).toBe(10.5);
      expect(numericTransformer.to(0)).toBe(0);
      expect(numericTransformer.to(null)).toBeNull();
      expect(numericTransformer.to(undefined)).toBeUndefined();
    });
  });
});
