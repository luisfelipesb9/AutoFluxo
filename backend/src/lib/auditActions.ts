/**
 * Ponto único das strings de auditoria gravadas em `logs_acao` (colunas `acao`
 * e `entidade`). Centralizar evita typos, facilita auditar o vocabulário e dá
 * type-safety aos call sites de `registrarLog` e ao R6 de performance
 * (que casa `entidade = 'pedido'`).
 */

/** Valores da coluna logs_acao.entidade. */
export const AuditEntity = {
  AUTH: "auth",
  CLIENTE: "cliente",
  VEICULO: "veiculo",
  PECA: "peca",
  USUARIO: "usuario",
  PEDIDO: "pedido",
  RELATORIO: "relatorio",
  SEARCH: "search",
} as const;

/** Valores da coluna logs_acao.acao. */
export const AuditAction = {
  LOGIN_SUCESSO: "login.sucesso",
  LOGIN_FALHA: "login.falha",
  LOGIN_LOGOUT: "login.logout",

  CLIENTE_CRIAR: "cliente.criar",
  CLIENTE_ATUALIZAR: "cliente.atualizar",
  VEICULO_CRIAR: "veiculo.criar",

  USUARIO_CRIAR: "usuario.criar",
  USUARIO_ATUALIZAR: "usuario.atualizar",
  USUARIO_RESET_SENHA: "usuario.reset-senha",
  USUARIO_DESATIVAR: "usuario.desativar",

  PECA_CRIAR: "peca.criar",
  PECA_ATUALIZAR: "peca.atualizar",

  PEDIDO_CRIAR: "pedido.criar",
  PEDIDO_PAGAR: "pedido.pagar",
  PEDIDO_CANCELAR: "pedido.cancelar",
  PEDIDO_INICIAR_SEPARACAO: "pedido.iniciar-separacao",
  PEDIDO_SEPARAR_ITEM: "pedido.separar-item",
  PEDIDO_ENVIAR_MONTAGEM: "pedido.enviar-montagem",
  PEDIDO_INICIAR_MONTAGEM: "pedido.iniciar-montagem",
  PEDIDO_CONCLUIR: "pedido.concluir",
  PEDIDO_DEVOLVER_CAIXA: "pedido.devolver-caixa",

  SEARCH_NL: "search.nl",
} as const;

/** Ação dinâmica de relatório: `relatorio.<tipo>` (ex.: relatorio.vendas). */
export const relatorioAction = (tipo: string): string => `relatorio.${tipo}`;
