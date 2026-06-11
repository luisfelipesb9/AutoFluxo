/**
 * pages/admin/cadastros.js
 * ============================================================
 * Controlador da página de Cadastros (Usuários / Peças / Clientes).
 *
 * Conectado à API real:
 *  - Listagem:  GET /usuarios | /pecas | /clientes
 *  - Criar:     POST /usuarios | /pecas | /clientes
 *  - Editar:    PUT  /usuarios/:id | /pecas/:id | /clientes/:id
 *  - Desativar: DELETE /usuarios/:id (soft) ; PUT /pecas|clientes/:id { ativo:false }
 *
 * Contrato híbrido: o backend usa `login` (não email), `perfil` minúsculo e
 * `ativo` boolean. A tela mapeia perfil↔label e ativo↔status aqui.
 * ============================================================ */

import { requireAuth, getUser } from '../../core/auth.js';
import { initLayout }   from '../../components/layout.js';
import { DataTable }    from '../../core/table.js';
import { openModal, closeModal, initModals } from '../../components/modal.js';
import { showToast }    from '../../components/toast.js';
import { api, ApiError } from '../../core/api.js';

/* ── Guard ──────────────────────────────────────────────── */
requireAuth('../../login.html');

const _u = getUser();
if (_u && _u.role !== 'admin') {
  window.location.replace('../dashboard.html');
}

/* ── Estado ─────────────────────────────────────────────── */
let currentTab          = 'usuarios';
let pendingDeactivateId = null;
let editingId           = null;     // null = criando; id = editando
let debounceTimer       = null;
let table               = null;

/* Cache dos registros carregados da API por aba (fonte para editar/expandir). */
const cache = { usuarios: [], pecas: [], clientes: [] };

/* ── Perfis: label (UI) ↔ value (enum backend) ──────────── */
const PERFIL_LABEL = {
  admin: 'Administrador', vendedor: 'Vendedor', caixa: 'Caixa',
  estoque: 'Estoque', montador: 'Montador',
};
const PERFIL_VALUE = Object.fromEntries(
  Object.entries(PERFIL_LABEL).map(([v, l]) => [l, v])
);
const PERFIS = Object.values(PERFIL_LABEL);

/* ── Helpers de formatação ──────────────────────────────── */
function _fmtCurrency(value) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

/* ── Colunas por tab ─────────────────────────────────────── */
const COLUMNS = {
  usuarios: [
    { key: 'nome',   label: 'Nome' },
    { key: 'login',  label: 'Login' },
    { key: 'perfil', label: 'Perfil' },
    { key: 'status', label: 'Status' },
    { key: '_actions', label: '' },
  ],
  pecas: [
    { key: 'codigo',   label: 'Código' },
    { key: 'nome',     label: 'Peça' },
    { key: 'preco',    label: 'Preço' },
    { key: 'estoque',  label: 'Estoque' },
    { key: 'minimo',   label: 'Mínimo' },
    { key: '_situacao',label: 'Situação' },
    { key: '_actions', label: '' },
  ],
  clientes: [
    { key: 'nome',      label: 'Cliente' },
    { key: 'telefone',  label: 'Telefone' },
    { key: '_veiculos', label: 'Veículos' },
    { key: '_actions',  label: '' },
  ],
};

/* ── Row renderers (recebem o objeto cru da API) ─────────── */
const RENDERERS = {
  usuarios: (item) => {
    const ativo = item.ativo !== false;
    return `
    <td>${item.nome}</td>
    <td class="u-text-muted">${item.login}</td>
    <td>${PERFIL_LABEL[item.perfil] || item.perfil}</td>
    <td>
      <span class="badge ${ativo ? 'badge--pago' : 'badge--cancelado'}">
        <span class="badge__dot"></span>${ativo ? 'Ativo' : 'Inativo'}
      </span>
    </td>
    <td>
      <div class="row-actions">
        <button class="btn btn--ghost btn--sm" onclick="window._editRecord(${item.id})">
          <svg style="width:13px;height:13px" aria-hidden="true"><use href="../../icons/icons.svg#icon-edit"/></svg>
          Editar
        </button>
        <button class="btn btn--danger btn--sm" onclick="window._confirmDeactivate(${item.id})" ${ativo ? '' : 'disabled'}>
          Desativar
        </button>
      </div>
    </td>`;
  },

  pecas: (item) => {
    const critical = item.estoque <= item.minimo;
    return `
      <td><code>${item.codigo}</code></td>
      <td>${item.nome}</td>
      <td>${_fmtCurrency(item.preco)}</td>
      <td><strong>${item.estoque}</strong></td>
      <td>${item.minimo}</td>
      <td>
        <span class="${critical ? 'stock-critical' : 'stock-ok'}">
          <span class="stock-dot"></span>${critical ? 'Crítico' : 'OK'}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn--ghost btn--sm" onclick="window._editRecord(${item.id})">
            <svg style="width:13px;height:13px" aria-hidden="true"><use href="../../icons/icons.svg#icon-edit"/></svg>
            Editar
          </button>
          <button class="btn btn--danger btn--sm" onclick="window._confirmDeactivate(${item.id})">
            Remover
          </button>
        </div>
      </td>`;
  },

  clientes: (item) => `
    <td>
      <button class="expand-btn" id="expandBtn-${item.id}" onclick="window._toggleVehicles(${item.id}, this)" aria-expanded="false">
        <svg aria-hidden="true"><use href="../../icons/icons.svg#icon-chevron-right"/></svg>
        ${item.nome}
      </button>
    </td>
    <td>${item.telefone}</td>
    <td class="u-text-muted">${(item.veiculos || []).length} veículo(s)</td>
    <td>
      <div class="row-actions">
        <button class="btn btn--ghost btn--sm" onclick="window._editRecord(${item.id})">
          <svg style="width:13px;height:13px" aria-hidden="true"><use href="../../icons/icons.svg#icon-edit"/></svg>
          Editar
        </button>
        <button class="btn btn--danger btn--sm" onclick="window._confirmDeactivate(${item.id})">
          Desativar
        </button>
      </div>
    </td>`,
};

/* ── Inicialização ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLayout({ pageTitle: 'Cadastros' });
  initModals();
  _initTabs();
  _initSearch();
  _initTable(currentTab);

  document.getElementById('btnNovo')
    .addEventListener('click', () => _openCreateModal());
});

/* ── Tabs ────────────────────────────────────────────────── */
function _initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab--active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('tab--active');
      btn.setAttribute('aria-selected', 'true');

      currentTab = btn.dataset.tab;
      document.getElementById('tableSearch').value = '';
      _initTable(currentTab);
    });
  });
}

/* ── Dados visíveis na tabela (esconde inativos onde não há coluna status) ── */
function _displayData(tab) {
  const data = cache[tab] || [];
  if (tab === 'usuarios') return data;          // tem badge Ativo/Inativo
  return data.filter(r => r.ativo !== false);    // peças/clientes: some ao desativar
}

/* ── Tabela ──────────────────────────────────────────────── */
async function _initTable(tab) {
  const container = document.getElementById('tableContainer');

  table = new DataTable({
    container,
    columns:      COLUMNS[tab],
    rowRenderer:  RENDERERS[tab],
    onEmpty:      'Carregando…',
    itemsPerPage: 10,
  });
  table.setData([]);

  try {
    cache[tab] = (await api.get(`/${tab}`)) || [];
  } catch (err) {
    console.error(`[cadastros] falha ao carregar ${tab}:`, err);
    showToast(err instanceof ApiError ? err.message : `Erro ao carregar ${tab}.`, 'error');
    cache[tab] = [];
  }

  if (tab !== currentTab) return;   // o usuário trocou de aba durante o fetch
  table._emptyMsg = 'Nenhum registro encontrado para esta busca.';
  table.setData(_displayData(tab));
}

/* ── Busca com debounce 300ms (client-side) ──────────────── */
function _initSearch() {
  document.getElementById('tableSearch').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      table?.setFilter(e.target.value);
    }, 300);
  });
}

/* ── Expand veículos (cliente) ───────────────────────────── */
window._toggleVehicles = function(clienteId, btn) {
  const cliente = cache.clientes.find(c => c.id === clienteId);
  if (!cliente) return;

  const isExpanded = btn.classList.toggle('expanded');
  btn.setAttribute('aria-expanded', String(isExpanded));

  const existingRow = document.getElementById(`vehicles-row-${clienteId}`);
  if (!isExpanded) { existingRow?.remove(); return; }

  const tr = btn.closest('tr');
  const colspan = COLUMNS.clientes.length;
  const veiculos = cliente.veiculos || [];

  const vehicleHTML = veiculos.length
    ? veiculos.map((v) => `
        <div class="vehicle-item">
          <svg aria-hidden="true"><use href="../../icons/icons.svg#icon-car"/></svg>
          <strong>${v.placa}</strong> — ${v.modelo || '—'}${v.ano ? ` · ${v.ano}` : ''}
        </div>`).join('')
    : `<p class="u-text-muted" style="font-size:var(--font-size-sm)">Nenhum veículo vinculado.</p>`;

  const vehicleRow = document.createElement('tr');
  vehicleRow.id        = `vehicles-row-${clienteId}`;
  vehicleRow.className = 'row--child row--visible';
  vehicleRow.innerHTML = `
    <td colspan="${colspan}">
      <div class="vehicle-expand">
        <div class="vehicle-list">${vehicleHTML}</div>
      </div>
    </td>`;

  tr.insertAdjacentElement('afterend', vehicleRow);
};

/* ── Modal Criar ─────────────────────────────────────────── */
function _openCreateModal() {
  editingId = null;
  document.getElementById('modalCadastroTitle').textContent = `Novo ${_tabLabel()}`;
  _renderFormFields(null);
  openModal('modalCadastro');
}

/* ── Modal Editar ────────────────────────────────────────── */
window._editRecord = function(id) {
  const item = cache[currentTab].find(i => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('modalCadastroTitle').textContent = `Editar ${_tabLabel()}`;
  _renderFormFields(item);
  openModal('modalCadastro');
};

/* ── Campos dinâmicos por tab (cria vs edita) ────────────── */
function _renderFormFields(item) {
  const form = document.getElementById('modalForm');
  const editando = item !== null;

  const fieldDefs = {
    usuarios: [
      { id: 'f-nome',  label: 'Nome completo', type: 'text', value: item?.nome  || '' },
      { id: 'f-login', label: 'Login', type: 'text', value: item?.login || '', disabled: editando },
      // senha só na criação (edição de senha é via reset dedicado)
      ...(editando ? [] : [{ id: 'f-senha', label: 'Senha', type: 'password', value: '' }]),
      { id: 'f-perfil', label: 'Perfil', type: 'select', value: item ? PERFIL_LABEL[item.perfil] : '', options: PERFIS },
    ],
    pecas: [
      { id: 'f-codigo',  label: 'Código',        type: 'text',   value: item?.codigo  || '' },
      { id: 'f-nome',    label: 'Nome da peça',   type: 'text',   value: item?.nome    || '' },
      { id: 'f-preco',   label: 'Preço (R$)',      type: 'number', value: item?.preco   ?? '', step: '0.01', min: '0' },
      { id: 'f-estoque', label: 'Estoque atual',   type: 'number', value: item?.estoque ?? '', min: '0' },
      { id: 'f-minimo',  label: 'Qtd. Mínima',     type: 'number', value: item?.minimo  ?? '', min: '0' },
    ],
    clientes: [
      { id: 'f-nome',     label: 'Nome do cliente', type: 'text', value: item?.nome     || '' },
      { id: 'f-telefone', label: 'Telefone',         type: 'text', value: item?.telefone || '' },
    ],
  };

  form.innerHTML = fieldDefs[currentTab].map(f => {
    if (f.type === 'select') {
      return `
        <div class="field">
          <select id="${f.id}" class="field__select">
            <option value="">Selecione...</option>
            ${f.options.map(opt => `<option value="${opt}" ${opt === f.value ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
          <label class="field__label" for="${f.id}">${f.label}</label>
        </div>
      `;
    }

    return `
      <div class="field">
        <input
          type="${f.type}"
          id="${f.id}"
          class="field__input"
          placeholder=" "
          value="${f.value}"
          autocomplete="off"
          ${f.disabled ? 'disabled' : ''}
          ${f.step ? `step="${f.step}"` : ''}
          ${f.min  ? `min="${f.min}"` : ''}
        >
        <label class="field__label" for="${f.id}">${f.label}</label>
      </div>
    `;
  }).join('');
}

/* ── Salvar (criar ou editar via API) ────────────────────── */
window.saveCadastro = async function() {
  const inputs = document.querySelectorAll('#modalForm .field__input, #modalForm .field__select');
  let valid = true;

  inputs.forEach(input => {
    const field = input.closest('.field');
    if (!input.disabled && !input.value.trim()) {
      field.classList.add('field--error');
      valid = false;
    } else {
      field.classList.remove('field--error');
    }
  });

  if (!valid) {
    showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  const payload = _buildPayload();
  const btn = document.getElementById('btnSalvar');
  btn.classList.add('btn--loading');
  btn.disabled = true;

  try {
    if (editingId === null) {
      await api.post(`/${currentTab}`, payload);
    } else {
      await api.put(`/${currentTab}/${editingId}`, payload);
    }
    closeModal('modalCadastro');
    showToast(`${_tabLabel()} ${editingId === null ? 'criado' : 'salvo'} com sucesso.`, 'success');
    await _initTable(currentTab);
  } catch (err) {
    console.error('[cadastros] falha ao salvar:', err);
    showToast(err instanceof ApiError ? err.message : 'Erro ao salvar.', 'error');
  } finally {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
  }
};

/* Monta o body conforme a aba e se é criação ou edição. */
function _buildPayload() {
  const val = (id) => document.getElementById(id)?.value.trim() ?? '';
  const num = (id) => Number(document.getElementById(id)?.value);

  if (currentTab === 'usuarios') {
    const perfil = PERFIL_VALUE[val('f-perfil')] || val('f-perfil');
    if (editingId === null) {
      return { nome: val('f-nome'), login: val('f-login'), senha: val('f-senha'), perfil };
    }
    return { nome: val('f-nome'), perfil };   // login/senha não mudam por aqui
  }

  if (currentTab === 'pecas') {
    return {
      codigo: val('f-codigo'),
      nome:   val('f-nome'),
      preco:  num('f-preco'),
      estoque: num('f-estoque'),
      minimo:  num('f-minimo'),
    };
  }

  // clientes
  return { nome: val('f-nome'), telefone: val('f-telefone') };
}

window.closeCadastroModal = () => closeModal('modalCadastro');

/* ── Desativar (DELETE usuário ; PUT ativo:false peça/cliente) ── */
window._confirmDeactivate = function(id) {
  pendingDeactivateId = id;
  openModal('modalConfirm');
};

window.confirmDeactivate = async function() {
  if (pendingDeactivateId === null) return;
  const id  = pendingDeactivateId;
  const tab = currentTab;

  const btn = document.getElementById('btnConfirmDeactivate');
  btn.classList.add('btn--loading');
  btn.disabled = true;

  try {
    if (tab === 'usuarios') {
      await api.del(`/usuarios/${id}`);
    } else {
      await api.put(`/${tab}/${id}`, { ativo: false });
    }
    closeModal('modalConfirm');
    showToast('Registro desativado com sucesso.', 'warning');
    pendingDeactivateId = null;
    await _initTable(tab);
  } catch (err) {
    console.error('[cadastros] falha ao desativar:', err);
    showToast(err instanceof ApiError ? err.message : 'Erro ao desativar.', 'error');
  } finally {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
  }
};

window.closeConfirmModal = () => closeModal('modalConfirm');

/* ── Helpers ─────────────────────────────────────────────── */
function _tabLabel() {
  const labels = { usuarios: 'Usuário', pecas: 'Peça', clientes: 'Cliente' };
  return labels[currentTab] || currentTab;
}
