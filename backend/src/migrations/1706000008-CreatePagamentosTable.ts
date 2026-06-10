import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePagamentosTable1706000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE SEQUENCE IF NOT EXISTS pagamento_nf_seq");

    await queryRunner.createTable(
      new Table({
        name: "pagamentos",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "pedido_id",
            type: "int",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "numero_nf",
            type: "int",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "forma_pagamento",
            type: "varchar",
            length: "30",
            isNullable: false,
          },
          {
            name: "valor",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: "caixa_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "criado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      "pagamentos",
      new TableForeignKey({
        columnNames: ["pedido_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "pedidos",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "pagamentos",
      new TableForeignKey({
        columnNames: ["caixa_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
      })
    );

    await queryRunner.query(
      "CREATE UNIQUE INDEX idx_pagamentos_pedido_id ON pagamentos(pedido_id)"
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX idx_pagamentos_numero_nf ON pagamentos(numero_nf)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("pagamentos");
    await queryRunner.query("DROP SEQUENCE IF EXISTS pagamento_nf_seq");
  }
}
