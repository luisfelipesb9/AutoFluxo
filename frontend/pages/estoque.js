import { requireAuth, getUser }              from '../core/auth.js';
import { initLayout }                        from '../components/layout.js';
import { showToast }                         from '../components/toast.js';
import { openModal, closeModal, initModals } from '../components/modal.js';
import { api, ApiError }                     from '../core/api.js';
import { escapeHtml }                        from '../core/utils.js';

requireAuth('../login.html');

const _u = getUser();
if (_u && !['admin', 'estoque'].includes(_u.role)) {
  window.location.replace('./dashboard.html');
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let pedidos      = [];   // fila adaptada (pago + em_separacao)
let pedidoAtivo  = null; // pedido aberto na VIEW 2 (itens carregam id + qtdConfirmada)
let pollingTimer = null;

// ---------------------------------------------------------------------------
// API — adapta o pedido cru ao formato da tela
// ---------------------------------------------------------------------------
function adaptPedido(p) {
  return {
    id:     String(p.id),
    os:     p.os,
    status: p.status,
    cliente: {
      nome:     p.cliente?.nome     ?? '—',
      telefone: p.cliente?.telefone ?? '—',
    },
    veiculo: p.veiculo
      ? { modelo: p.veiculo.modelo ?? '—', placa: p.veiculo.placa ?? '—', ano: p.veiculo.ano ?? null }
      : null,
    pagoEm: p.pago_em ? new Date(p.pago_em) : new Date(),
    itens: (p.itens ?? []).map(i => ({
      id:                i.id,                            // ItemPedido.id → URL do PUT separar
      codigo:            i.peca?.codigo ?? '—',
      descricao:         i.peca?.nome   ?? `Peça ${i.peca_id}`,
      qtdSolicitada:     i.qtd,
      estoqueDisponivel: Number(i.peca?.estoque ?? 0),
      qtdConfirmada:     i.qtd_confirmada ?? null,        // != null → já separado
    })),
  };
}

/** Carrega a fila: pedidos pagos + os já em separação (pra poder retomar). */
async function fetchFila() {
  const listEl = document.getElementById('separacaoQueue');
  try {
    const [pagos, emSep] = await Promise.all([
      api.get('/pedidos?status=pago'),
      api.get('/pedidos?status=em_separacao'),
    ]);
    pedidos = [...(pagos || []), ...(emSep || [])].map(adaptPedido);
  } catch (err) {
    console.error('[estoque] falha ao carregar fila:', err);
    if (!pedidos.length) {
      listEl.innerHTML = `<p class="estoque-queue__empty">${err instanceof ApiError ? err.message : 'Erro ao carregar fila.'}</p>`;
      document.getElementById('queueCount').textContent = '—';
    }
    return;
  }
  renderFila();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimer(date) {
  // clamp em 0: evita "há -X min" por skew de relógio servidor/cliente.
  const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`;
}

function temEstoqueCritico(pedido) {
  // Item já separado não conta como crítico (a baixa já foi feita).
  return pedido.itens.some(it => it.qtdConfirmada == null && it.estoqueDisponivel < it.qtdSolicitada);
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

  const fila = pedidos.slice().sort((a, b) => a.pagoEm - b.pagoEm);

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

  const critico    = temEstoqueCritico(pedido);
  const emAndamento = pedido.status === 'em_separacao';
  const veiculo    = pedido.veiculo ? `${pedido.veiculo.modelo} · ${pedido.veiculo.placa}` : 'Sem veículo';

  const veiculoEscaped = pedido.veiculo
    ? `${escapeHtml(pedido.veiculo.modelo)} · ${escapeHtml(pedido.veiculo.placa)}`
    : 'Sem veículo';

  card.innerHTML = `
    <div class="estoque-card__body">
      <div class="estoque-card__info">
        <span class="estoque-card__os">${escapeHtml(pedido.os)}</span>
        <span class="estoque-card__cliente">${escapeHtml(pedido.cliente.nome)}</span>
        <span class="estoque-card__veiculo">
          ${svgIcon('car')}
          ${veiculoEscaped}
        </span>
        <div class="estoque-card__meta">
          <span class="estoque-card__timer">${formatTimer(pedido.pagoEm)}</span>
          <span class="estoque-card__count-itens">${pedido.itens.length} iten${pedido.itens.length !== 1 ? 's' : ''}</span>
          ${critico ? `<span class="estoque-card__alerta">${svgIcon('alert')} Estoque insuficiente</span>` : ''}
        </div>
      </div>
      <div class="estoque-card__action">
        <button class="btn btn--accent btn--md btn-iniciar" data-id="${pedido.id}">
          ${emAndamento ? 'Continuar Separação' : 'Iniciar Separação'}
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
async function abrirSeparacao(id) {
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return;

  const btn = document.querySelector(`.estoque-card[data-pedido-id="${id}"] .btn-iniciar`);
  if (btn) { btn.classList.add('btn--loading'); btn.disabled = true; }

  try {
    // pago → em_separacao (idempotente p/ quem já está em separação).
    if (pedido.status === 'pago') {
      await api.post(`/pedidos/${pedido.id}/iniciar-separacao`);
    }
    // Recarrega o detalhe pra ter item.id e qtd_confirmada atuais.
    const fresh = await api.get(`/pedidos/${pedido.id}`);
    pedidoAtivo = adaptPedido(fresh);
  } catch (err) {
    console.error('[estoque] falha ao iniciar separação:', err);
    showToast(err instanceof ApiError ? err.message : 'Erro ao iniciar separação.', 'error');
    if (btn) { btn.classList.remove('btn--loading'); btn.disabled = false; }
    return;
  }

  document.getElementById('viewFila').classList.add('u-hidden');
  document.getElementById('viewSeparacao').classList.remove('u-hidden');

  document.getElementById('separacaoOs').textContent      = pedidoAtivo.os;
  document.getElementById('separacaoCliente').textContent = pedidoAtivo.cliente.nome;
  const v = pedidoAtivo.veiculo;
  document.getElementById('separacaoVeiculo').textContent = v
    ? [v.modelo, v.placa, v.ano].filter(Boolean).join(' · ')
    : 'Sem veículo';

  document.getElementById('bannerEstoque').classList.toggle('u-hidden', !temEstoqueCritico(pedidoAtivo));

  renderItens();
  atualizarBotaoEnvio();
}

function voltarParaFila() {
  pedidoAtivo = null;
  document.getElementById('viewSeparacao').classList.add('u-hidden');
  document.getElementById('viewFila').classList.remove('u-hidden');
  fetchFila();
}

function renderItens() {
  const container = document.getElementById('separacaoItens');
  container.innerHTML = '';

  pedidoAtivo.itens.forEach((item, idx) => {
    container.appendChild(buildItemRow(item, idx));
  });
}

function buildItemRow(item, idx) {
  const jaSeparado  = item.qtdConfirmada != null;
  const insuficiente = !jaSeparado && item.estoqueDisponivel < item.qtdSolicitada;

  const row = document.createElement('div');
  row.className = 'separacao-item';
  row.setAttribute('role', 'listitem');
  row.dataset.idx = idx;

  if (insuficiente) row.classList.add('separacao-item--blocked');
  if (jaSeparado)   row.classList.add('separacao-item--confirmado');

  const checkAttrs = jaSeparado ? 'checked disabled' : (insuficiente ? 'disabled' : '');
  const inputAttrs = jaSeparado
    ? `value="${item.qtdConfirmada}" disabled`
    : 'placeholder="—" disabled';

  row.innerHTML = `
    <label class="separacao-item__check-wrap" aria-label="Confirmar item ${escapeHtml(item.descricao)}">
      <input type="checkbox" class="separacao-item__checkbox" data-idx="${idx}" ${checkAttrs}>
      <span class="separacao-item__check-custom" aria-hidden="true">${svgIcon('check')}</span>
    </label>
    <div class="separacao-item__details">
      <div class="separacao-item__codigo-row">
        <span class="separacao-item__codigo">${escapeHtml(item.codigo)}</span>
        ${insuficiente ? `<span class="separacao-item__blocked-icon" aria-label="Estoque insuficiente">${svgIcon('alert')}</span>` : ''}
      </div>
      <span class="separacao-item__descricao">${escapeHtml(item.descricao)}</span>
    </div>
    <div class="separacao-item__qtd-bloco">
      <span class="separacao-item__qtd-label">Solicitado</span>
      <span class="separacao-item__qtd-valor">${Number(item.qtdSolicitada)}</span>
    </div>
    <div class="separacao-item__estoque-bloco">
      <span class="separacao-item__qtd-label">Em Estoque</span>
      <span class="separacao-item__estoque-valor ${insuficiente ? 'separacao-item__estoque--critico' : ''}">${Number(item.estoqueDisponivel)}</span>
    </div>
    <div class="separacao-item__confirm-bloco">
      <label class="separacao-item__qtd-label" for="confirm-${idx}">Qtd confirmada</label>
      <input
        type="number"
        id="confirm-${idx}"
        class="separacao-item__confirm-input"
        min="1"
        max="${Number(item.estoqueDisponivel)}"
        ${inputAttrs}
        aria-label="Quantidade confirmada para ${escapeHtml(item.descricao)}"
      >
    </div>
  `;

  if (jaSeparado || insuficiente) {
    if (insuficiente) {
      row.querySelector('.separacao-item__check-wrap').addEventListener('click', (e) => {
        e.preventDefault();
        showToast(`Item ${item.codigo} não pode ser confirmado: estoque insuficiente. Devolva o pedido ao caixa.`, 'error');
      });
    }
    return row;
  }

  const checkbox = row.querySelector('.separacao-item__checkbox');
  const input    = row.querySelector('.separacao-item__confirm-input');
  checkbox.addEventListener('change', () => onCheckboxChange(row, item, idx, checkbox, input));
  input.addEventListener('input', () => onConfirmInput(row, item, input));

  return row;
}

function onCheckboxChange(row, item, idx, checkbox, input) {
  if (checkbox.checked) {
    input.disabled = false;
    const autoQtd = item.estoqueDisponivel >= item.qtdSolicitada
      ? item.qtdSolicitada
      : item.estoqueDisponivel;
    input.value = autoQtd;
    input.classList.remove('separacao-item__confirm-input--error');
    atualizarRowEstado(row, item, input);
  } else {
    input.disabled = true;
    input.value = '';
    input.classList.remove('separacao-item__confirm-input--error');
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
  const rows = document.querySelectorAll('.separacao-item');
  if (rows.length === 0) return false;

  return Array.from(rows).every(row => {
    const idx  = Number(row.dataset.idx);
    const item = pedidoAtivo.itens[idx];
    if (item.qtdConfirmada != null) return true;                          // já separado
    if (item.estoqueDisponivel < item.qtdSolicitada) return false;       // insuficiente
    const checkbox = row.querySelector('.separacao-item__checkbox');
    const input    = row.querySelector('.separacao-item__confirm-input');
    if (!checkbox.checked) return false;
    const val = parseInt(input.value, 10);
    return !isNaN(val) && val > 0 && val <= item.estoqueDisponivel && input.value !== '';
  });
}

function atualizarBotaoEnvio() {
  document.getElementById('btnEnviarMontagem').disabled = !todosConfirmados();
}

async function enviarParaMontagem() {
  if (!pedidoAtivo) return;

  // Coleta os itens que ainda precisam ser separados (não os já confirmados).
  const rows = [...document.querySelectorAll('.separacao-item')];
  const aSeparar = [];
  for (const row of rows) {
    const idx  = Number(row.dataset.idx);
    const item = pedidoAtivo.itens[idx];
    if (item.qtdConfirmada != null) continue; // já separado no servidor

    const checkbox = row.querySelector('.separacao-item__checkbox');
    const input    = row.querySelector('.separacao-item__confirm-input');
    const val      = parseInt(input.value, 10);
    if (!checkbox.checked || isNaN(val) || val <= 0 || val > item.estoqueDisponivel) {
      showToast(`Confirme uma quantidade válida para "${item.descricao}".`, 'error');
      input.classList.add('separacao-item__confirm-input--error');
      return;
    }
    aSeparar.push({ item, val });
  }

  const btn = document.getElementById('btnEnviarMontagem');
  btn.classList.add('btn--loading');
  btn.disabled = true;

  try {
    // Baixa cada item (lock + recheck no servidor), depois libera o pedido.
    for (const { item, val } of aSeparar) {
      await api.put(`/pedidos/${pedidoAtivo.id}/itens/${item.id}/separar`, { qtd_confirmada: val });
      item.qtdConfirmada = val;
    }
    await api.post(`/pedidos/${pedidoAtivo.id}/enviar-montagem`);

    const os = pedidoAtivo.os;
    showToast(`Pedido ${os} enviado para montagem!`, 'success');
    voltarParaFila();
  } catch (err) {
    console.error('[estoque] falha ao enviar para montagem:', err);
    showToast(err instanceof ApiError ? err.message : 'Erro ao enviar para montagem.', 'error');
    // Re-sincroniza a VIEW 2 (estoque/itens podem ter mudado sob concorrência).
    try {
      const fresh = await api.get(`/pedidos/${pedidoAtivo.id}`);
      pedidoAtivo = adaptPedido(fresh);
      renderItens();
      atualizarBotaoEnvio();
    } catch { /* mantém o estado atual */ }
  } finally {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
  }
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

window._confirmarDevolucao = async () => {
  const motivo = document.getElementById('motivoDevolucao').value.trim();
  if (!motivo || !pedidoAtivo) return;

  const btn = document.getElementById('btnConfirmarDevolucao');
  btn.disabled = true;

  try {
    await api.post(`/pedidos/${pedidoAtivo.id}/devolver-caixa`, { motivo });
    const os = pedidoAtivo.os;
    closeModal('modalDevolucao');
    showToast(`Pedido ${os} devolvido ao caixa.`, 'warning');
    voltarParaFila();
  } catch (err) {
    console.error('[estoque] falha ao devolver ao caixa:', err);
    showToast(err instanceof ApiError ? err.message : 'Erro ao devolver ao caixa.', 'error');
    btn.disabled = false;
  }
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
// Polling (re-busca a fila a cada 10s enquanto na VIEW 1)
// ---------------------------------------------------------------------------
function startPolling() {
  pollingTimer = setInterval(() => {
    if (!document.getElementById('viewFila').classList.contains('u-hidden')) {
      fetchFila();
    }
  }, 10_000);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Estoque' });
  fetchFila();

  document.getElementById('btnVoltar').addEventListener('click', voltarParaFila);
  document.getElementById('btnDevolverCaixa').addEventListener('click', abrirDevolucao);
  document.getElementById('btnEnviarMontagem').addEventListener('click', enviarParaMontagem);
  initModals();

  startTimerUpdates();
  startPolling();
});
