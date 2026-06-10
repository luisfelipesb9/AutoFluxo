// Domain enums shared across entities, services, and validation (Zod).
// Status / forma_pagamento / tipo columns are stored as `varchar` (not Postgres
// enums) for flexibility; these TS enums + Zod provide type-safety at runtime.

export enum PedidoStatus {
  ABERTO = "aberto",
  PAGO = "pago",
  EM_SEPARACAO = "em_separacao",
  LIBERADO = "liberado",
  EM_MONTAGEM = "em_montagem",
  CONCLUIDO = "concluido",
  CANCELADO = "cancelado",
  DEVOLVIDO_CAIXA = "devolvido_caixa",
}

export enum PerfilUsuario {
  ADMIN = "admin",
  VENDEDOR = "vendedor",
  CAIXA = "caixa",
  ESTOQUE = "estoque",
  MONTADOR = "montador",
}

export enum FormaPagamento {
  DINHEIRO = "dinheiro",
  PIX = "pix",
  CARTAO_DEBITO = "cartao_debito",
  CARTAO_CREDITO = "cartao_credito",
}

export enum TipoMovimentacao {
  SAIDA = "saida",
  ENTRADA = "entrada",
  AJUSTE = "ajuste",
}

// String-literal types (handy for function signatures / discriminated unions).
export type PedidoStatusValue = `${PedidoStatus}`;
export type PerfilUsuarioValue = `${PerfilUsuario}`;
export type FormaPagamentoValue = `${FormaPagamento}`;
export type TipoMovimentacaoValue = `${TipoMovimentacao}`;
