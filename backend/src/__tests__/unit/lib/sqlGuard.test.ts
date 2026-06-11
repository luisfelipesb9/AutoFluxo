import { assertSafeSelect, injectLimit } from "../../../lib/sqlGuard";
import { AppError } from "../../../lib/AppError";

describe("sqlGuard.assertSafeSelect", () => {
  it("aceita um SELECT simples", () => {
    expect(() => assertSafeSelect("SELECT * FROM pecas")).not.toThrow();
  });

  it("aceita SELECT com ponto-e-vírgula final", () => {
    expect(() => assertSafeSelect("SELECT 1;")).not.toThrow();
  });

  it.each([
    "DELETE FROM pedidos",
    "delete from pedidos where id = 1",
    "DROP TABLE pecas",
    "UPDATE pecas SET estoque = 0",
    "INSERT INTO pecas (id) VALUES (1)",
    "TRUNCATE pecas",
    "ALTER TABLE pecas ADD COLUNA x int",
    "CREATE TABLE y (z int)",
  ])("rejeita comando proibido: %s", (sql) => {
    expect(() => assertSafeSelect(sql)).toThrow(AppError);
  });

  it("erro de comando proibido é 400", () => {
    expect.assertions(1);
    try {
      assertSafeSelect("DELETE FROM pedidos");
    } catch (err) {
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("rejeita múltiplos comandos", () => {
    expect(() => assertSafeSelect("SELECT 1; SELECT 2")).toThrow(AppError);
    expect(() => assertSafeSelect("SELECT * FROM x; DELETE FROM y")).toThrow(
      AppError
    );
  });

  it("rejeita o que não começa com SELECT (inclui CTE WITH)", () => {
    expect(() =>
      assertSafeSelect("WITH t AS (SELECT 1) SELECT * FROM t")
    ).toThrow(AppError);
  });

  it.each([
    "SELECT senha FROM usuarios",
    'SELECT "senhaHash" FROM usuarios',
    "SELECT senha_hash FROM usuarios",
    "SELECT * FROM refresh_tokens",
    "SELECT token FROM refresh_tokens",
  ])("rejeita acesso a dados sensíveis: %s", (sql) => {
    expect(() => assertSafeSelect(sql)).toThrow(/sens/i);
  });
});

describe("sqlGuard.injectLimit", () => {
  it("injeta LIMIT quando ausente", () => {
    expect(injectLimit("SELECT * FROM pecas", 100)).toBe(
      "SELECT * FROM pecas LIMIT 100"
    );
  });

  it("não duplica LIMIT existente", () => {
    expect(injectLimit("SELECT * FROM pecas LIMIT 5", 100)).toBe(
      "SELECT * FROM pecas LIMIT 5"
    );
  });

  it("remove ponto-e-vírgula final antes de injetar", () => {
    expect(injectLimit("SELECT 1;", 100)).toBe("SELECT 1 LIMIT 100");
  });
});
