-- Migration: 001_create_tables.sql
-- Cria as tabelas de domínio do AutoFluxo e documenta o rollback.
-- Este script foi elaborado para PostgreSQL, usando ENUM para pedidos.status.

BEGIN;

CREATE TYPE pedido_status AS ENUM (
  'ABERTO',
  'PAGO',
  'EM_SEPARACAO',
  'EM_MONTAGEM',
  'CONCLUIDO',
  'CANCELADO'
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL DEFAULT 'USER',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  celular VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  documento VARCHAR(30),
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_celular ON clientes(celular);

CREATE TABLE veiculos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  placa VARCHAR(15) NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  ano SMALLINT,
  cor VARCHAR(50),
  quilometragem INTEGER DEFAULT 0,
  chassi VARCHAR(100),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_veiculos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX idx_veiculos_placa ON veiculos(placa);

CREATE TABLE pecas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(100) NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque INTEGER NOT NULL DEFAULT 0,
  unidade VARCHAR(20),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pecas_codigo ON pecas(codigo);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  veiculo_id INTEGER,
  status pedido_status NOT NULL DEFAULT 'ABERTO',
  data_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_entrega_prevista TIMESTAMP WITH TIME ZONE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_veiculo FOREIGN KEY (veiculo_id)
    REFERENCES veiculos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX idx_pedidos_status ON pedidos(status);

CREATE TABLE itens_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL,
  peca_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_itens_pedido_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_itens_pedido_peca FOREIGN KEY (peca_id)
    REFERENCES pecas(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE pagamentos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  data_pagamento TIMESTAMP WITH TIME ZONE,
  referencia VARCHAR(255),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_pagamentos_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE logs_acao (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  entidade VARCHAR(100) NOT NULL,
  entidade_id INTEGER,
  acao VARCHAR(100) NOT NULL,
  descricao TEXT,
  ip VARCHAR(45),
  user_agent TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_logs_acao_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

COMMIT;

-- Rollback documentado:
-- execute as um script separado ou em uma transação de reversão.
-- Preferência de ordem: primeiro remove as dependências e depois os tipos.
--
-- DROP TABLE IF EXISTS logs_acao CASCADE;
-- DROP TABLE IF EXISTS pagamentos CASCADE;
-- DROP TABLE IF EXISTS itens_pedido CASCADE;
-- DROP TABLE IF EXISTS pedidos CASCADE;
-- DROP TABLE IF EXISTS pecas CASCADE;
-- DROP TABLE IF EXISTS veiculos CASCADE;
-- DROP TABLE IF EXISTS clientes CASCADE;
-- DROP TABLE IF EXISTS usuarios CASCADE;
-- DROP TYPE IF EXISTS pedido_status;
