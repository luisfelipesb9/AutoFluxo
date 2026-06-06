/**
 * pages/novo-pedido.js
 * ============================================================
 * Tela do Vendedor — Criar Pedido (stepper 3 passos).
 *
 * Passo 1: Busca de cliente (nome/placa/celular)
 * Passo 2: Autocomplete de peças, lista com qtd editável
 * Passo 3: Resumo + observações + criar pedido
 *
 * Dados: mock local.
 * Para integrar ao backend substituir _searchClients(),
 * _searchParts() e _submitOrder() pelas chamadas à API.
 * ============================================================ */

import { requireAuth } from '../core/auth.js';
import { initLayout }  from '../components/layout.js';
import { showToast }   from '../components/toast.js';

/* ── Guard ──────────────────────────────────────────────── */
requireAuth('../login.html');

/* ── Estado ─────────────────────────────────────────────── */
const state = {
  currentStep:     1,
  selectedClient:  null,
  items:           [],   // { id, codigo, nome, estoque, qty }
};

/* ── Mock DB ────────────────────────────────────────────── */
const MOCK_CLIENTS = [
  { id: 1, nome: 'João Silva',      telefone: '(38) 99999-9999', placas: ['ABC-1234', 'XYZ-5678'], ultimoPedido: '20/05/2025' },
  { id: 2, nome: 'Maria Souza',     telefone: '(38) 98888-8888', placas: ['QWE-2024'],              ultimoPedido: '15/05/2025' },
  { id: 3, nome: 'Carlos Lima',     telefone: '(38) 97777-7777', placas: [],                        ultimoPedido: null         },
  { id: 4, nome: 'Ana Paula',       telefone: '(38) 96666-6666', placas: ['MNO-3456'],              ultimoPedido: '10/06/2025' },
  { id: 5, nome: 'Pedro Alves',     telefone: '(38) 95555-5555', placas: ['RST-7890'],              ultimoPedido: '01/06/2025' },
  { id: 6, nome: 'Fernanda Costa',  telefone: '(38) 94444-4444', placas: ['UVW-1122'],              ultimoPedido: '28/05/2025' },
  { id: 7, nome: 'Roberto Mendes',  telefone: '(38) 93333-3333', placas: ['DEF-5566'],              ultimoPedido: '03/06/2025' },
];

const MOCK_PARTS = [
  { id: 1, codigo: 'PC001', nome: 'Pneu Aro 15',          estoque: 12 },
  { id: 2, codigo: 'PC002', nome: 'Bateria 60Ah',          estoque: 2  },
  { id: 3, codigo: 'PC003', nome: 'Óleo Motor 5W30',       estoque: 8  },
  { id: 4, codigo: 'PC004', nome: 'Pastilha de Freio',     estoque: 20 },
  { id: 5, codigo: 'PC005', nome: 'Vela de Ignição',       estoque: 3  },
  { id: 6, codigo: 'PC006', nome: 'Filtro de Ar',          estoque: 15 },
  { id: 7, codigo: 'PC007', nome: 'Amortecedor Dianteiro', estoque: 6  },
  { id: 8, codigo: 'PC008', nome: 'Correia Dentada',       estoque: 9  },
  { id: 9, codigo: 'PC009', nome: 'Filtro de Combustível', estoque: 11 },
  { id: 10, codigo: 'PC010', nome: 'Bomba d\'Água',        estoque: 4  },
];

/* ── Helpers ────────────────────────────────────────────── */
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function _initials(nome) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function _clientMeta(client) {
  const placa = client.placas.length ? client.placas[0] : 'Sem veículo';
  const ultimo = client.ultimoPedido ? `último pedido: ${client.ultimoPedido}` : 'sem pedidos';
  return `${client.telefone} · ${placa} · ${ultimo}`;
}

/* ── Busca mock ─────────────────────────────────────────── */
function _searchClients(term) {
  const q = term.toLowerCase();
  return MOCK_CLIENTS.filter(c =>
    c.nome.toLowerCase().includes(q) ||
    c.telefone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
    c.placas.some(p => p.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q.replace(/[^a-z0-9]/g, '')))
  ).slice(0, 5);
}

function _searchParts(term) {
  const q = term.toLowerCase();
  return MOCK_PARTS.filter(p =>
    p.codigo.toLowerCase().includes(q) ||
    p.nome.toLowerCase().includes(q)
  );
}

/* ── Inicialização ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Novo Pedido' });

  _initStep1();
  _initStep2();
  _initStep3();
});

/* ================================================================
   STEPPER
   ================================================================ */
function updateStepper() {
  const step = state.currentStep;

  [1, 2, 3].forEach(n => {
    const indicator = document.getElementById(`stepIndicator${n}`);
    const circle    = document.getElementById(`stepCircle${n}`);

    indicator.classList.remove('stepper__step--active', 'stepper__step--done');
    indicator.removeAttribute('aria-current');

    if (n === step) {
      indicator.classList.add('stepper__step--active');
      indicator.setAttribute('aria-current', 'step');
      circle.textContent = n;
    } else if (n < step) {
      indicator.classList.add('stepper__step--done');
      circle.innerHTML = `<svg aria-hidden="true" style="width:16px;height:16px">
        <use href="../icons/icons.svg#icon-check"/>
      </svg>`;
    } else {
      circle.textContent = n;
    }
  });

  // Lines
  document.getElementById('stepLine1').classList.toggle('stepper__line--done', step > 1);
  document.getElementById('stepLine2').classList.toggle('stepper__line--done', step > 2);
}

function goToStep(step) {
  // Oculta todos, exibe o alvo
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('step-panel--active', i + 1 === step);
  });

  state.currentStep = step;
  updateStepper();

  if (step === 3) _renderSummary();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================================================================
   PASSO 1 — CLIENTE
   ================================================================ */
function _initStep1() {
  const input      = document.getElementById('clientSearch');
  const results    = document.getElementById('clientResults');
  const nextBtn    = document.getElementById('btnStep1Next');
  const clearBtn   = document.getElementById('clearClientBtn');
  const novoBtn    = document.getElementById('btnNovoCliente');
  const hint       = document.getElementById('clientHint');

  const doSearch = debounce(term => {
    if (term.length < 2) {
      _closeResults(results, input);
      return;
    }

    const found = _searchClients(term);

    if (!found.length) {
      results.innerHTML = `<div class="search-results__empty">Nenhum cliente encontrado para "${term}"</div>`;
      _openResults(results, input);
      return;
    }

    results.innerHTML = found.map(c => `
      <div class="search-results__item" role="option" data-id="${c.id}" tabindex="0"
           aria-label="${c.nome}, ${c.telefone}">
        <div class="search-results__body">
          <div class="search-results__name">${c.nome}</div>
          <div class="search-results__meta">
            ${c.placas.length ? c.placas.join(' · ') : 'Sem veículo'} &nbsp;·&nbsp; ${c.telefone}
          </div>
        </div>
        <div class="search-results__last">
          ${c.ultimoPedido ? `Ped. ${c.ultimoPedido}` : '—'}
        </div>
      </div>
    `).join('');

    _openResults(results, input);

    results.querySelectorAll('.search-results__item').forEach(item => {
      const select = () => _selectClient(Number(item.dataset.id));
      item.addEventListener('click', select);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
    });
  }, 300);

  input.addEventListener('input', e => {
    if (state.selectedClient) return; // já selecionado
    doSearch(e.target.value.trim());
  });

  // Fecha ao clicar fora
  document.addEventListener('click', e => {
    if (!document.getElementById('clientSearchWrapper').contains(e.target)) {
      _closeResults(results, input);
    }
  });

  clearBtn.addEventListener('click', () => {
    _clearClient();
    input.value = '';
    input.focus();
    hint.textContent = '';
  });

  nextBtn.addEventListener('click', () => {
    if (!state.selectedClient) {
      _showHint(hint, 'Selecione um cliente para continuar.');
      return;
    }
    goToStep(2);
  });

  novoBtn.addEventListener('click', () => {
    showToast('Cadastro de novo cliente em desenvolvimento.', 'info');
  });
}

function _selectClient(id) {
  const client = MOCK_CLIENTS.find(c => c.id === id);
  if (!client) return;

  state.selectedClient = client;

  // Exibe card de selecionado
  document.getElementById('selectedClientInitial').textContent = _initials(client.nome);
  document.getElementById('selectedClientName').textContent    = client.nome;
  document.getElementById('selectedClientMeta').textContent    = _clientMeta(client);
  document.getElementById('selectedClientCard').classList.remove('u-hidden');

  // Limpa busca e fecha dropdown
  const input   = document.getElementById('clientSearch');
  const results = document.getElementById('clientResults');
  input.value   = client.nome;
  input.disabled = true;
  _closeResults(results, input);

  // Habilita botão próximo
  const btn = document.getElementById('btnStep1Next');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');

  document.getElementById('clientHint').textContent = '';
}

function _clearClient() {
  state.selectedClient = null;
  document.getElementById('selectedClientCard').classList.add('u-hidden');
  document.getElementById('clientSearch').disabled = false;

  const btn = document.getElementById('btnStep1Next');
  btn.disabled = true;
  btn.setAttribute('aria-disabled', 'true');
}

/* ================================================================
   PASSO 2 — ITENS
   ================================================================ */
function _initStep2() {
  const input   = document.getElementById('partSearch');
  const results = document.getElementById('partResults');

  const doSearch = debounce(term => {
    if (term.length < 2) {
      _closeResults(results, input);
      return;
    }

    const found = _searchParts(term);

    if (!found.length) {
      results.innerHTML = `<div class="search-results__empty">Nenhuma peça encontrada para "${term}"</div>`;
      _openResults(results, input);
      return;
    }

    const addedIds = new Set(state.items.map(i => i.id));

    results.innerHTML = found.map(p => {
      const added = addedIds.has(p.id);
      return `
        <div class="autocomplete-item${added ? ' is-added' : ''}"
             role="option"
             data-id="${p.id}"
             tabindex="${added ? -1 : 0}"
             aria-label="${p.codigo} — ${p.nome}${added ? ', já adicionado' : ''}">
          <span class="autocomplete-code">${p.codigo}</span>
          <span class="autocomplete-name">${p.nome}</span>
          <span class="autocomplete-stock">Estoque: ${p.estoque}</span>
        </div>
      `;
    }).join('');

    _openResults(results, input);

    results.querySelectorAll('.autocomplete-item:not(.is-added)').forEach(item => {
      const add = () => {
        _addItem(Number(item.dataset.id));
        input.value = '';
        _closeResults(results, input);
        input.focus();
      };
      item.addEventListener('click', add);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') add(); });
    });
  }, 300);

  input.addEventListener('input', e => doSearch(e.target.value.trim()));

  document.addEventListener('click', e => {
    if (!document.getElementById('partSearchWrapper').contains(e.target)) {
      _closeResults(results, input);
    }
  });

  document.getElementById('btnStep2Back').addEventListener('click', () => goToStep(1));

  document.getElementById('btnStep2Next').addEventListener('click', () => {
    if (state.items.length === 0) {
      showToast('Adicione ao menos uma peça para continuar.', 'warning');
      return;
    }
    goToStep(3);
  });
}

function _addItem(id) {
  if (state.items.find(i => i.id === id)) return;
  const part = MOCK_PARTS.find(p => p.id === id);
  if (!part) return;

  state.items.push({ ...part, qty: 1 });
  _renderItems();
}

function _removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  _renderItems();
}

function _setQty(id, value) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  const qty = Math.max(1, Math.floor(Number(value)) || 1);
  item.qty  = qty;
  _renderItems();
}

function _renderItems() {
  const list  = document.getElementById('itemsList');
  const empty = document.getElementById('itemsEmpty');

  if (state.items.length === 0) {
    list.innerHTML = '';
    list.appendChild(empty);
    empty.style.display = '';
    return;
  }

  // Monta HTML; o empty fica fora da lista quando há itens
  const rows = state.items.map(item => `
    <div class="item-row" data-item-id="${item.id}">
      <span class="item-row__code">${item.codigo}</span>
      <span class="item-row__name">${item.nome}</span>
      <div class="qty-control" aria-label="Quantidade de ${item.nome}">
        <button class="qty-btn" data-action="dec" data-id="${item.id}"
                aria-label="Diminuir quantidade"
                ${item.qty <= 1 ? 'disabled' : ''}>−</button>
        <input  class="qty-input" type="number" min="1"
                value="${item.qty}" data-id="${item.id}"
                aria-label="Quantidade">
        <button class="qty-btn" data-action="inc" data-id="${item.id}"
                aria-label="Aumentar quantidade">+</button>
      </div>
      <button class="item-remove" data-id="${item.id}" aria-label="Remover ${item.nome}">
        <svg aria-hidden="true"><use href="../icons/icons.svg#icon-trash"/></svg>
      </button>
    </div>
  `).join('');

  list.innerHTML = rows;

  // Bind handlers
  list.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = Number(btn.dataset.id);
      const item = state.items.find(i => i.id === id);
      if (!item) return;
      _setQty(id, btn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1);
    });
  });

  list.querySelectorAll('.qty-input').forEach(inp => {
    inp.addEventListener('change', () => _setQty(Number(inp.dataset.id), inp.value));
    inp.addEventListener('blur',   () => _setQty(Number(inp.dataset.id), inp.value));
  });

  list.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => _removeItem(Number(btn.dataset.id)));
  });
}

/* ================================================================
   PASSO 3 — CONFIRMAR
   ================================================================ */
function _initStep3() {
  document.getElementById('btnStep3Back').addEventListener('click', () => goToStep(2));
  document.getElementById('btnCriarPedido').addEventListener('click', _submitOrder);
}

function _renderSummary() {
  const client = state.selectedClient;

  // Cliente
  document.getElementById('summaryClientInitial').textContent = _initials(client.nome);
  document.getElementById('summaryClientName').textContent    = client.nome;
  document.getElementById('summaryClientMeta').textContent    = _clientMeta(client);

  // Itens
  const itemsEl = document.getElementById('summaryItems');
  itemsEl.innerHTML = state.items.map(item => `
    <div class="summary-item">
      <span class="summary-item__code">${item.codigo}</span>
      <span class="summary-item__name">${item.nome}</span>
      <span class="summary-item__qty">× ${item.qty}</span>
    </div>
  `).join('');
}

function _submitOrder() {
  const btn = document.getElementById('btnCriarPedido');
  btn.classList.add('btn--loading');
  btn.disabled = true;

  // Simulação de chamada à API
  setTimeout(() => {
    btn.classList.remove('btn--loading');
    btn.disabled = false;

    showToast(
      `Pedido criado com sucesso para ${state.selectedClient.nome}!`,
      'success'
    );

    _resetForm();
    goToStep(1);
  }, 1000);
}

/* ================================================================
   RESET
   ================================================================ */
function _resetForm() {
  state.selectedClient = null;
  state.items          = [];

  // Step 1
  const clientInput = document.getElementById('clientSearch');
  clientInput.value    = '';
  clientInput.disabled = false;
  _clearClient();

  // Step 2
  document.getElementById('partSearch').value = '';
  _renderItems();

  // Step 3
  document.getElementById('observacoes').value = '';
}

/* ================================================================
   HELPERS DE DROPDOWN
   ================================================================ */
function _openResults(el, input) {
  el.classList.add(
    el.classList.contains('autocomplete-results')
      ? 'autocomplete-results--open'
      : 'search-results--open'
  );
  input.setAttribute('aria-expanded', 'true');
}

function _closeResults(el, input) {
  el.classList.remove('search-results--open', 'autocomplete-results--open');
  input?.setAttribute('aria-expanded', 'false');
}

function _showHint(el, msg) {
  el.textContent = msg;
  el.style.color = 'var(--color-danger)';
  setTimeout(() => { el.textContent = ''; el.style.color = ''; }, 3000);
}
