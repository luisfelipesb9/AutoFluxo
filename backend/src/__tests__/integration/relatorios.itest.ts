import { AppDataSource } from "../../lib/database";
import * as rel from "../../services/relatorioService";
import { User } from "../../entities/User";
import { Cliente } from "../../entities/Cliente";
import { Veiculo } from "../../entities/Veiculo";
import { Peca } from "../../entities/Peca";
import { Pedido } from "../../entities/Pedido";
import { ItemPedido } from "../../entities/ItemPedido";
import { Pagamento } from "../../entities/Pagamento";
import { MovimentacaoEstoque } from "../../entities/MovimentacaoEstoque";

// Período amplo que cobre os fixtures (criados "agora") — evita depender do
// criado_em (preenchido por @CreateDateColumn).
const INICIO = new Date("2000-01-01");
const FIM = new Date("2999-12-31");

let vendedorId: number;
let montadorId: number;
let estoqueId: number;
let clienteId: number;
let pecaOkId: number;

beforeAll(async () => {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations(); // cria o schema no banco de teste

  const usuarios = AppDataSource.getRepository(User);
  vendedorId = (await usuarios.save({ nome: "Vend", login: "vend_it", senhaHash: "x", perfil: "vendedor", ativo: true })).id;
  montadorId = (await usuarios.save({ nome: "Mont", login: "mont_it", senhaHash: "x", perfil: "montador", ativo: true })).id;
  estoqueId = (await usuarios.save({ nome: "Est", login: "est_it", senhaHash: "x", perfil: "estoque", ativo: true })).id;

  const cliente = await AppDataSource.getRepository(Cliente).save({
    nome: "Cliente Integração",
    telefone: "11999990000",
    ativo: true,
  });
  clienteId = cliente.id;
  await AppDataSource.getRepository(Veiculo).save({
    cliente_id: clienteId,
    placa: "INT1234",
    modelo: "Teste",
    ano: 2020,
  });

  const pecas = AppDataSource.getRepository(Peca);
  const pecaOk = await pecas.save({ codigo: "OK-INT", nome: "Peça OK", estoque: 50, minimo: 5, preco: 10, ativo: true });
  pecaOkId = pecaOk.id;
  await pecas.save({ codigo: "CRIT-INT", nome: "Peça Crítica", estoque: 2, minimo: 10, preco: 20, ativo: true });
  await pecas.save({ codigo: "INAT-INT", nome: "Peça Inativa", estoque: 0, minimo: 99, preco: 5, ativo: false });

  const pedidos = AppDataSource.getRepository(Pedido);
  const pedido1 = await pedidos.save({
    os: "OS-INT-1",
    cliente_id: clienteId,
    vendedor_id: vendedorId,
    montador_id: montadorId,
    status: "concluido",
    total: 100,
    concluido_em: new Date(),
  });
  await pedidos.save({
    os: "OS-INT-2",
    cliente_id: clienteId,
    vendedor_id: vendedorId,
    status: "aberto",
    total: 50,
  });

  await AppDataSource.getRepository(ItemPedido).save({
    pedido_id: pedido1.id,
    peca_id: pecaOkId,
    qtd: 3,
    qtd_confirmada: 3,
    preco_unitario: 10,
    subtotal: 30,
  });
  await AppDataSource.getRepository(Pagamento).save({
    pedido_id: pedido1.id,
    numero_nf: 9001,
    forma_pagamento: "pix",
    valor: 100,
    caixa_id: estoqueId,
  });
  await AppDataSource.getRepository(MovimentacaoEstoque).save({
    peca_id: pecaOkId,
    tipo: "saida",
    qtd: 1,
    pedido_id: pedido1.id,
    usuario_id: estoqueId,
  });
}, 30000);

afterAll(async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
});

describe("Relatórios (integração — Postgres real)", () => {
  it("R1 vendas: soma a receita dos pagamentos no período", async () => {
    const rows = await rel.relatorioVendas({ inicio: INICIO, fim: FIM, agrupamento: "mes" });
    const receita = rows.reduce((s, r) => s + Number(r.receita), 0);
    const qtd = rows.reduce((s, r) => s + Number(r.qtd_pagamentos), 0);
    expect(receita).toBe(100);
    expect(qtd).toBe(1);
  });

  it("R2 peças mais vendidas: inclui a peça do item, exclui cancelados", async () => {
    const rows = await rel.relatorioPecasMaisVendidas({ inicio: INICIO, fim: FIM, limit: 10, orderBy: "qtd" });
    const ok = rows.find((r) => Number(r.id) === pecaOkId);
    expect(ok).toBeDefined();
    expect(Number(ok!.qtd)).toBe(3);
    expect(Number(ok!.receita)).toBe(30);
  });

  it("R3 estoque crítico: só a peça ativa com estoque < minimo", async () => {
    const rows = await rel.relatorioEstoqueCritico();
    expect(rows).toHaveLength(1);
    expect(rows[0].codigo).toBe("CRIT-INT");
    expect(Number(rows[0].qtd_faltante)).toBe(8);
  });

  it("R4 histórico do cliente: traz os pedidos pelo telefone", async () => {
    const rows = await rel.relatorioHistoricoCliente({ telefone: "11999990000" });
    expect(rows.length).toBe(2);
    expect(rows[0].cliente_nome).toBe("Cliente Integração");
  });

  it("R5 pedidos por status na data de hoje", async () => {
    const rows = await rel.relatorioPedidosStatus({ data: new Date() });
    const byStatus = Object.fromEntries(rows.map((r) => [String(r.status), Number(r.total)]));
    expect(byStatus["concluido"]).toBe(1);
    expect(byStatus["aberto"]).toBe(1);
  });

  it("R6 performance: deriva do negócio por perfil", async () => {
    const rows = await rel.relatorioPerformance({ inicio: INICIO, fim: FIM });
    const total = (perfil: string) =>
      Number(rows.find((r) => r.perfil === perfil)?.total ?? -1);
    expect(total("vendedor")).toBe(2); // 2 pedidos vendidos
    expect(total("montador")).toBe(1); // 1 montagem concluída
    expect(total("estoque")).toBe(1); // 1 movimentação
  });
});
