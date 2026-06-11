import { toCsv } from "../../../lib/csv";

describe("toCsv", () => {
  it("retorna string vazia para lista vazia", () => {
    expect(toCsv([])).toBe("");
  });

  it("gera cabeçalho a partir das chaves + linhas", () => {
    expect(toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }])).toBe("a,b\n1,x\n2,y");
  });

  it("escapa vírgulas e aspas", () => {
    expect(toCsv([{ nome: 'Peça, "A"' }])).toBe('nome\n"Peça, ""A"""');
  });

  it("serializa null/undefined como célula vazia", () => {
    expect(toCsv([{ a: null, b: undefined, c: 3 }])).toBe("a,b,c\n,,3");
  });
});
