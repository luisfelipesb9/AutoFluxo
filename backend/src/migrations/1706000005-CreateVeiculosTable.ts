import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateVeiculosTable1706000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "veiculos",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "cliente_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "placa",
            type: "varchar",
            length: "10",
            isNullable: false,
          },
          {
            name: "modelo",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "ano",
            type: "int",
            isNullable: true,
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
      "veiculos",
      new TableForeignKey({
        columnNames: ["cliente_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "clientes",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.query("CREATE INDEX idx_veiculos_placa ON veiculos(placa)");
    await queryRunner.query(
      "CREATE INDEX idx_veiculos_cliente_id ON veiculos(cliente_id)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("veiculos");
  }
}
