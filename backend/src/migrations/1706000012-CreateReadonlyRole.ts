import { MigrationInterface, QueryRunner } from "typeorm";

const RO_ROLE = "autofluxo_readonly";

// Tabelas liberadas integralmente (somente leitura) para a busca IA.
const SELECT_TABLES = [
  "pecas",
  "clientes",
  "veiculos",
  "pedidos",
  "itens_pedido",
  "pagamentos",
  "movimentacao_estoque",
  "logs_acao",
];

// usuarios: SELECT só nas colunas não-sensíveis (sem senhaHash). criadoEm /
// atualizadoEm são camelCase no banco — exigem aspas duplas.
const USUARIOS_COLS = `id, nome, login, perfil, ativo, "criadoEm", "atualizadoEm"`;

/**
 * Cria a role Postgres read-only usada pela busca IA (defesa em profundidade):
 * mesmo que o sqlGuard seja evadido, a conexão só enxerga SELECT nas tabelas/
 * colunas liberadas — nunca senhaHash nem refresh_tokens, nunca escrita.
 * Idempotente: cria a role ou só atualiza a senha; os GRANTs são repetíveis.
 */
export class CreateReadonlyRole1706000012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const senha = process.env.DB_READONLY_PASSWORD;
    const db = process.env.DB_NAME;

    if (!senha) {
      // eslint-disable-next-line no-console
      console.warn(
        `[migration] DB_READONLY_PASSWORD ausente — role ${RO_ROLE} NÃO criada. ` +
          `Defina a env e rode a migration novamente (a busca IA fica 503 até lá).`
      );
      return;
    }
    // A senha é interpolada na DDL (CREATE ROLE não aceita parâmetro). Exigimos
    // alfanumérico para eliminar qualquer risco de injeção via essa string.
    if (!/^[A-Za-z0-9]+$/.test(senha)) {
      throw new Error(
        "DB_READONLY_PASSWORD deve ser alfanumérica (ex.: openssl rand -hex 24)."
      );
    }
    if (!db) {
      throw new Error("DB_NAME ausente — necessário para GRANT CONNECT.");
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RO_ROLE}') THEN
          CREATE ROLE ${RO_ROLE} LOGIN PASSWORD '${senha}';
        ELSE
          ALTER ROLE ${RO_ROLE} WITH LOGIN PASSWORD '${senha}';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`GRANT CONNECT ON DATABASE "${db}" TO ${RO_ROLE}`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO ${RO_ROLE}`);
    await queryRunner.query(
      `GRANT SELECT ON ${SELECT_TABLES.join(", ")} TO ${RO_ROLE}`
    );
    await queryRunner.query(
      `GRANT SELECT (${USUARIOS_COLS}) ON usuarios TO ${RO_ROLE}`
    );

    // Defensivo: garante ausência de qualquer privilégio em tabelas sensíveis.
    await queryRunner.query(`REVOKE ALL ON refresh_tokens FROM ${RO_ROLE}`);
    await queryRunner.query(`REVOKE ALL ON migrations FROM ${RO_ROLE}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = process.env.DB_NAME ?? "";
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RO_ROLE}') THEN
          EXECUTE 'REVOKE ALL ON DATABASE "${db}" FROM ${RO_ROLE}';
          EXECUTE 'DROP OWNED BY ${RO_ROLE}';
          EXECUTE 'DROP ROLE ${RO_ROLE}';
        END IF;
      END
      $$;
    `);
  }
}
