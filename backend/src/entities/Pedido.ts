import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Cliente } from "./Cliente";
import { Veiculo } from "./Veiculo";
import { ItemPedido } from "./ItemPedido";
import { numericTransformer } from "./transformers";

@Entity("pedidos")
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  os!: string;

  @Column()
  cliente_id!: number;

  @Column({ type: "int", nullable: true })
  veiculo_id?: number;

  @Column()
  vendedor_id!: number;

  @Column({ default: "aberto" })
  status!: string;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  total!: number;

  @Column({ nullable: true })
  forma_pagamento?: string;

  @Column({ type: "int", nullable: true })
  caixa_id?: number;

  @Column({ type: "int", nullable: true })
  montador_id?: number;

  @Column({ type: "timestamp", nullable: true })
  pago_em?: Date;

  @Column({ type: "timestamp", nullable: true })
  montagem_iniciada_em?: Date;

  @Column({ type: "timestamp", nullable: true })
  concluido_em?: Date;

  @Column({ type: "timestamp", nullable: true })
  cancelado_em?: Date;

  @Column({ type: "text", nullable: true })
  motivo_cancelamento?: string;

  @Column({ type: "text", nullable: true })
  motivo_devolucao?: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: "cliente_id" })
  cliente!: Cliente;

  @ManyToOne(() => Veiculo, { nullable: true })
  @JoinColumn({ name: "veiculo_id" })
  veiculo?: Veiculo;

  @OneToMany(() => ItemPedido, (i) => i.pedido)
  itens!: ItemPedido[];

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizado_em!: Date;
}
