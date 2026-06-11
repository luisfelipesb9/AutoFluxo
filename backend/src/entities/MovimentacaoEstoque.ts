import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("movimentacao_estoque")
export class MovimentacaoEstoque {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  peca_id!: number;

  @Column()
  tipo!: string;

  @Column({ type: "int" })
  qtd!: number;

  @Column({ type: "int", nullable: true })
  pedido_id?: number;

  @Column({ type: "int", nullable: true })
  item_id?: number;

  @Column()
  usuario_id!: number;

  @Column({ type: "text", nullable: true })
  observacao?: string;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;
}
