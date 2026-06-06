/* =========================================================
   GERENCIAUTOMIX - CADASTROS.JS
   Gestão de: Usuários | Peças | Clientes
   ========================================================= */

const ITEMS_PER_PAGE = 10;

let currentTab  = "usuarios";
let currentPage = 1;
let searchTerm  = "";
let debounceTimer = null;
let pendingDeactivateId = null;

/* =========================================================
   DADOS MOCK
   ========================================================= */

const database = {

    usuarios: [
        { id: 1, nome: "Samuel Freitas",  email: "samuel@email.com",  perfil: "Administrador", status: "Ativo" },
        { id: 2, nome: "Luis Felipe",     email: "luis@email.com",    perfil: "Estoque",       status: "Ativo" },
        { id: 3, nome: "Carla Mendes",    email: "carla@email.com",   perfil: "Vendedor",      status: "Inativo" },
        { id: 4, nome: "Paulo Andrade",   email: "paulo@email.com",   perfil: "Estoque",       status: "Ativo" }
    ],

    pecas: [
        { id: 1, codigo: "PC001", nome: "Pneu Aro 15",       estoque: 12, minimo: 5 },
        { id: 2, codigo: "PC002", nome: "Bateria 60Ah",       estoque: 2,  minimo: 5 },
        { id: 3, codigo: "PC003", nome: "Óleo Motor 5W30",    estoque: 8,  minimo: 10 },
        { id: 4, codigo: "PC004", nome: "Pastilha de Freio",  estoque: 20, minimo: 8 },
        { id: 5, codigo: "PC005", nome: "Vela de Ignição",    estoque: 3,  minimo: 6 }
    ],

    clientes: [
        { id: 1, nome: "João Silva",   telefone: "(38) 99999-9999", veiculos: [{ placa: "ABC-1234", modelo: "Gol 1.6" },   { placa: "XYZ-5678", modelo: "Clio 1.0" }] },
        { id: 2, nome: "Maria Souza",  telefone: "(38) 98888-8888", veiculos: [{ placa: "QWE-2024", modelo: "Palio 1.4" }] },
        { id: 3, nome: "Carlos Lima",  telefone: "(38) 97777-7777", veiculos: [] },
        { id: 4, nome: "Ana Paula",    telefone: "(38) 96666-6666", veiculos: [{ placa: "MNO-3456", modelo: "HB20 1.0" }] }
    ]

};

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeTabs();
    initializeSearch();
    renderCurrentTab();
});

/* =========================================================
   TABS
   ========================================================= */

function initializeTabs() {

    document.querySelectorAll(".tab-button").forEach((button) => {

        button.addEventListener("click", () => {

            document.querySelectorAll(".tab-button")
                .forEach((btn) => btn.classList.remove("active"));

            button.classList.add("active");
            currentTab  = button.dataset.tab;
            currentPage = 1;
            searchTerm  = "";
            document.getElementById("searchInput").value = "";

            renderCurrentTab();

        });

    });

}

/* =========================================================
   BUSCA COM DEBOUNCE 300ms
   ========================================================= */

function initializeSearch() {

    const input = document.getElementById("searchInput");

    input.addEventListener("input", (event) => {

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            searchTerm  = event.target.value.toLowerCase().trim();
            currentPage = 1;
            renderCurrentTab();
        }, 300);

    });

}

/* =========================================================
   RENDERIZAÇÃO POR TAB
   ========================================================= */

function renderCurrentTab() {

    updateTableHeaders();

    switch (currentTab) {
        case "usuarios": renderUsuarios(); break;
        case "pecas":    renderPecas();    break;
        case "clientes": renderClientes(); break;
    }

}

/* Cabeçalhos dinâmicos por tab */
function updateTableHeaders() {

    const tableHead = document.getElementById("tableHead");

    const headers = {
        usuarios: ["Nome",   "E-mail",   "Perfil",   "Status",   "Ações"],
        pecas:    ["Código", "Nome",     "Estoque",  "Mínimo",   "Situação", "Ações"],
        clientes: ["Cliente","Telefone", "Veículos", "Ações"]
    };

    tableHead.innerHTML = headers[currentTab]
        .map((h) => `<th>${h}</th>`)
        .join("");

}

/* =========================================================
   USUÁRIOS
   ========================================================= */

function renderUsuarios() {

    const filtered = database.usuarios.filter((u) =>
        u.nome.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm) ||
        u.perfil.toLowerCase().includes(searchTerm)
    );

    renderTable(filtered, renderUsuarioRow);

}

function renderUsuarioRow(item) {

    const statusClass = item.status === "Ativo" ? "status-pago" : "status-cancelado";

    return `
        <td>${item.nome}</td>
        <td>${item.email}</td>
        <td>${item.perfil}</td>
        <td><span class="${statusClass}">${item.status}</span></td>
        <td>
            <div class="row-actions">
                <button class="btn btn--ghost btn--sm"  onclick="openEditModal(${item.id})">Editar</button>
                <button class="btn btn--danger btn--sm" onclick="openDeactivateModal(${item.id})">Desativar</button>
            </div>
        </td>
    `;

}

/* =========================================================
   PEÇAS
   ========================================================= */

function renderPecas() {

    const filtered = database.pecas.filter((p) =>
        p.nome.toLowerCase().includes(searchTerm) ||
        p.codigo.toLowerCase().includes(searchTerm)
    );

    renderTable(filtered, renderPecaRow);

}

function renderPecaRow(item) {

    const critical    = item.estoque <= item.minimo;
    const stockClass  = critical ? "stock-critical" : "stock-ok";
    const stockLabel  = critical ? "CRÍTICO" : "OK";

    return `
        <td>${item.codigo}</td>
        <td>${item.nome}</td>
        <td>${item.estoque}</td>
        <td>${item.minimo}</td>
        <td>
            <span class="stock-indicator ${stockClass}">
                <span class="stock-dot"></span>
                ${stockLabel}
            </span>
        </td>
        <td>
            <div class="row-actions">
                <button class="btn btn--ghost btn--sm"  onclick="openEditModal(${item.id})">Editar</button>
                <button class="btn btn--danger btn--sm" onclick="openDeactivateModal(${item.id})">Remover</button>
            </div>
        </td>
    `;

}

/* =========================================================
   CLIENTES — linha expansível com veículos
   ========================================================= */

function renderClientes() {

    const filtered = database.clientes.filter((c) =>
        c.nome.toLowerCase().includes(searchTerm) ||
        c.telefone.includes(searchTerm)
    );

    renderTable(filtered, renderClienteRow, true);

}

function renderClienteRow(item) {

    return `
        <td>
            <span class="expand-toggle" onclick="toggleVehicles(${item.id})" id="toggle-${item.id}">
                ▶ ${item.nome}
            </span>
        </td>
        <td>${item.telefone}</td>
        <td>${item.veiculos.length} veículo(s)</td>
        <td>
            <div class="row-actions">
                <button class="btn btn--ghost btn--sm"  onclick="openEditModal(${item.id})">Editar</button>
                <button class="btn btn--danger btn--sm" onclick="openDeactivateModal(${item.id})">Desativar</button>
            </div>
        </td>
    `;

}

/* =========================================================
   TABELA GENÉRICA
   ========================================================= */

function renderTable(data, rowRenderer, isClientes = false) {

    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";

    const start     = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = data.slice(start, start + ITEMS_PER_PAGE);

    if (!paginated.length) {

        const colspan = currentTab === "pecas" ? 6 : currentTab === "clientes" ? 4 : 5;

        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}">
                    <div class="empty-state">Nenhum registro encontrado.</div>
                </td>
            </tr>
        `;

        renderPagination(0);
        return;

    }

    paginated.forEach((item) => {

        const row = document.createElement("tr");
        row.innerHTML = rowRenderer(item);
        tableBody.appendChild(row);

        /* Linha de veículos para clientes */
        if (isClientes) {

            const vehicleRow = document.createElement("tr");
            vehicleRow.id        = `vehicles-${item.id}`;
            vehicleRow.className = "vehicle-row";

            const colspan = 4;
            const vehicleListHTML = item.veiculos.length
                ? item.veiculos.map((v) => `
                    <div class="vehicle-item">
                        <strong>${v.placa}</strong> — ${v.modelo}
                    </div>
                `).join("")
                : `<p style="color: var(--color-text-muted); margin: 0;">Nenhum veículo vinculado.</p>`;

            vehicleRow.innerHTML = `
                <td colspan="${colspan}">
                    <div class="vehicle-content">
                        <div class="vehicle-list">${vehicleListHTML}</div>
                        <button class="btn btn--accent btn--sm" onclick="addVehicle(${item.id})">
                            + Adicionar Veículo
                        </button>
                    </div>
                </td>
            `;

            tableBody.appendChild(vehicleRow);

        }

    });

    renderPagination(data.length);

}

/* =========================================================
   PAGINAÇÃO
   ========================================================= */

function renderPagination(totalItems) {

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {

        const button = document.createElement("button");
        button.className   = i === currentPage ? "page-button active" : "page-button";
        button.textContent = i;

        button.addEventListener("click", () => {
            currentPage = i;
            renderCurrentTab();
        });

        pagination.appendChild(button);

    }

}

/* =========================================================
   CLIENTES — toggle veículos
   ========================================================= */

function toggleVehicles(id) {

    const vehicleRow = document.getElementById(`vehicles-${id}`);
    const toggle     = document.getElementById(`toggle-${id}`);

    if (!vehicleRow) return;

    const isOpen = vehicleRow.classList.contains("show");

    vehicleRow.classList.toggle("show");
    toggle.innerHTML = (isOpen ? "▶" : "▼") + " " + toggle.textContent.slice(2);

}

function addVehicle(clienteId) {

    showToast(`Funcionalidade de adicionar veículo em desenvolvimento.`, "info");

}

/* =========================================================
   MODAL — abrir/criar/editar
   ========================================================= */

function openCreateModal() {

    document.getElementById("modalTitle").textContent = `Novo ${capitalize(currentTab)}`;

    /* Renderiza campos dinâmicos por tab */
    renderModalFields(null);

    openModal("cadastroModal");

}

function openEditModal(id) {

    document.getElementById("modalTitle").textContent = `Editar ${capitalize(currentTab)}`;

    const item = database[currentTab].find((i) => i.id === id);
    renderModalFields(item);

    openModal("cadastroModal");

}

/* Campos dinâmicos por tipo de cadastro */
function renderModalFields(item) {

    const form = document.querySelector(".modal-form");
    form.innerHTML = "";

    if (currentTab === "usuarios") {

        form.innerHTML = `
            ${fieldHTML("nome-modal",   "Nome",    "text",  item?.nome   || "")}
            ${fieldHTML("email-modal",  "E-mail",  "email", item?.email  || "")}
            ${fieldHTML("perfil-modal", "Perfil",  "text",  item?.perfil || "")}
        `;

    } else if (currentTab === "pecas") {

        form.innerHTML = `
            ${fieldHTML("codigo-modal",  "Código",     "text",   item?.codigo  || "")}
            ${fieldHTML("nome-modal",    "Nome",       "text",   item?.nome    || "")}
            ${fieldHTML("estoque-modal", "Estoque",    "number", item?.estoque ?? "")}
            ${fieldHTML("minimo-modal",  "Qtd. Mínima","number", item?.minimo  ?? "")}
        `;

    } else if (currentTab === "clientes") {

        form.innerHTML = `
            ${fieldHTML("nome-modal",     "Nome",     "text", item?.nome     || "")}
            ${fieldHTML("telefone-modal", "Telefone", "text", item?.telefone || "")}
        `;

    }

}

function fieldHTML(id, label, type, value) {
    return `
        <div class="input-group">
            <input type="${type}" id="${id}" placeholder=" " value="${value}">
            <label for="${id}">${label}</label>
        </div>
    `;
}

/* =========================================================
   MODAL — desativar (com confirmação)
   ========================================================= */

function openDeactivateModal(id) {
    pendingDeactivateId = id;
    openModal("confirmModal");
}

function confirmDeactivate() {

    if (pendingDeactivateId !== null) {

        showToast("Registro desativado com sucesso.", "warning");
        pendingDeactivateId = null;

    }

    closeModal("confirmModal");

}

/* =========================================================
   SALVAR
   ========================================================= */

function saveCadastro() {

    showToast("Cadastro salvo com sucesso.", "success");
    closeModal("cadastroModal");

}

/* =========================================================
   HELPERS
   ========================================================= */

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
