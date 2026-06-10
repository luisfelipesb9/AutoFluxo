import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePedidosTable1706000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE SEQUENCE IF NOT EXISTS pedido_os_seq");

    await queryRunner.createTable(
      new Table({
        name: "pedidos",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "os",
            type: "varchar",
            length: "30",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "cliente_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "veiculo_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "vendedor_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "30",
            default: "'aberto'",
            isNullable: false,
          },
          {
            name: "total",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: "forma_pagamento",
            type: "varchar",
            length: "30",
            isNullable: true,
          },
          {
            name: "caixa_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "montador_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "pago_em",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "montagem_iniciada_em",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "concluido_em",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "cancelado_em",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "motivo_cancelamento",
            type: "text",
            isNullable: true,
          },
          {
            name: "motivo_devolucao",
            type: "text",
            isNullable: true,
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

    await queryRunner.createForeignKey(
      "pedidos",
      new TableForeignKey({
        columnNames: ["cliente_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "clientes",
      })
    );

    await queryRunner.createForeignKey(
      "pedidos",
      new TableForeignKey({
        columnNames: ["veiculo_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "veiculos",
      })
    );

    await queryRunner.createForeignKey(
      "pedidos",
      new TableForeignKey({
        columnNames: ["vendedor_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
      })
    );

    await queryRunner.createForeignKey(
      "pedidos",
      new TableForeignKey({
        columnNames: ["caixa_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
      })
    );

    await queryRunner.createForeignKey(
      "pedidos",
      new TableForeignKey({
        columnNames: ["montador_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
      })
    );

    await queryRunner.query("CREATE UNIQUE INDEX idx_pedidos_os ON pedidos(os)");
    await queryRunner.query(
      "CREATE INDEX idx_pedidos_status ON pedidos(status)"
    );
    await queryRunner.query(
      "CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("pedidos");
    await queryRunner.query("DROP SEQUENCE IF EXISTS pedido_os_seq");
  }
}
