import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePecasTable1706000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "pecas",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "codigo",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "nome",
            type: "varchar",
            length: "150",
            isNullable: false,
          },
          {
            name: "estoque",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "minimo",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "preco",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: "ativo",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "criado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "atualizado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.query(
      "CREATE UNIQUE INDEX idx_pecas_codigo ON pecas(codigo)"
    );
    await queryRunner.query(
      "ALTER TABLE pecas ADD CONSTRAINT chk_pecas_estoque_nonneg CHECK (estoque >= 0)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("pecas");
  }
}
