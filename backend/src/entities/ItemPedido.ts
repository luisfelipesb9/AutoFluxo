import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Pedido } from "./Pedido";
import { Peca } from "./Peca";
import { numericTransformer } from "./transformers";

@Entity("itens_pedido")
export class ItemPedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  pedido_id!: number;

  @Column()
  peca_id!: number;

  @Column({ type: "int" })
  qtd!: number;

  @Column({ type: "int", nullable: true })
  qtd_confirmada?: number;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  preco_unitario!: number;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  subtotal!: number;

  @ManyToOne(() => Pedido, (p) => p.itens, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pedido_id" })
  pedido!: Pedido;

  @ManyToOne(() => Peca)
  @JoinColumn({ name: "peca_id" })
  peca!: Peca;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;
}
