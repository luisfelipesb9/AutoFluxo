import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIpToLogsAcao1706000011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "logs_acao",
      new TableColumn({
        name: "ip",
        type: "varchar",
        length: "45",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("logs_acao", "ip");
  }
}
