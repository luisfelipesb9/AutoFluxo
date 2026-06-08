import { requireAuth, getUser }                    from '../core/auth.js';
import { initLayout }                              from '../components/layout.js';
import { openModal, closeModal, initModals }       from '../components/modal.js';
import { showToast }                               from '../components/toast.js';

requireAuth('../login.html');

const _u = getUser();
if (_u && !['admin', 'caixa'].includes(_u.role)) {
  window.location.replace('./dashboard.html');
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const _now = Date.now();

/** @type {Array<{id:string, os:string, cliente:{nome:string, telefone:string}, veiculo:{modelo:string, placa:string, ano:number}, itens:Array<{descricao:string, qtd:number, valorUnitario:number}>, criadoEm:Date, status:string}>} */
const mockOrders = [
  {
    id: '1',
    os: 'OS-2401',
    cliente:  { nome: 'João Silva',          telefone: '(11) 99123-4567' },
    veiculo:  { modelo: 'Honda Civic',        placa: 'ABC-1234', ano: 2021 },
    itens: [
      { descricao: 'Para-brisa dianteiro', qtd: 1, valorUnitario: 450.00 },
      { descricao: 'Película solar',        qtd: 1, valorUnitario: 280.00 },
    ],
    criadoEm: new Date(_now - 75 * 60 * 1000),
    status: 'aberto',
  },
  {
    id: '2',
    os: 'OS-2402',
    cliente:  { nome: 'Maria Souza',          telefone: '(11) 98765-4321' },
    veiculo:  { modelo: 'Toyota Corolla',     placa: 'QWE-5678', ano: 2022 },
    itens: [
      { descricao: 'Vidro traseiro', qtd: 1, valorUnitario: 380.00 },
      { descricao: 'Mão de obra',    qtd: 1, valorUnitario:  80.00 },
    ],
    criadoEm: new Date(_now - 45 * 60 * 1000),
    status: 'aberto',
  },
  {
    id: '3',
    os: 'OS-2403',
    cliente:  { nome: 'Carlos Lima',          telefone: '(21) 97654-3210' },
    veiculo:  { modelo: 'VW Gol',             placa: 'MNO-9012', ano: 2019 },
    itens: [
      { descricao: 'Para-brisa dianteiro', qtd: 1, valorUnitario: 320.00 },
      { descricao: 'Borracha de vedação',  qtd: 2, valorUnitario:  45.00 },
    ],
    criadoEm: new Date(_now - 25 * 60 * 1000),
    status: 'aberto',
  },
  {
    id: '4',
    os: 'OS-2404',
    cliente:  { nome: 'Ana Paula Ferreira',   telefone: '(11) 96543-2109' },
    veiculo:  { modelo: 'Fiat Uno',           placa: 'XYZ-3456', ano: 2018 },
    itens: [
      { descricao: 'Vidro lateral esquerdo', qtd: 1, valorUnitario: 210.00 },
      { descricao: 'Mão de obra',             qtd: 1, valorUnitario:  80.00 },
    ],
    criadoEm: new Date(_now - 15 * 60 * 1000),
    status: 'aberto',
  },
  {
    id: '5',
    os: 'OS-2405',
    cliente:  { nome: 'Ricardo Braga',        telefone: '(31) 95432-1098' },
    veiculo:  { modelo: 'Chevrolet Onix',     placa: 'DEF-7890', ano: 2023 },
    itens: [
      { descricao: 'Para-brisa panorâmico', qtd: 1, valorUnitario: 890.00 },
      { descricao: 'Película security',      qtd: 1, valorUnitario: 350.00 },
      { descricao: 'Mão de obra',            qtd: 1, valorUnitario: 120.00 },
    ],
    criadoEm: new Date(_now - 8 * 60 * 1000),
    status: 'aberto',
  },
  {
    id: '6',
    os: 'OS-2406',
    cliente:  { nome: 'Fernanda Costa',       telefone: '(41) 94321-0987' },
    veiculo:  { modelo: 'Jeep Renegade',      placa: 'GHI-2345', ano: 2020 },
    itens: [
      { descricao: 'Teto solar — vedação', qtd: 1, valorUnitario: 520.00 },
      { descricao: 'Borracha lateral',      qtd: 4, valorUnitario:  35.00 },
    ],
    criadoEm: new Date(_now - 3 * 60 * 1000),
    status: 'aberto',
  },
];

let orders          = [...mockOrders];
let selectedOrderId = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function elapsedMinutes(date) {
  return Math.floor((Date.now() - date.getTime()) / 60_000);
}

function formatTimer(date) {
  const mins = elapsedMinutes(date);
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`;
}

function calcTotal(order) {
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
  const open  = orders
    .filter(o => o.status === 'aberto')
    .sort((a, b) => a.criadoEm - b.criadoEm);

  count.textContent = `${open.length} pedido${open.length !== 1 ? 's' : ''}`;
  queue.innerHTML   = '';

  if (open.length === 0) {
    queue.innerHTML = '<p class="queue-empty">Nenhum pedido aguardando pagamento.</p>';
    return;
  }

  open.forEach(order => queue.appendChild(buildCard(order)));
}

function buildCard(order) {
  const mins   = elapsedMinutes(order.criadoEm);
  const urgent = mins > 30;
  const active = order.id === selectedOrderId;

  const card = document.createElement('div');
  card.className = ['order-card', urgent && 'order-card--urgent', active && 'order-card--selected']
    .filter(Boolean).join(' ');
  card.setAttribute('role', 'listitem');
  card.dataset.orderId = order.id;

  card.innerHTML = `
    <div class="order-card__top">
      <span class="order-card__os">${order.os}</span>
      <span class="order-card__timer${urgent ? ' order-card__timer--urgent' : ''}">${formatTimer(order.criadoEm)}</span>
    </div>
    <div class="order-card__client">${order.cliente.nome}</div>
    <div class="order-card__vehicle">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-car"/></svg>
      <span>${order.veiculo.modelo} · ${order.veiculo.placa}</span>
    </div>
    ${urgent ? `
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
  document.getElementById('detailVehicle').textContent    =
    `${order.veiculo.modelo} · ${order.veiculo.placa} · ${order.veiculo.ano}`;
  document.getElementById('detailPhone').textContent      = order.cliente.telefone;
  document.getElementById('detailTotal').textContent      = fmt(calcTotal(order));

  document.getElementById('detailItemsBody').innerHTML = order.itens.map(item => `
    <tr>
      <td>${item.descricao}</td>
      <td class="items-table__num">${item.qtd}</td>
      <td class="items-table__num">${fmt(item.valorUnitario)}</td>
      <td class="items-table__num">${fmt(item.qtd * item.valorUnitario)}</td>
    </tr>
  `).join('');

  const methodEl = document.getElementById('paymentMethod');
  methodEl.value = '';
  methodEl.closest('.field').classList.remove('field--filled');
  document.getElementById('amountReceived').value = '';
  document.getElementById('cashFields').classList.add('u-hidden');
  updateChange();
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

  document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
    if (!selectedOrderId) return;

    const method = document.getElementById('paymentMethod').value;
    if (!method) {
      showToast('Selecione a forma de pagamento.', 'warning');
      return;
    }

    if (method === 'dinheiro') {
      const order    = orders.find(o => o.id === selectedOrderId);
      const total    = calcTotal(order);
      const received = parseFloat(document.getElementById('amountReceived').value) || 0;
      if (received < total) {
        showToast('Valor recebido é inferior ao total do pedido.', 'error');
        return;
      }
    }

    const id    = selectedOrderId;
    const order = orders.find(o => o.id === id);
    if (order) order.status = 'pago';

    removeOrder(id, () => {
      renderQueue();
      clearDetail();
      showToast('Pagamento confirmado com sucesso!', 'success');
    });
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

  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    if (!selectedOrderId) return;

    const id    = selectedOrderId;
    const order = orders.find(o => o.id === id);
    if (order) order.status = 'cancelado';

    closeModal('modalCancelamento');
    removeOrder(id, () => {
      renderQueue();
      clearDetail();
      showToast('Pedido cancelado com sucesso.', 'warning');
    });
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
// Polling every 10 s (re-renders queue with updated timers)
// ---------------------------------------------------------------------------
function startPolling() {
  setInterval(renderQueue, 10_000);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Caixa' });
  initModals();
  renderQueue();
  initEventListeners();
  startTimerUpdates();
  startPolling();
});
