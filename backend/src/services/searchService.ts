import { getReadOnlyDataSource } from "../lib/readonlyDatabase";
import { AppError } from "../lib/AppError";
import { assertSafeSelect, injectLimit } from "../lib/sqlGuard";
import { registrarLog } from "./logService";
import { sanitizeDetalhe } from "../lib/requestContext";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import logger from "../lib/logger";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 8000;
const STMT_TIMEOUT_MS = 5000;
const MAX_ROWS = 100;
const ERRO_IA = "Busca por IA indisponível no momento.";

// Schema resumido exposto ao modelo. Colunas sensíveis (senhaHash, tokens) são
// omitidas de propósito; a barreira real é o sqlGuard.
const SYSTEM_PROMPT = `Você traduz perguntas em português para UMA única consulta SQL de PostgreSQL.

Esquema disponível (use somente estas tabelas e colunas):
- usuarios(id, nome, login, perfil, ativo, "criadoEm")
- pecas(id, codigo, nome, estoque, minimo, preco, ativo, criado_em)
- clientes(id, nome, telefone, ativo, criado_em)
- veiculos(id, cliente_id, placa, modelo, ano, criado_em)
- pedidos(id, os, cliente_id, veiculo_id, vendedor_id, status, total, forma_pagamento, caixa_id, montador_id, pago_em, concluido_em, cancelado_em, criado_em)
- itens_pedido(id, pedido_id, peca_id, qtd, qtd_confirmada, preco_unitario, subtotal, criado_em)
- pagamentos(id, pedido_id, numero_nf, forma_pagamento, valor, caixa_id, criado_em)
- movimentacao_estoque(id, peca_id, tipo, qtd, pedido_id, usuario_id, criado_em)
- logs_acao(id, usuario_id, acao, entidade, entidade_id, criado_em)

Valores de enum:
- pedidos.status: aberto, pago, em_separacao, liberado, em_montagem, concluido, cancelado, devolvido_caixa
- usuarios.perfil: admin, vendedor, caixa, estoque, montador
- forma_pagamento: dinheiro, pix, cartao_debito, cartao_credito

Regras OBRIGATÓRIAS:
- Gere APENAS um comando SELECT. Nunca INSERT, UPDATE, DELETE, DROP ou qualquer DDL.
- Nunca acesse colunas de senha, hash ou token.
- Colunas em camelCase (ex.: "criadoEm") exigem aspas duplas.
- Responda SOMENTE com o SQL, em uma linha, sem markdown e sem explicação.`;

export interface SearchResult {
  sql: string;
  rows: unknown[];
}

/** Chama a OpenAI e devolve o conteúdo bruto da resposta (o SQL). */
const gerarSql = async (pergunta: string): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(503, ERRO_IA);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: pergunta },
        ],
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "OpenAI retornou erro HTTP");
      throw new AppError(503, ERRO_IA);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(503, ERRO_IA);
    }
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    // AbortError (timeout) ou falha de rede.
    logger.error({ error: (error as Error).message }, "Falha ao chamar OpenAI");
    throw new AppError(503, ERRO_IA);
  } finally {
    clearTimeout(timer);
  }
};

const limparSql = (raw: string): string =>
  raw.replace(/```sql/gi, "").replace(/```/g, "").trim();

/**
 * Converte uma pergunta em português → SQL via OpenAI, valida (somente SELECT,
 * sem comandos perigosos nem colunas sensíveis), injeta LIMIT 100 e executa
 * numa transação somente-leitura.
 */
export const buscarPorLinguagemNatural = async (
  pergunta: string
): Promise<SearchResult> => {
  // Garante a infra read-only ANTES de gastar a chamada à OpenAI (fail-closed):
  // sem a role/senha, a busca já responde 503 aqui.
  const dataSource = await getReadOnlyDataSource();

  const bruto = await gerarSql(pergunta);
  const limpo = limparSql(bruto);

  assertSafeSelect(limpo);
  const sql = injectLimit(limpo, MAX_ROWS);

  let rows: unknown[];
  try {
    rows = await dataSource.transaction(async (manager) => {
      await manager.query("SET TRANSACTION READ ONLY");
      // A role read-only não escreve, mas poderia varrer tabelas grandes —
      // cancela a consulta após STMT_TIMEOUT_MS.
      await manager.query(`SET LOCAL statement_timeout = ${STMT_TIMEOUT_MS}`);
      return manager.query(sql);
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.warn({ error: message, sql }, "Falha ao executar SQL gerado");
    // 57014 = query_canceled (estouro do statement_timeout).
    if (/statement timeout|canceling statement/i.test(message)) {
      throw new AppError(400, "A consulta gerada excedeu o tempo limite.");
    }
    throw new AppError(400, "Não foi possível executar a consulta gerada.");
  }

  await registrarLog({
    acao: AuditAction.SEARCH_NL,
    entidade: AuditEntity.SEARCH,
    detalhe: sanitizeDetalhe({ pergunta, sql }),
  });

  return { sql, rows };
};
