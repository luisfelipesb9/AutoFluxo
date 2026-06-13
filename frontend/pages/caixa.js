import { requireAuth, getUser }                    from '../core/auth.js';
import { initLayout }                              from '../components/layout.js';
import { openModal, closeModal, initModals }       from '../components/modal.js';
import { showToast }                               from '../components/toast.js';
import { api, ApiError }                           from '../core/api.js';
import { escapeHtml }                              from '../core/utils.js';

requireAuth('../login.html');

const _u = getUser();
if (_u && !['admin', 'caixa'].includes(_u.role)) {
  window.location.replace('./dashboard.html');
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let orders          = [];
let selectedOrderId = null;

// ---------------------------------------------------------------------------
// API — carrega a fila de pedidos abertos e adapta ao formato da tela
// ---------------------------------------------------------------------------
/**
 * Adapta um pedido vindo da API (snake_case, relações aninhadas) ao formato
 * consumido pelas funções de render desta tela.
 * @param {any} p pedido cru da API
 */
function adaptOrder(p) {
  return {
    id:  String(p.id),               // string: alinha com dataset.orderId nas comparações
    os:  p.os,
    cliente: {
      nome:     p.cliente?.nome     ?? '—',
      telefone: p.cliente?.telefone ?? '—',
    },
    veiculo: p.veiculo
      ? { modelo: p.veiculo.modelo ?? '—', placa: p.veiculo.placa ?? '—', ano: p.veiculo.ano ?? null }
      : null,
    itens: (p.itens ?? []).map(i => ({
      descricao:     i.peca?.nome ?? `Peça ${i.peca_id}`,
      qtd:           i.qtd,
      valorUnitario: Number(i.preco_unitario) || 0,
    })),
    total:           Number(p.total) || 0,
    criadoEm:        new Date(p.criado_em),
    status:          p.status,
    motivoDevolucao: p.motivo_devolucao ?? null,
  };
}

/** Busca os pedidos abertos e devolvidos pelo estoque e re-renderiza a fila. */
async function fetchOrders() {
  const queue = document.getElementById('orderQueue');
  try {
    const [abertoData, devolvidoData] = await Promise.all([
      api.get('/pedidos?status=aberto'),
      api.get('/pedidos?status=devolvido_caixa'),
    ]);
    orders = [...(abertoData || []), ...(devolvidoData || [])].map(adaptOrder);
  } catch (err) {
    console.error('[caixa] falha ao carregar pedidos:', err);
    // Só mostra erro no lugar da fila se ainda não havia nada carregado.
    if (!orders.length) {
      queue.innerHTML = `<p class="queue-empty">${err instanceof ApiError ? err.message : 'Erro ao carregar pedidos.'}</p>`;
      document.getElementById('queueCount').textContent = '—';
    }
    return;
  }

  // Se o pedido selecionado saiu da fila (pago/cancelado em outro caixa), limpa o detalhe.
  if (selectedOrderId && !orders.some(o => o.id === selectedOrderId)) {
    clearDetail();
  }

  renderQueue();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function elapsedMinutes(date) {
  // clamp em 0: evita "há -X min" por pequeno skew de relógio servidor/cliente.
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
}

function formatTimer(date) {
  const mins = elapsedMinutes(date);
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`;
}

function calcTotal(order) {
  // A API já devolve o total calculado; só soma os itens como fallback.
  if (typeof order.total === 'number' && !Number.isNaN(order.total)) return order.total;
  return order.itens.reduce((s, i) => s + i.qtd * i.valorUnitario, 0);
}

function fmt(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------
function renderQueue() {
  const queue = document.getElementById('orderQueue');
  const count = document.getElementById('queueCount');

  // devolvido_caixa primeiro (precisam de atenção imediata), depois abertos por tempo
  const open = orders
    .filter(o => o.status === 'aberto' || o.status === 'devolvido_caixa')
    .sort((a, b) => {
      if (a.status === 'devolvido_caixa' && b.status !== 'devolvido_caixa') return -1;
      if (b.status === 'devolvido_caixa' && a.status !== 'devolvido_caixa') return 1;
      return a.criadoEm - b.criadoEm;
    });

  count.textContent = `${open.length} pedido${open.length !== 1 ? 's' : ''}`;
  queue.innerHTML   = '';

  if (open.length === 0) {
    queue.innerHTML = '<p class="queue-empty">Nenhum pedido aguardando pagamento.</p>';
    return;
  }

  open.forEach(order => queue.appendChild(buildCard(order)));
}

function buildCard(order) {
  const mins      = elapsedMinutes(order.criadoEm);
  const urgent    = mins > 30;
  const active    = order.id === selectedOrderId;
  const returned  = order.status === 'devolvido_caixa';

  const card = document.createElement('div');
  card.className = [
    'order-card',
    urgent   && 'order-card--urgent',
    active   && 'order-card--selected',
    returned && 'order-card--returned',
  ].filter(Boolean).join(' ');
  card.setAttribute('role', 'listitem');
  card.dataset.orderId = order.id;

  card.innerHTML = `
    <div class="order-card__top">
      <span class="order-card__os">${escapeHtml(order.os)}</span>
      <span class="order-card__timer${urgent ? ' order-card__timer--urgent' : ''}">${formatTimer(order.criadoEm)}</span>
    </div>
    <div class="order-card__client">${escapeHtml(order.cliente.nome)}</div>
    <div class="order-card__vehicle">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-car"/></svg>
      <span>${order.veiculo ? `${escapeHtml(order.veiculo.modelo)} · ${escapeHtml(order.veiculo.placa)}` : 'Sem veículo'}</span>
    </div>
    ${returned ? `
    <div class="order-card__urgent-badge order-card__urgent-badge--returned">
      <span class="order-card__urgent-dot"></span>
      Devolvido pelo estoque
    </div>` : urgent ? `
    <div class="order-card__urgent-badge">
      <span class="order-card__urgent-dot"></span>
      Aguardando há mais de 30 min
    </div>` : ''}
  `;

  card.addEventListener('click', () => selectOrder(order.id));
  return card;
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------
function selectOrder(id) {
  selectedOrderId = id;
  const order = orders.find(o => o.id === id);
  if (!order) return;

  document.querySelectorAll('.order-card').forEach(c =>
    c.classList.toggle('order-card--selected', c.dataset.orderId === id)
  );

  document.getElementById('detailEmpty').classList.add('u-hidden');
  document.getElementById('detailContent').classList.remove('u-hidden');

  document.getElementById('detailOs').textContent         = order.os;
  document.getElementById('detailClientName').textContent = order.cliente.nome;
  const v = order.veiculo;
  document.getElementById('detailVehicle').textContent    = v
    ? [v.modelo, v.placa, v.ano].filter(Boolean).join(' · ')
    : 'Sem veículo';
  document.getElementById('detailPhone').textContent      = order.cliente.telefone;
  document.getElementById('detailTotal').textContent      = fmt(calcTotal(order));

  document.getElementById('detailItemsBody').innerHTML = order.itens.map(item => `
    <tr>
      <td>${escapeHtml(item.descricao)}</td>
      <td class="items-table__num">${Number(item.qtd)}</td>
      <td class="items-table__num">${fmt(item.valorUnitario)}</td>
      <td class="items-table__num">${fmt(item.qtd * item.valorUnitario)}</td>
    </tr>
  `).join('');

  const methodEl        = document.getElementById('paymentMethod');
  const paymentFieldEl  = methodEl.closest('.field');
  const confirmBtn      = document.getElementById('confirmPaymentBtn');
  const devBanner       = document.getElementById('devolutionWarning');
  const devReasonEl     = document.getElementById('devolutionReason');
  const devolvido       = order.status === 'devolvido_caixa';

  // Resetar estado do painel antes de configurar para o novo pedido
  methodEl.value = '';
  paymentFieldEl.classList.remove('field--filled');
  document.getElementById('amountReceived').value = '';
  document.getElementById('cashFields').classList.add('u-hidden');
  updateChange();

  if (devolvido) {
    devBanner.classList.remove('u-hidden');
    devReasonEl.textContent = order.motivoDevolucao ?? 'Sem motivo informado';
    paymentFieldEl.classList.add('u-hidden');
    confirmBtn.classList.add('u-hidden');
  } else {
    devBanner.classList.add('u-hidden');
    paymentFieldEl.classList.remove('u-hidden');
    confirmBtn.classList.remove('u-hidden');
  }
}

function clearDetail() {
  selectedOrderId = null;
  document.getElementById('detailEmpty').classList.remove('u-hidden');
  document.getElementById('detailContent').classList.add('u-hidden');
}

// ---------------------------------------------------------------------------
// Remove with animation
// ---------------------------------------------------------------------------
function removeOrder(id, done) {
  const card = document.querySelector(`.order-card[data-order-id="${id}"]`);
  if (!card) { done?.(); return; }
  card.classList.add('order-card--removing');
  card.addEventListener('animationend', () => { card.remove(); done?.(); }, { once: true });
}

// ---------------------------------------------------------------------------
// Change calculation
// ---------------------------------------------------------------------------
function updateChange() {
  if (!selectedOrderId) return;
  const order    = orders.find(o => o.id === selectedOrderId);
  const total    = order ? calcTotal(order) : 0;
  const received = parseFloat(document.getElementById('amountReceived').value) || 0;
  document.getElementById('changeAmount').textContent = fmt(Math.max(0, received - total));
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function initEventListeners() {
  const methodEl = document.getElementById('paymentMethod');

  methodEl.addEventListener('change', function () {
    const isDinheiro = this.value === 'dinheiro';
    this.closest('.field').classList.toggle('field--filled', this.value !== '');
    document.getElementById('cashFields').classList.toggle('u-hidden', !isDinheiro);
    if (!isDinheiro) {
      document.getElementById('amountReceived').value = '';
      updateChange();
    }
  });

  document.getElementById('amountReceived').addEventListener('input', updateChange);

  document.getElementById('confirmPaymentBtn').addEventListener('click', async () => {
    if (!selectedOrderId) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order || order.status === 'devolvido_caixa') return;

    const method = document.getElementById('paymentMethod').value;
    if (!method) {
      showToast('Selecione a forma de pagamento.', 'warning');
      return;
    }

    const total = calcTotal(order);

    if (method === 'dinheiro') {
      const received = parseFloat(document.getElementById('amountReceived').value) || 0;
      if (received < total) {
        showToast('Valor recebido é inferior ao total do pedido.', 'error');
        return;
      }
    }

    const btn = document.getElementById('confirmPaymentBtn');
    btn.classList.add('btn--loading');
    btn.disabled = true;

    try {
      await api.post(`/pedidos/${order.id}/pagar`, { forma_pagamento: method, valor: total });
      order.status = 'pago';   // exclui da fila no próximo render
      showToast('Pagamento confirmado com sucesso!', 'success');
      removeOrder(order.id, () => {
        renderQueue();
        clearDetail();
      });
    } catch (err) {
      console.error('[caixa] falha ao pagar:', err);
      showToast(err instanceof ApiError ? err.message : 'Erro ao confirmar pagamento.', 'error');
    } finally {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  });

  document.getElementById('cancelOrderBtn').addEventListener('click', () => {
    if (!selectedOrderId) return;
    document.getElementById('cancelReason').value = '';
    document.getElementById('confirmCancelBtn').disabled = true;
    openModal('modalCancelamento');
  });

  document.getElementById('cancelReason').addEventListener('input', function () {
    document.getElementById('confirmCancelBtn').disabled = this.value.trim().length === 0;
  });

  document.getElementById('modalCancelClose').addEventListener('click',  () => closeModal('modalCancelamento'));
  document.getElementById('modalCancelCloseX').addEventListener('click', () => closeModal('modalCancelamento'));

  document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
    if (!selectedOrderId) return;

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;
    const motivo = document.getElementById('cancelReason').value.trim();

    const btn = document.getElementById('confirmCancelBtn');
    btn.disabled = true;

    try {
      await api.post(`/pedidos/${order.id}/cancelar`, { motivo });
      order.status = 'cancelado';
      closeModal('modalCancelamento');
      showToast('Pedido cancelado com sucesso.', 'warning');
      removeOrder(order.id, () => {
        renderQueue();
        clearDetail();
      });
    } catch (err) {
      console.error('[caixa] falha ao cancelar:', err);
      showToast(err instanceof ApiError ? err.message : 'Erro ao cancelar pedido.', 'error');
      btn.disabled = false;   // reabilita pra nova tentativa
    }
  });
}

// ---------------------------------------------------------------------------
// Live timer refresh (every 30 s)
// ---------------------------------------------------------------------------
function startTimerUpdates() {
  setInterval(() => {
    document.querySelectorAll('.order-card:not(.order-card--removing)').forEach(card => {
      const order = orders.find(o => o.id === card.dataset.orderId);
      if (!order) return;

      const timerEl = card.querySelector('.order-card__timer');
      if (timerEl) timerEl.textContent = formatTimer(order.criadoEm);

      const mins = elapsedMinutes(order.criadoEm);
      if (mins > 30 && !card.classList.contains('order-card--urgent')) {
        card.classList.add('order-card--urgent');
        timerEl?.classList.add('order-card__timer--urgent');
        if (!card.querySelector('.order-card__urgent-badge')) {
          const badge = document.createElement('div');
          badge.className = 'order-card__urgent-badge';
          badge.innerHTML = '<span class="order-card__urgent-dot"></span>Aguardando há mais de 30 min';
          card.appendChild(badge);
        }
      }
    });
  }, 30_000);
}

// ---------------------------------------------------------------------------
// Polling every 10 s (re-busca a fila na API)
// ---------------------------------------------------------------------------
function startPolling() {
  setInterval(fetchOrders, 10_000);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Caixa' });
  initModals();
  fetchOrders();
  initEventListeners();
  startTimerUpdates();
  startPolling();
});
