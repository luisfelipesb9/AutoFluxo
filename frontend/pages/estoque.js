import { requireAuth, getUser }              from '../core/auth.js';
import { initLayout }                        from '../components/layout.js';
import { showToast }                         from '../components/toast.js';
import { openModal, closeModal, initModals } from '../components/modal.js';

requireAuth('../login.html');

const _u = getUser();
if (_u && !['admin', 'estoque'].includes(_u.role)) {
  window.location.replace('./dashboard.html');
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const _now = Date.now();

const mockPedidos = [
  {
    id: '1',
    os: 'OS-2501',
    cliente:  { nome: 'João Silva',        telefone: '(11) 99123-4567' },
    veiculo:  { modelo: 'Honda Civic',     placa: 'ABC-1234', ano: 2021 },
    itens: [
      { codigo: 'VD-001', descricao: 'Parabrisa dianteiro',  qtdSolicitada: 1, estoqueDisponivel: 3 },
      { codigo: 'BR-003', descricao: 'Borracha de vedação',  qtdSolicitada: 2, estoqueDisponivel: 15 },
      { codigo: 'MO-001', descricao: 'Mão de obra instalação', qtdSolicitada: 1, estoqueDisponivel: 999 },
    ],
    pagoEm: new Date(_now - 42 * 60 * 1000),
  },
  {
    id: '2',
    os: 'OS-2502',
    cliente:  { nome: 'Maria Souza',       telefone: '(11) 98765-4321' },
    veiculo:  { modelo: 'Toyota Corolla',  placa: 'QWE-5678', ano: 2022 },
    itens: [
      { codigo: 'VD-012', descricao: 'Vidro traseiro',       qtdSolicitada: 1, estoqueDisponivel: 0 },
      { codigo: 'BR-003', descricao: 'Borracha de vedação',  qtdSolicitada: 2, estoqueDisponivel: 15 },
      { codigo: 'MO-001', descricao: 'Mão de obra instalação', qtdSolicitada: 1, estoqueDisponivel: 999 },
    ],
    pagoEm: new Date(_now - 28 * 60 * 1000),
  },
  {
    id: '3',
    os: 'OS-2503',
    cliente:  { nome: 'Carlos Lima',       telefone: '(21) 97654-3210' },
    veiculo:  { modelo: 'VW Gol',          placa: 'MNO-9012', ano: 2019 },
    itens: [
      { codigo: 'PL-007', descricao: 'Película fumê',        qtdSolicitada: 1, estoqueDisponivel: 1 },
      { codigo: 'MO-001', descricao: 'Mão de obra instalação', qtdSolicitada: 1, estoqueDisponivel: 999 },
    ],
    pagoEm: new Date(_now - 15 * 60 * 1000),
  },
  {
    id: '4',
    os: 'OS-2504',
    cliente:  { nome: 'Ana Paula Ferreira', telefone: '(11) 96543-2109' },
    veiculo:  { modelo: 'Fiat Uno',         placa: 'XYZ-3456', ano: 2018 },
    itens: [
      { codigo: 'VD-001', descricao: 'Parabrisa dianteiro',  qtdSolicitada: 1, estoqueDisponivel: 3 },
      { codigo: 'VD-012', descricao: 'Vidro traseiro',       qtdSolicitada: 1, estoqueDisponivel: 0 },
      { codigo: 'BR-003', descricao: 'Borracha de vedação',  qtdSolicitada: 3, estoqueDisponivel: 2 },
      { codigo: 'MO-001', descricao: 'Mão de obra instalação', qtdSolicitada: 1, estoqueDisponivel: 999 },
    ],
    pagoEm: new Date(_now - 7 * 60 * 1000),
  },
  {
    id: '5',
    os: 'OS-2505',
    cliente:  { nome: 'Ricardo Braga',     telefone: '(31) 95432-1098' },
    veiculo:  { modelo: 'Chevrolet Onix',  placa: 'DEF-7890', ano: 2023 },
    itens: [
      { codigo: 'VD-001', descricao: 'Parabrisa dianteiro',  qtdSolicitada: 1, estoqueDisponivel: 3 },
      { codigo: 'PL-007', descricao: 'Película fumê',        qtdSolicitada: 1, estoqueDisponivel: 1 },
      { codigo: 'MO-001', descricao: 'Mão de obra instalação', qtdSolicitada: 1, estoqueDisponivel: 999 },
    ],
    pagoEm: new Date(_now - 3 * 60 * 1000),
  },
];

let pedidos = [...mockPedidos];
let pedidoAtivo = null;
let pollingTimer = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimer(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`;
}

function temEstoqueCritico(pedido) {
  return pedido.itens.some(it => it.estoqueDisponivel < it.qtdSolicitada);
}

function svgIcon(name) {
  return `<svg aria-hidden="true"><use href="../icons/icons.svg#icon-${name}"/></svg>`;
}

// ---------------------------------------------------------------------------
// VIEW 1 — Fila de Separação
// ---------------------------------------------------------------------------
function renderFila() {
  const listEl  = document.getElementById('separacaoQueue');
  const countEl = document.getElementById('queueCount');

  const fila = pedidos.filter(p => p.status !== 'devolvido_caixa').sort((a, b) => a.pagoEm - b.pagoEm);

  countEl.textContent = `${fila.length} pedido${fila.length !== 1 ? 's' : ''}`;
  listEl.innerHTML = '';

  if (fila.length === 0) {
    listEl.innerHTML = '<p class="estoque-queue__empty">Nenhum pedido aguardando separação.</p>';
    return;
  }

  fila.forEach(p => listEl.appendChild(buildCardFila(p)));
}

function buildCardFila(pedido) {
  const card = document.createElement('div');
  card.className = 'estoque-card';
  card.setAttribute('role', 'listitem');
  card.dataset.pedidoId = pedido.id;

  const critico = temEstoqueCritico(pedido);

  card.innerHTML = `
    <div class="estoque-card__body">
      <div class="estoque-card__info">
        <span class="estoque-card__os">${pedido.os}</span>
        <span class="estoque-card__cliente">${pedido.cliente.nome}</span>
        <span class="estoque-card__veiculo">
          ${svgIcon('car')}
          ${pedido.veiculo.modelo} · ${pedido.veiculo.placa}
        </span>
        <div class="estoque-card__meta">
          <span class="estoque-card__timer">${formatTimer(pedido.pagoEm)}</span>
          <span class="estoque-card__count-itens">${pedido.itens.length} iten${pedido.itens.length !== 1 ? 's' : ''}</span>
          ${critico ? `<span class="estoque-card__alerta">${svgIcon('alert')} Estoque insuficiente</span>` : ''}
        </div>
      </div>
      <div class="estoque-card__action">
        <button class="btn btn--accent btn--md btn-iniciar" data-id="${pedido.id}">
          Iniciar Separação
        </button>
      </div>
    </div>
  `;

  card.querySelector('.btn-iniciar').addEventListener('click', e => {
    e.stopPropagation();
    abrirSeparacao(pedido.id);
  });

  return card;
}

// ---------------------------------------------------------------------------
// VIEW 2 — Tela de Separação
// ---------------------------------------------------------------------------
function abrirSeparacao(id) {
  pedidoAtivo = pedidos.find(p => p.id === id);
  if (!pedidoAtivo) return;

  document.getElementById('viewFila').classList.add('u-hidden');
  const view2 = document.getElementById('viewSeparacao');
  view2.classList.remove('u-hidden');

  document.getElementById('separacaoOs').textContent      = pedidoAtivo.os;
  document.getElementById('separacaoCliente').textContent = pedidoAtivo.cliente.nome;
  document.getElementById('separacaoVeiculo').textContent =
    `${pedidoAtivo.veiculo.modelo} · ${pedidoAtivo.veiculo.placa} · ${pedidoAtivo.veiculo.ano}`;

  const critico = temEstoqueCritico(pedidoAtivo);
  document.getElementById('bannerEstoque').classList.toggle('u-hidden', !critico);

  renderItens();
  atualizarBotaoEnvio();
}

function voltarParaFila() {
  pedidoAtivo = null;
  document.getElementById('viewSeparacao').classList.add('u-hidden');
  document.getElementById('viewFila').classList.remove('u-hidden');
  renderFila();
}

function renderItens() {
  const container = document.getElementById('separacaoItens');
  container.innerHTML = '';

  pedidoAtivo.itens.forEach((item, idx) => {
    const row = buildItemRow(item, idx);
    container.appendChild(row);
  });
}

function buildItemRow(item, idx) {
  const insuficiente = item.estoqueDisponivel < item.qtdSolicitada;
  const row = document.createElement('div');
  row.className = 'separacao-item';
  row.setAttribute('role', 'listitem');
  row.dataset.idx = idx;

  if (insuficiente) row.classList.add('separacao-item--blocked');

  row.innerHTML = `
    <label class="separacao-item__check-wrap" aria-label="Confirmar item ${item.descricao}">
      <input type="checkbox" class="separacao-item__checkbox" data-idx="${idx}" ${insuficiente ? 'disabled' : ''}>
      <span class="separacao-item__check-custom" aria-hidden="true">${svgIcon('check')}</span>
    </label>
    <div class="separacao-item__details">
      <div class="separacao-item__codigo-row">
        <span class="separacao-item__codigo">${item.codigo}</span>
        ${insuficiente ? `<span class="separacao-item__blocked-icon" aria-label="Estoque insuficiente">${svgIcon('alert')}</span>` : ''}
      </div>
      <span class="separacao-item__descricao">${item.descricao}</span>
    </div>
    <div class="separacao-item__qtd-bloco">
      <span class="separacao-item__qtd-label">Solicitado</span>
      <span class="separacao-item__qtd-valor">${item.qtdSolicitada}</span>
    </div>
    <div class="separacao-item__estoque-bloco">
      <span class="separacao-item__qtd-label">Em Estoque</span>
      <span class="separacao-item__estoque-valor ${insuficiente ? 'separacao-item__estoque--critico' : ''}">${item.estoqueDisponivel}</span>
    </div>
    <div class="separacao-item__confirm-bloco">
      <label class="separacao-item__qtd-label" for="confirm-${idx}">Qtd confirmada</label>
      <input
        type="number"
        id="confirm-${idx}"
        class="separacao-item__confirm-input"
        min="0"
        max="${item.estoqueDisponivel}"
        placeholder="—"
        disabled
        aria-label="Quantidade confirmada para ${item.descricao}"
      >
    </div>
  `;

  const checkbox = row.querySelector('.separacao-item__checkbox');
  const input    = row.querySelector('.separacao-item__confirm-input');

  if (insuficiente) {
    row.querySelector('.separacao-item__check-wrap').addEventListener('click', (e) => {
      e.preventDefault();
      showToast(`Item ${item.codigo} não pode ser confirmado: estoque insuficiente. Devolva o pedido ao caixa.`, 'error');
    });
  } else {
    checkbox.addEventListener('change', () => onCheckboxChange(row, item, idx, checkbox, input));
    input.addEventListener('input', () => onConfirmInput(row, item, input));
  }

  return row;
}

function onCheckboxChange(row, item, idx, checkbox, input) {
  if (checkbox.checked) {
    input.disabled = false;
    const autoQtd = item.estoqueDisponivel >= item.qtdSolicitada
      ? item.qtdSolicitada
      : item.estoqueDisponivel;
    input.value = autoQtd;
    input.classList.remove('field--error');
    atualizarRowEstado(row, item, input);
  } else {
    input.disabled = true;
    input.value = '';
    input.classList.remove('field--error');
    row.classList.remove('separacao-item--confirmado');
  }
  atualizarBotaoEnvio();
}

function onConfirmInput(row, item, input) {
  const val = parseInt(input.value, 10);
  const max = item.estoqueDisponivel;

  if (!isNaN(val) && val > max) {
    input.classList.add('separacao-item__confirm-input--error');
  } else {
    input.classList.remove('separacao-item__confirm-input--error');
  }

  atualizarRowEstado(row, item, input);
  atualizarBotaoEnvio();
}

function atualizarRowEstado(row, item, input) {
  const val = parseInt(input.value, 10);
  const valido = !isNaN(val) && val >= 0 && val <= item.estoqueDisponivel;
  const preenchido = input.value !== '' && !input.disabled;

  row.classList.toggle('separacao-item--confirmado', preenchido && valido && val > 0);
}

function todosConfirmados() {
  if (!pedidoAtivo) return false;
  if (pedidoAtivo.itens.some(it => it.estoqueDisponivel < it.qtdSolicitada)) return false;
  const rows = document.querySelectorAll('.separacao-item');
  if (rows.length === 0) return false;

  return Array.from(rows).every(row => {
    const checkbox = row.querySelector('.separacao-item__checkbox');
    const input    = row.querySelector('.separacao-item__confirm-input');
    if (!checkbox.checked) return false;
    const val = parseInt(input.value, 10);
    const idx = parseInt(row.dataset.idx, 10);
    const item = pedidoAtivo.itens[idx];
    return !isNaN(val) && val >= 0 && val <= item.estoqueDisponivel && input.value !== '';
  });
}

function atualizarBotaoEnvio() {
  const btn = document.getElementById('btnEnviarMontagem');
  btn.disabled = !todosConfirmados();
}

function enviarParaMontagem() {
  if (!pedidoAtivo) return;

  const rows = document.querySelectorAll('.separacao-item');
  const valido = Array.from(rows).every(row => {
    const checkbox = row.querySelector('.separacao-item__checkbox');
    const input    = row.querySelector('.separacao-item__confirm-input');
    if (!checkbox.checked) return false;
    const val = parseInt(input.value, 10);
    const idx = parseInt(row.dataset.idx, 10);
    const item = pedidoAtivo.itens[idx];
    if (!isNaN(val) && val > item.estoqueDisponivel) {
      showToast(`Quantidade confirmada para "${item.descricao}" excede o estoque disponível.`, 'error');
      input.classList.add('separacao-item__confirm-input--error');
      return false;
    }
    return true;
  });

  if (!valido) return;

  const os = pedidoAtivo.os;
  pedidos = pedidos.filter(p => p.id !== pedidoAtivo.id);
  voltarParaFila();
  showToast(`Pedido ${os} enviado para montagem!`, 'success');
}

// ---------------------------------------------------------------------------
// Modal de Devolução ao Caixa
// ---------------------------------------------------------------------------
function abrirDevolucao() {
  document.getElementById('motivoDevolucao').value = '';
  document.getElementById('btnConfirmarDevolucao').disabled = true;
  openModal('modalDevolucao');
}

window._fecharDevolucao = () => closeModal('modalDevolucao');

window._validarMotivoDevolucao = () => {
  const motivo = document.getElementById('motivoDevolucao').value;
  document.getElementById('btnConfirmarDevolucao').disabled = motivo.trim().length === 0;
};

window._confirmarDevolucao = () => {
  const motivo = document.getElementById('motivoDevolucao').value.trim();
  if (!motivo || !pedidoAtivo) return;

  const os      = pedidoAtivo.os;
  const pedidoId = pedidoAtivo.id;

  closeModal('modalDevolucao');

  const p = pedidos.find(x => x.id === pedidoId);
  if (p) {
    p.status           = 'devolvido_caixa';
    p.motivoDevolucao  = motivo;
  }

  voltarParaFila();
  showToast(`Pedido ${os} devolvido ao caixa.`, 'warning');
};

// ---------------------------------------------------------------------------
// Timer ao vivo (atualiza timers a cada 30s)
// ---------------------------------------------------------------------------
function startTimerUpdates() {
  setInterval(() => {
    document.querySelectorAll('.estoque-card').forEach(card => {
      const p = pedidos.find(x => x.id === card.dataset.pedidoId);
      if (!p) return;
      const timerEl = card.querySelector('.estoque-card__timer');
      if (timerEl) timerEl.textContent = formatTimer(p.pagoEm);
    });
  }, 30_000);
}

// ---------------------------------------------------------------------------
// Polling (re-renderiza fila a cada 10s enquanto na VIEW 1)
// ---------------------------------------------------------------------------
function startPolling() {
  pollingTimer = setInterval(() => {
    if (!document.getElementById('viewFila').classList.contains('u-hidden')) {
      renderFila();
    }
  }, 10_000);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Estoque' });
  renderFila();

  document.getElementById('btnVoltar').addEventListener('click', voltarParaFila);
  document.getElementById('btnDevolverCaixa').addEventListener('click', abrirDevolucao);
  document.getElementById('btnEnviarMontagem').addEventListener('click', enviarParaMontagem);
  initModals();

  startTimerUpdates();
  startPolling();
});
