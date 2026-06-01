# Database migration

Este diretório contém a migração inicial para as tabelas do AutoFluxo.

## Arquivo principal
- `backend/db/migrations/001_create_tables.sql`

## Estrutura criada
- `usuarios`
- `clientes`
- `veiculos`
- `pecas`
- `pedidos`
- `itens_pedido`
- `pagamentos`
- `logs_acao`

## Pontos validados
- `pedidos.status` como ENUM: `ABERTO`, `PAGO`, `EM_SEPARACAO`, `EM_MONTAGEM`, `CONCLUIDO`, `CANCELADO`
- Índices:
  - `veiculos.placa`
  - `clientes.celular`
  - `pedidos.status`
  - `pecas.codigo`
- Chaves estrangeiras com `ON DELETE CASCADE` e `ON UPDATE CASCADE`

## Rollback
O rollback documentado está no final de `001_create_tables.sql`.
Use as instruções de `DROP TABLE ... CASCADE` na ordem inversa de criação quando precisar reverter.
