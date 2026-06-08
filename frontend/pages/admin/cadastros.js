/**
 * pages/admin/cadastros.js
 * ============================================================
 * Controlador da página de Cadastros (Usuários / Peças / Clientes).
 *
 * Arquitetura:
 *  - Importa auth.js  → guarda de autenticação
 *  - Importa layout.js → shell da aplicação
 *  - Importa DataTable → renderização de tabela reutilizável
 *  - Importa modal.js  → openModal / closeModal / initModals
 *  - Importa toast.js  → showToast
 *
 * Dados: mock local.
 * Para conectar ao backend, substituir apenas as funções
 * _fetchUsuarios(), _fetchPecas(), _fetchClientes(),
 * _saveRecord() e _deactivateRecord().
 * ============================================================ */

import { requireAuth }  from '../../core/auth.js';
import { initLayout }   from '../../components/layout.js';
import { DataTable }    from '../../core/table.js';
import { openModal, closeModal, initModals } from '../../components/modal.js';
import { showToast }    from '../../components/toast.js';

/* ── Guard ──────────────────────────────────────────────── */
requireAuth('../../login.html');

/* ── Estado ─────────────────────────────────────────────── */
let currentTab          = 'usuarios';
let pendingDeactivateId = null;
let debounceTimer       = null;
let table               = null;

/* ── Perfis válidos do sistema ──────────────────────────── */
const PERFIS = ['Administrador', 'Estoque', 'Vendedor', 'Caixa', 'Montador'];

/* ── Mock DB ────────────────────────────────────────────── */
const DB = {
  usuarios: [
    { id: 1, nome: 'Samuel Freitas', email: 'samuel@automix.com',  perfil: 'Administrador', status: 'Ativo' },
    { id: 2, nome: 'Luis Felipe',    email: 'luis@automix.com',    perfil: 'Estoque',       status: 'Ativo' },
    { id: 3, nome: 'Carla Mendes',   email: 'carla@automix.com',   perfil: 'Vendedor',      status: 'Inativo' },
    { id: 4, nome: 'Paulo Andrade',  email: 'paulo@automix.com',   perfil: 'Caixa',         status: 'Ativo' },
    { id: 5, nome: 'Ricardo Costa',  email: 'ricardo@automix.com', perfil: 'Montador',      status: 'Ativo' },
  ],

  pecas: [
    { id: 1, codigo: 'PC001', nome: 'Pneu Aro 15',      estoque: 12, minimo: 5,  preco: 320.00 },
    { id: 2, codigo: 'PC002', nome: 'Bateria 60Ah',      estoque: 2,  minimo: 5,  preco: 450.00 },
    { id: 3, codigo: 'PC003', nome: 'Óleo Motor 5W30',   estoque: 8,  minimo: 10, preco: 45.90  },
    { id: 4, codigo: 'PC004', nome: 'Pastilha de Freio', estoque: 20, minimo: 8,  preco: 89.90  },
    { id: 5, codigo: 'PC005', nome: 'Vela de Ignição',   estoque: 3,  minimo: 6,  preco: 35.00  },
    { id: 6, codigo: 'PC006', nome: 'Filtro de Ar',      estoque: 15, minimo: 4,  preco: 28.50  },
  ],

  clientes: [
    { id: 1, nome: 'João Silva',   telefone: '(38) 99999-9999', veiculos: [{ placa: 'ABC-1234', modelo: 'Gol 1.6' }, { placa: 'XYZ-5678', modelo: 'Clio 1.0' }] },
    { id: 2, nome: 'Maria Souza',  telefone: '(38) 98888-8888', veiculos: [{ placa: 'QWE-2024', modelo: 'Palio 1.4' }] },
    { id: 3, nome: 'Carlos Lima',  telefone: '(38) 97777-7777', veiculos: [] },
    { id: 4, nome: 'Ana Paula',    telefone: '(38) 96666-6666', veiculos: [{ placa: 'MNO-3456', modelo: 'HB20 1.0' }] },
  ],
};

/* ── Helpers de formatação ──────────────────────────────── */
function _fmtCurrency(value) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

/* ── Colunas por tab ─────────────────────────────────────── */
const COLUMNS = {
  usuarios: [
    { key: 'nome',   label: 'Nome' },
    { key: 'email',  label: 'E-mail' },
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

/* ── Row renderers ───────────────────────────────────────── */
const RENDERERS = {
  usuarios: (item) => `
    <td>${item.nome}</td>
    <td class="u-text-muted">${item.email}</td>
    <td>${item.perfil}</td>
    <td>
      <span class="badge ${item.status === 'Ativo' ? 'badge--pago' : 'badge--cancelado'}">
        <span class="badge__dot"></span>${item.status}
      </span>
    </td>
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
    <td class="u-text-muted">${item.veiculos.length} veículo(s)</td>
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

/* ── Tabela ──────────────────────────────────────────────── */
function _initTable(tab) {
  const container = document.getElementById('tableContainer');

  table = new DataTable({
    container,
    columns:     COLUMNS[tab],
    rowRenderer: RENDERERS[tab],
    onEmpty:     'Nenhum registro encontrado para esta busca.',
    itemsPerPage: 10,
  });

  table.setData(DB[tab]);
}

/* ── Busca com debounce 300ms ────────────────────────────── */
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
  const cliente = DB.clientes.find(c => c.id === clienteId);
  if (!cliente) return;

  const isExpanded = btn.classList.toggle('expanded');
  btn.setAttribute('aria-expanded', String(isExpanded));

  const existingRow = document.getElementById(`vehicles-row-${clienteId}`);

  if (!isExpanded) {
    existingRow?.remove();
    return;
  }

  const tr = btn.closest('tr');
  const colspan = COLUMNS.clientes.length;

  const vehicleHTML = cliente.veiculos.length
    ? cliente.veiculos.map((v, idx) => `
        <div class="vehicle-item">
          <svg aria-hidden="true"><use href="../../icons/icons.svg#icon-car"/></svg>
          <strong>${v.placa}</strong> — ${v.modelo}
          <button class="btn btn--ghost btn--sm vehicle-remove-btn" onclick="window._removeVehicle(${clienteId}, ${idx})" title="Desvincular veículo">
            <svg style="width:14px;height:14px" aria-hidden="true"><use href="../../icons/icons.svg#icon-x"/></svg>
          </button>
        </div>`).join('')
    : `<p class="u-text-muted" style="font-size:var(--font-size-sm)">Nenhum veículo vinculado.</p>`;

  const vehicleRow = document.createElement('tr');
  vehicleRow.id        = `vehicles-row-${clienteId}`;
  vehicleRow.className = 'row--child row--visible';
  vehicleRow.innerHTML = `
    <td colspan="${colspan}">
      <div class="vehicle-expand">
        <div class="vehicle-list">${vehicleHTML}</div>
        <button class="btn btn--accent btn--sm" onclick="window._addVehicle(${clienteId})">
          <svg style="width:13px;height:13px" aria-hidden="true"><use href="../../icons/icons.svg#icon-plus"/></svg>
          Adicionar Veículo
        </button>
      </div>
    </td>`;

  tr.insertAdjacentElement('afterend', vehicleRow);
};

window._addVehicle = function(clienteId) {
  showToast('Funcionalidade de adicionar veículo em desenvolvimento.', 'info');
};

/* ── Remover veículo do cliente ─────────────────────────── */
window._removeVehicle = function(clienteId, vehicleIndex) {
  const cliente = DB.clientes.find(c => c.id === clienteId);
  if (!cliente) return;

  const veiculo = cliente.veiculos[vehicleIndex];
  if (!veiculo) return;

  cliente.veiculos.splice(vehicleIndex, 1);

  // Re-renderiza a expand row
  const expandRow = document.getElementById(`vehicles-row-${clienteId}`);
  if (expandRow) expandRow.remove();

  const btn = document.getElementById(`expandBtn-${clienteId}`);
  if (btn) {
    btn.classList.remove('expanded');
    btn.setAttribute('aria-expanded', 'false');
  }

  // Atualiza a tabela inteira (contagem de veículos muda)
  _initTable(currentTab);

  showToast(`Veículo ${veiculo.placa} desvinculado com sucesso.`, 'success');
};

/* ── Modal Criar ─────────────────────────────────────────── */
function _openCreateModal() {
  document.getElementById('modalCadastroTitle').textContent = `Novo ${_tabLabel()}`;
  _renderFormFields(null);
  openModal('modalCadastro');
}

/* ── Modal Editar ────────────────────────────────────────── */
window._editRecord = function(id) {
  const item = DB[currentTab].find(i => i.id === id);
  if (!item) return;
  document.getElementById('modalCadastroTitle').textContent = `Editar ${_tabLabel()}`;
  _renderFormFields(item);
  openModal('modalCadastro');
};

/* ── Campos dinâmicos por tab ────────────────────────────── */
function _renderFormFields(item) {
  const form = document.getElementById('modalForm');

  const fieldDefs = {
    usuarios: [
      { id: 'f-nome',   label: 'Nome completo', type: 'text',   value: item?.nome   || '' },
      { id: 'f-email',  label: 'E-mail',         type: 'email',  value: item?.email  || '' },
      { id: 'f-perfil', label: 'Perfil',          type: 'select', value: item?.perfil || '', options: PERFIS },
    ],
    pecas: [
      { id: 'f-codigo',  label: 'Código',        type: 'text',   value: item?.codigo  || '' },
      { id: 'f-nome',    label: 'Nome da peça',   type: 'text',   value: item?.nome    || '' },
      { id: 'f-preco',   label: 'Preço (R$)',      type: 'number', value: item?.preco   ?? '', step: '0.01', min: '0' },
      { id: 'f-estoque', label: 'Estoque atual',   type: 'number', value: item?.estoque ?? '' },
      { id: 'f-minimo',  label: 'Qtd. Mínima',     type: 'number', value: item?.minimo  ?? '' },
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
          ${f.step ? `step="${f.step}"` : ''}
          ${f.min  ? `min="${f.min}"` : ''}
        >
        <label class="field__label" for="${f.id}">${f.label}</label>
      </div>
    `;
  }).join('');
}

/* ── Salvar ──────────────────────────────────────────────── */
window.saveCadastro = function() {
  const inputs = document.querySelectorAll('#modalForm .field__input, #modalForm .field__select');
  let valid = true;

  inputs.forEach(input => {
    const field = input.closest('.field');
    if (!input.value.trim()) {
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

  const btn = document.getElementById('btnSalvar');
  btn.classList.add('btn--loading');
  btn.disabled = true;

  setTimeout(() => {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
    closeModal('modalCadastro');
    showToast(`${_tabLabel()} salvo com sucesso.`, 'success');
  }, 800);
};

window.closeCadastroModal = () => closeModal('modalCadastro');

/* ── Desativar ───────────────────────────────────────────── */
window._confirmDeactivate = function(id) {
  pendingDeactivateId = id;
  openModal('modalConfirm');
};

window.confirmDeactivate = function() {
  if (pendingDeactivateId !== null) {
    showToast('Registro desativado com sucesso.', 'warning');
    pendingDeactivateId = null;
  }
  closeModal('modalConfirm');
};

window.closeConfirmModal = () => closeModal('modalConfirm');

/* ── Helpers ─────────────────────────────────────────────── */
function _tabLabel() {
  const labels = { usuarios: 'Usuário', pecas: 'Peça', clientes: 'Cliente' };
  return labels[currentTab] || currentTab;
}
