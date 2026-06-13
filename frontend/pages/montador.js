import { requireAuth, getUser }              from '../core/auth.js';
import { initLayout }                        from '../components/layout.js';
import { openModal, closeModal, initModals } from '../components/modal.js';
import { showToast }                         from '../components/toast.js';
import { api, ApiError }                     from '../core/api.js';

requireAuth('../login.html');

const _u = getUser();
if (_u && !['admin', 'montador'].includes(_u.role)) {
  window.location.replace('./dashboard.html');
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let queue      = [];   // status: liberado
let inProgress = [];   // status: em_montagem
let history    = [];   // status: concluido, criados hoje

let pendingConcluirId = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function elapsedMinutes(date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
}

function formatElapsed(date) {
  const mins = elapsedMinutes(date);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Retorna a data local no formato YYYY-MM-DD (sem conversão para UTC). */
function localDateStr() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function adaptPedido(p) {
  return {
    id:                String(p.id),
    os:                p.os,
    status:            p.status,
    cliente:           { nome: p.cliente?.nome ?? '—' },
    veiculo:           p.veiculo
      ? { modelo: p.veiculo.modelo ?? '—', placa: p.veiculo.placa ?? '—' }
      : null,
    itens:             (p.itens ?? []).map(i => ({
      descricao: i.peca?.nome ?? `Peça ${i.peca_id}`,
      qtd:       i.qtd,
    })),
    criadoEm:          new Date(p.criado_em),
    montagemIniciadaEm: p.montagem_iniciada_em ? new Date(p.montagem_iniciada_em) : null,
    concluidoEm:       p.concluido_em          ? new Date(p.concluido_em)          : null,
  };
}

// ---------------------------------------------------------------------------
// Carregamento de dados
// ---------------------------------------------------------------------------
async function fetchAll() {
  try {
    const today = localDateStr();
    const [libData, montagemData, conclData] = await Promise.all([
      api.get('/pedidos?status=liberado'),
      api.get('/pedidos?status=em_montagem'),
      api.get(`/pedidos?status=concluido&data=${today}`),
    ]);

    queue      = (libData      || []).map(adaptPedido);
    inProgress = (montagemData || []).map(adaptPedido);
    history    = (conclData    || []).map(adaptPedido);
  } catch (err) {
    console.error('[montador] falha ao carregar pedidos:', err);
    showToast(
      err instanceof ApiError ? err.message : 'Erro ao carregar pedidos.',
      'error'
    );
    return;
  }

  renderAll();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderAll() {
  renderQueue();
  renderInProgress();
  renderHistory();
}

/* --- Fila (liberado) ------------------------------------------------------ */
function renderQueue() {
  const list  = document.getElementById('queueList');
  const count = document.getElementById('queueCount');
  count.textContent = queue.length;

  list.innerHTML = '';

  if (!queue.length) {
    list.innerHTML = '<p class="montador-empty">Nenhum pedido aguardando montagem.</p>';
    return;
  }

  const sorted = [...queue].sort((a, b) => a.criadoEm - b.criadoEm);
  sorted.forEach(p => list.appendChild(buildQueueCard(p)));
}

function buildQueueCard(p) {
  const card = document.createElement('div');
  card.className = 'montador-card';
  card.setAttribute('role', 'listitem');
  card.dataset.pedidoId = p.id;

  const itensText = p.itens.length
    ? p.itens.map(i => `${i.qtd}× ${i.descricao}`).join(', ')
    : 'Sem itens';

  const vehicleHtml = p.veiculo ? `
    <div class="montador-card__vehicle">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-car"/></svg>
      <span>${p.veiculo.modelo} · ${p.veiculo.placa}</span>
    </div>` : '';

  card.innerHTML = `
    <div class="montador-card__header">
      <span class="montador-card__os">${p.os}</span>
      <span class="montador-card__wait">há ${formatElapsed(p.criadoEm)}</span>
    </div>
    <div class="montador-card__client">${p.cliente.nome}</div>
    ${vehicleHtml}
    <div class="montador-card__items" title="${itensText}">${itensText}</div>
    <button class="btn btn--success btn--full montador-card__action"
            data-pedido-id="${p.id}"
            aria-label="Confirmar recebimento do pedido ${p.os}">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-check"/></svg>
      Confirmar Recebimento
    </button>
  `;

  const btn = card.querySelector('.montador-card__action');
  btn.addEventListener('click', () => handleIniciarMontagem(p.id, p.os, btn));

  return card;
}

async function handleIniciarMontagem(id, os, btn) {
  btn.disabled = true;
  btn.classList.add('btn--loading');

  try {
    await api.post(`/pedidos/${id}/iniciar-montagem`);
    showToast(`Pedido ${os} recebido. Montagem iniciada!`, 'success');
    await fetchAll();
  } catch (err) {
    console.error('[montador] falha ao iniciar montagem:', err);
    showToast(
      err instanceof ApiError ? err.message : 'Erro ao iniciar montagem.',
      'error'
    );
    btn.disabled = false;
    btn.classList.remove('btn--loading');
  }
}

/* --- Em andamento (em_montagem) ------------------------------------------- */
function renderInProgress() {
  const list  = document.getElementById('inProgressList');
  const count = document.getElementById('inProgressCount');
  count.textContent = inProgress.length;

  list.innerHTML = '';

  if (!inProgress.length) {
    list.innerHTML = '<p class="montador-empty">Nenhum pedido em andamento.</p>';
    return;
  }

  inProgress.forEach(p => list.appendChild(buildInProgressCard(p)));
}

function buildInProgressCard(p) {
  const card = document.createElement('div');
  card.className = 'montador-card montador-card--in-progress';
  card.setAttribute('role', 'listitem');
  card.dataset.pedidoId = p.id;

  const iniciadoEm = p.montagemIniciadaEm ?? p.criadoEm;
  card.dataset.iniciadoEm = iniciadoEm.toISOString();

  const elapsed = formatElapsed(iniciadoEm);

  const itensText = p.itens.length
    ? p.itens.map(i => `${i.qtd}× ${i.descricao}`).join(', ')
    : 'Sem itens';

  const vehicleHtml = p.veiculo ? `
    <div class="montador-card__vehicle">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-car"/></svg>
      <span>${p.veiculo.modelo} · ${p.veiculo.placa}</span>
    </div>` : '';

  card.innerHTML = `
    <div class="montador-card__header">
      <span class="montador-card__os">${p.os}</span>
      <span class="montador-card__timer" aria-label="Tempo de montagem: ${elapsed}">
        <span class="montador-card__timer-value">${elapsed}</span>
      </span>
    </div>
    <div class="montador-card__client">${p.cliente.nome}</div>
    ${vehicleHtml}
    <div class="montador-card__items" title="${itensText}">${itensText}</div>
    <button class="btn btn--accent btn--full montador-card__action"
            data-pedido-id="${p.id}"
            aria-label="Concluir serviço do pedido ${p.os}">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-check"/></svg>
      Concluir Serviço
    </button>
  `;

  const btn = card.querySelector('.montador-card__action');
  btn.addEventListener('click', () => {
    pendingConcluirId = p.id;
    document.getElementById('modalConcluirOs').textContent = p.os;
    openModal('modalConcluir');
  });

  return card;
}

async function handleConcluir() {
  if (!pendingConcluirId) return;

  const id          = pendingConcluirId;
  const confirmBtn  = document.getElementById('modalConcluirConfirm');
  confirmBtn.disabled = true;
  confirmBtn.classList.add('btn--loading');

  try {
    await api.post(`/pedidos/${id}/concluir`);
    const pedido = inProgress.find(p => p.id === id);
    const os     = pedido?.os ?? id;
    closeModal('modalConcluir');
    showToast(`Serviço ${os} concluído com sucesso!`, 'success');
    await fetchAll();
  } catch (err) {
    console.error('[montador] falha ao concluir:', err);
    showToast(
      err instanceof ApiError ? err.message : 'Erro ao concluir serviço.',
      'error'
    );
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('btn--loading');
    pendingConcluirId = null;
  }
}

/* --- Histórico do dia (concluido) ---------------------------------------- */
function renderHistory() {
  const list  = document.getElementById('historyList');
  const count = document.getElementById('historyCount');

  const sorted = [...history].sort(
    (a, b) => (b.concluidoEm ?? b.criadoEm) - (a.concluidoEm ?? a.criadoEm)
  );
  count.textContent = sorted.length;

  list.innerHTML = '';

  if (!sorted.length) {
    list.innerHTML = '<p class="montador-empty">Nenhum serviço concluído hoje.</p>';
    return;
  }

  sorted.forEach(p => list.appendChild(buildHistoryRow(p)));
}

function buildHistoryRow(p) {
  const row = document.createElement('div');
  row.className = 'montador-history-row';
  row.setAttribute('role', 'listitem');

  const time = p.concluidoEm
    ? p.concluidoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  row.innerHTML = `
    <span class="montador-history-row__os">${p.os}</span>
    <span class="montador-history-row__client">${p.cliente.nome}</span>
    ${p.veiculo ? `<span class="montador-history-row__vehicle">${p.veiculo.placa}</span>` : '<span></span>'}
    <span class="montador-history-row__time">${time}</span>
  `;

  return row;
}

// ---------------------------------------------------------------------------
// Timer a cada 60 s (atualiza só os cards em andamento no DOM)
// ---------------------------------------------------------------------------
function startTimerUpdates() {
  setInterval(() => {
    document.querySelectorAll('.montador-card--in-progress').forEach(card => {
      const inicio = card.dataset.iniciadoEm;
      if (!inicio) return;
      const el = card.querySelector('.montador-card__timer-value');
      if (el) {
        const elapsed = formatElapsed(new Date(inicio));
        el.textContent = elapsed;
        card.querySelector('.montador-card__timer')
            ?.setAttribute('aria-label', `Tempo de montagem: ${elapsed}`);
      }
    });
  }, 60_000);
}

// ---------------------------------------------------------------------------
// Polling a cada 30 s (re-busca a API)
// ---------------------------------------------------------------------------
function startPolling() {
  setInterval(fetchAll, 30_000);
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function initEventListeners() {
  const closeModal_ = () => {
    pendingConcluirId = null;
    closeModal('modalConcluir');
  };

  document.getElementById('modalConcluirCancel').addEventListener('click', closeModal_);
  document.getElementById('modalConcluirCloseX').addEventListener('click', closeModal_);
  document.getElementById('modalConcluirConfirm').addEventListener('click', handleConcluir);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Montador' });
  initModals();
  fetchAll();
  initEventListeners();
  startTimerUpdates();
  startPolling();
});
