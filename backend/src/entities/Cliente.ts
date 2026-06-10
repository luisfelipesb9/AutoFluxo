import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Veiculo } from "./Veiculo";

@Entity("clientes")
export class Cliente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nome!: string;

  @Column()
  telefone!: string;

  @Column({ default: true })
  ativo!: boolean;

  @OneToMany(() => Veiculo, (v) => v.cliente)
  veiculos!: Veiculo[];

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizado_em!: Date;
}
