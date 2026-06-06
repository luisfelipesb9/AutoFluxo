/* =========================================================
   GERENCIAUTOMIX - LAYOUT.JS
   - Menu dinâmico por perfil (com ícones)
   - Sidebar footer com operador + logout
   - Sidebar mobile (hamburger / overlay)
   - Dropdown do usuário
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       USUÁRIO LOGADO (mock — será substituído por JWT)
       ===================================================== */

    const currentUser = {
        name: "Samuel Freitas",
        role: "admin"
        /*
          Perfis: admin | estoque | vendedor
        */
    };

    /* =====================================================
       DETECTA PÁGINA ATUAL
       ===================================================== */

    const isAdminPage = window.location.pathname.includes("/admin/");

    /* =====================================================
       ROTAS
       ===================================================== */

    const routes = {
        dashboard: isAdminPage ? "../dashboard.html" : "./dashboard.html",
        cadastros:  isAdminPage ? "./cadastros.html"  : "./admin/cadastros.html"
    };

    /* =====================================================
       MENUS POR PERFIL (com ícones)
       ===================================================== */

    const menuItems = {

        admin: [
            { icon: "📊", title: "Dashboard", url: routes.dashboard },
            { icon: "📋", title: "Cadastros",  url: routes.cadastros },
            { icon: "🛒", title: "Pedidos",    url: "#" },
            { icon: "📈", title: "Relatórios", url: "#" }
        ],

        estoque: [
            { icon: "📊", title: "Dashboard", url: routes.dashboard },
            { icon: "🛒", title: "Pedidos",   url: "#" },
            { icon: "📦", title: "Estoque",   url: "#" }
        ],

        vendedor: [
            { icon: "📊", title: "Dashboard", url: routes.dashboard },
            { icon: "🛒", title: "Pedidos",   url: "#" }
        ]

    };

    /* =====================================================
       SIDEBAR — menu dinâmico
       ===================================================== */

    const sidebarMenu = document.getElementById("sidebarMenu");

    if (sidebarMenu) {

        sidebarMenu.innerHTML = "";

        const items = menuItems[currentUser.role] || menuItems.admin;

        items.forEach((item) => {

            const link = document.createElement("a");
            link.href = item.url;
            link.classList.add("menu-item");

            /* Item ativo */
            const targetFile = item.url.split("/").pop();
            if (window.location.pathname.endsWith(targetFile)) {
                link.classList.add("active");
            }

            link.innerHTML = `
                <span class="menu-icon">${item.icon}</span>
                <span>${item.title}</span>
            `;

            sidebarMenu.appendChild(link);

        });

    }

    /* =====================================================
       SIDEBAR — footer com operador + logout
       ===================================================== */

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {

        /* Remove footer existente para evitar duplicatas */
        const existingFooter = sidebar.querySelector(".sidebar-footer");
        if (existingFooter) existingFooter.remove();

        const footer = document.createElement("div");
        footer.className = "sidebar-footer";
        footer.innerHTML = `
            <span class="sidebar-operator">${currentUser.name}</span>
            <button class="sidebar-logout" id="sidebarLogoutBtn">Sair</button>
        `;
        sidebar.appendChild(footer);

        document.getElementById("sidebarLogoutBtn").addEventListener("click", () => {
            window.location.href = isAdminPage ? "../login.html" : "./login.html";
        });

    }

    /* =====================================================
       NOME NO HEADER
       ===================================================== */

    const userMenu = document.getElementById("userMenu");
    if (userMenu) {
        userMenu.innerHTML = `${currentUser.name} ▼`;
    }

    /* =====================================================
       SIDEBAR MOBILE — hamburger
       ===================================================== */

    const overlay   = document.getElementById("overlay");
    const hamburger = document.getElementById("hamburger");

    if (hamburger && sidebar && overlay) {

        hamburger.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            overlay.classList.toggle("active");
        });

    }

    if (overlay && sidebar) {

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        });

    }

    /* =====================================================
       DROPDOWN DO USUÁRIO
       ===================================================== */

    const dropdownMenu = document.getElementById("dropdownMenu");

    if (userMenu && dropdownMenu) {

        userMenu.addEventListener("click", (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!userMenu.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove("show");
            }
        });

    }

    /* =====================================================
       LOGOUT (header)
       ===================================================== */

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = isAdminPage ? "../login.html" : "./login.html";
        });

    }

});
