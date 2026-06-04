document.addEventListener("DOMContentLoaded", () => {

    const currentUser = {

        name: "User",
        role: "estoque"

    };

    const menuItems = {

        admin: [
            "Dashboard",
            "Pedidos",
            "Usuários",
            "Relatórios"
        ],

        estoque: [
            "Dashboard",
            "Pedidos",
            "Estoque"
        ],

        vendedor: [
            "Dashboard",
            "Pedidos"
        ]

    };

    /* MENU DINÂMICO */

    const sidebarMenu =
        document.getElementById("sidebarMenu");

    if (sidebarMenu) {

        sidebarMenu.innerHTML = "";

        menuItems[currentUser.role].forEach(
            (item, index) => {

                const link =
                    document.createElement("a");

                link.href = "#";

                link.className =
                    index === 0
                        ? "menu-item active"
                        : "menu-item";

                link.textContent = item;

                sidebarMenu.appendChild(link);

            }
        );

    }

    /* NOME DO USUÁRIO */

    const userMenu =
        document.getElementById("userMenu");

    if (userMenu) {

        userMenu.textContent =
            `${currentUser.name} ▼`;

    }

    /* MOBILE SIDEBAR */

    const sidebar =
        document.getElementById("sidebar");

    const overlay =
        document.getElementById("overlay");

    const hamburger =
        document.getElementById("hamburger");

    if (hamburger) {

        hamburger.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle("open");

                overlay.classList.toggle("active");

            }
        );

    }

    if (overlay) {

        overlay.addEventListener(
            "click",
            () => {

                sidebar.classList.remove("open");

                overlay.classList.remove("active");

            }
        );

    }

    /* DROPDOWN */

    const dropdownMenu =
        document.getElementById("dropdownMenu");

    if (userMenu && dropdownMenu) {

        userMenu.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                dropdownMenu.classList.toggle("show");

            }
        );

        document.addEventListener(
            "click",
            () => {

                dropdownMenu.classList.remove("show");

            }
        );

    }

});