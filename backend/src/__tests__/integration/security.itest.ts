import request from "supertest";
import jwt from "jsonwebtoken";
import type { Application } from "express";
import { createApp } from "../../server";
import { AppDataSource } from "../../lib/database";
import { User } from "../../entities/User";
import { Cliente } from "../../entities/Cliente";
import { Pedido } from "../../entities/Pedido";
import { LogAcao } from "../../entities/LogAcao";
import { generateAccessToken } from "../../services/authService";
import { hashPassword } from "../../services/userService";
import { assertSafeSelect } from "../../lib/sqlGuard";
import { AppError } from "../../lib/AppError";

/**
 * Bateria de segurança (integração HTTP — app real + Postgres).
 *
 * Exercita adversarialmente o checklist de pré-entrega: SQL Injection, bypass de
 * autorização (401/403), guards do Módulo IA, ausência de senha em texto puro e a
 * verificação dos critérios de auditoria (logs_acao). Roda contra o app montado
 * por `createApp()` (sem `app.listen`), via supertest.
 *
 * Reproduzir:  set -a && . ./.env && set +a && npm run test:integration
 */

const XRW = "XMLHttpRequest"; // header anti-CSRF exigido pelas rotas /api protegidas
const SENHA = "senha123";

let app: Application;
let adminUser: User;
let vendedorUser: User;
let montadorUser: User;
let adminToken: string;
let vendedorToken: string;
let montadorToken: string;

/** GET autenticado já com o header anti-CSRF e o Bearer token. */
const authGet = (url: string, token: string) =>
  request(app)
    .get(url)
    .set("X-Requested-With", XRW)
    .set("Authorization", `Bearer ${token}`);

/** POST autenticado já com o header anti-CSRF e o Bearer token. */
const authPost = (url: string, token: string) =>
  request(app)
    .post(url)
    .set("X-Requested-With", XRW)
    .set("Authorization", `Bearer ${token}`);

beforeAll(async () => {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations(); // cria o schema no banco de teste

  app = createApp();

  const usuarios = AppDataSource.getRepository(User);
  const senhaHash = await hashPassword(SENHA);
  adminUser = await usuarios.save(
    usuarios.create({ nome: "Admin Sec", login: "admin_sec", senhaHash, perfil: "admin", ativo: true })
  );
  vendedorUser = await usuarios.save(
    usuarios.create({ nome: "Vend Sec", login: "vend_sec", senhaHash, perfil: "vendedor", ativo: true })
  );
  montadorUser = await usuarios.save(
    usuarios.create({ nome: "Mont Sec", login: "mont_sec", senhaHash, perfil: "montador", ativo: true })
  );

  adminToken = generateAccessToken(adminUser);
  vendedorToken = generateAccessToken(vendedorUser);
  montadorToken = generateAccessToken(montadorUser);

  // Fixtures para os testes de SQL Injection.
  const clientes = AppDataSource.getRepository(Cliente);
  const cliente = await clientes.save(
    clientes.create({ nome: "SEGTEST Cliente", telefone: "11900000001", ativo: true })
  );
  const pedidos = AppDataSource.getRepository(Pedido);
  await pedidos.save(
    pedidos.create({
      os: "OS-SEC-1",
      cliente_id: cliente.id,
      vendedor_id: vendedorUser.id,
      status: "aberto",
      total: 10,
    })
  );
}, 30000);

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    // Remove os fixtures para não poluir outras suítes que compartilham o banco
    // `autofluxo_test` (ex.: o relatório "pedidos por status na data de hoje").
    await AppDataSource.getRepository(Pedido).delete({ os: "OS-SEC-1" });
    await AppDataSource.getRepository(Cliente).delete({ nome: "SEGTEST Cliente" });
    await AppDataSource.destroy();
  }
});

// ---------------------------------------------------------------------------
// SQL Injection — entradas de busca tratadas como literais (prepared statements)
// ---------------------------------------------------------------------------
describe("SQL Injection", () => {
  it("`' OR 1=1 --` na busca de clientes não burla o filtro (literal, não bypass)", async () => {
    // A busca legítima encontra o cliente semeado...
    const normal = await authGet("/api/clientes", adminToken).query({ q: "SEGTEST" });
    expect(normal.status).toBe(200);
    const encontrados = normal.body as Array<{ nome: string }>;
    expect(encontrados.some((c) => c.nome === "SEGTEST Cliente")).toBe(true);

    // ...mas o payload de injeção é casado como string literal → nenhum registro.
    const injection = await authGet("/api/clientes", adminToken).query({ q: "' OR 1=1 --" });
    expect(injection.status).toBe(200);
    expect(injection.body).toHaveLength(0);
  });

  it("`'; DROP TABLE clientes; --` não altera o schema", async () => {
    const repo = AppDataSource.getRepository(Cliente);
    const antes = await repo.count();

    const res = await authGet("/api/clientes", adminToken).query({ q: "'; DROP TABLE clientes; --" });
    expect(res.status).toBe(200);

    const depois = await repo.count(); // lançaria se a tabela tivesse sido removida
    expect(depois).toBe(antes);
    expect(depois).toBeGreaterThanOrEqual(1);
  });

  it("injeção no filtro de status de pedidos é parametrizada (retorna vazio, não vaza tudo)", async () => {
    // `status` é bind param: o pedido semeado ("aberto") só aparece na busca exata.
    const exato = await authGet("/api/pedidos", adminToken).query({ status: "aberto" });
    expect(exato.status).toBe(200);
    expect((exato.body as unknown[]).length).toBeGreaterThanOrEqual(1);

    const injection = await authGet("/api/pedidos", adminToken).query({ status: "' OR '1'='1" });
    expect(injection.status).toBe(200);
    expect(injection.body).toHaveLength(0); // bypass retornaria o(s) pedido(s)
  });
});

// ---------------------------------------------------------------------------
// Bypass de autorização — RBAC (403), autenticação (401) e defesa anti-CSRF (400)
// ---------------------------------------------------------------------------
describe("Bypass de autorização", () => {
  it("vendedor em GET /relatorios → 403", async () => {
    const res = await authGet("/api/relatorios/vendas", vendedorToken).query({
      inicio: "2024-01-01",
      fim: "2024-12-31",
      agrupamento: "mes",
    });
    expect(res.status).toBe(403);
  });

  it("montador em POST /pedidos → 403", async () => {
    const res = await authPost("/api/pedidos", montadorToken).send({
      cliente_id: 1,
      itens: [{ peca_id: 1, qtd: 1 }],
    });
    expect(res.status).toBe(403);
  });

  it("token expirado → 401", async () => {
    const expirado = jwt.sign(
      { id: adminUser.id, login: adminUser.login, perfil: adminUser.perfil },
      process.env.JWT_SECRET as string,
      { algorithm: "HS256", expiresIn: -10 }
    );
    const res = await authGet("/api/pedidos", expirado);
    expect(res.status).toBe(401);
  });

  it("requisição sem token → 401", async () => {
    const res = await request(app).get("/api/pedidos").set("X-Requested-With", XRW);
    expect(res.status).toBe(401);
  });

  it("requisição sem o header anti-CSRF → 400", async () => {
    const res = await request(app)
      .get("/api/pedidos")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Módulo IA — guard de SQL (ponto de enforcement do NL→SQL)
// ---------------------------------------------------------------------------
describe("Módulo IA — guard de consulta", () => {
  const statusDe = (fn: () => void): number => {
    try {
      fn();
    } catch (err) {
      return (err as AppError).statusCode;
    }
    throw new Error("esperava AppError, mas nada foi lançado");
  };

  it("bloqueia comando de escrita (DELETE) → 400", () => {
    expect(statusDe(() => assertSafeSelect("DELETE FROM pedidos"))).toBe(400);
  });

  it("bloqueia referência a dados sensíveis (senha_hash) → 400", () => {
    expect(statusDe(() => assertSafeSelect("SELECT senha_hash FROM usuarios"))).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Senhas — armazenadas como hash bcrypt, nunca em texto puro
// ---------------------------------------------------------------------------
describe("Armazenamento de senhas", () => {
  it("senhaHash no banco é bcrypt e não é a senha em claro", async () => {
    const user = await AppDataSource.getRepository(User).findOneOrFail({
      where: { login: "admin_sec" },
    });
    expect(user.senhaHash).toMatch(/^\$2[aby]\$/); // formato bcrypt
    expect(user.senhaHash).not.toBe(SENHA);
  });
});

// ---------------------------------------------------------------------------
// Auditoria — verificação dos critérios do middleware de logs (Ticket 1)
// ---------------------------------------------------------------------------
describe("Auditoria (logs_acao)", () => {
  it("login falho grava usuario_id=null + IP e não vaza a senha", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ login: "admin_sec", senha: "senhaerrada" });
    expect(res.status).toBe(401);

    const log = await AppDataSource.getRepository(LogAcao).findOneOrFail({
      where: { acao: "login.falha" },
      order: { id: "DESC" },
    });
    expect(log.usuario_id ?? null).toBeNull();
    expect(log.ip).toBeTruthy();
    expect(log.detalhe ?? "").not.toContain("senhaerrada");
  });

  it("login bem-sucedido grava usuario_id do usuário", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ login: "admin_sec", senha: SENHA });
    expect(res.status).toBe(200);

    const log = await AppDataSource.getRepository(LogAcao).findOneOrFail({
      where: { acao: "login.sucesso" },
      order: { id: "DESC" },
    });
    expect(log.usuario_id).toBe(adminUser.id);
  });

  it("consulta de logs: admin → 200 paginado; vendedor → 403", async () => {
    const ok = await authGet("/api/z_admin/logs", adminToken).query({ page: 1, pageSize: 10 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ page: 1, pageSize: 10 });
    expect(Array.isArray((ok.body as { data: unknown[] }).data)).toBe(true);
    expect(typeof (ok.body as { total: number }).total).toBe("number");

    const negado = await authGet("/api/z_admin/logs", vendedorToken);
    expect(negado.status).toBe(403);
  });
});
