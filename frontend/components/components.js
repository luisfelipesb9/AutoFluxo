/* ==================================================
   GERENCIAUTOMIX UI COMPONENTS
   Arquivo: components.js

   Responsabilidade:
   - Modal
   - Toast
   - Componentes reutilizáveis

   Dependências:
   - components.css

   Autor:
   Equipe AutoFluxo
================================================== */


/* ==================================================
   MODAL
================================================== */

/**
 * Abre um modal pelo ID.
 *
 * @param {string} modalId
 */
function openModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (!modal) {

        console.warn(
            `Modal não encontrado: ${modalId}`
        );

        return;

    }

    modal.classList.add("show");

}

/**
 * Fecha um modal pelo ID.
 *
 * @param {string} modalId
 */
function closeModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (!modal) {

        return;

    }

    modal.classList.remove("show");

}


/* ==================================================
   TOAST
================================================== */

const MAX_TOASTS = 4;

/**
 * Exibe um toast temporário.
 *
 * @param {string} message
 * @param {string} type
 */
function showToast(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "toastContainer"
        );

    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );

    }

    const activeToasts =
        container.querySelectorAll(
            ".toast"
        );

    if (
        activeToasts.length >=
        MAX_TOASTS
    ) {

        activeToasts[0].remove();

    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast--${type}`;

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateX(30px)";

        toast.style.transition =
            "200ms";

        setTimeout(() => {

            toast.remove();

        }, 200);

    }, 4000);

}


/* ==================================================
   INICIALIZAÇÃO AUTOMÁTICA
================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeModals();

    }
);


/* ==================================================
   MODAL - ESC
================================================== */

function initializeModals() {

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                const openedModals =
                    document.querySelectorAll(
                        ".modal-overlay.show"
                    );

                openedModals.forEach(
                    (modal) => {

                        modal.classList.remove(
                            "show"
                        );

                    }
                );

            }

        }
    );

    initializeModalOverlay();

}


/* ==================================================
   MODAL - CLIQUE FORA
================================================== */

function initializeModalOverlay() {

    const overlays =
        document.querySelectorAll(
            ".modal-overlay"
        );

    overlays.forEach(
        (overlay) => {

            overlay.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        overlay.classList.remove(
                            "show"
                        );

                    }

                }
            );

        }
    );

}


/* ==================================================
   HELPERS DE DEMONSTRAÇÃO
================================================== */

/**
 * Toast de sucesso.
 */
function demoSuccessToast() {

    showToast(
        "Operação realizada com sucesso.",
        "success"
    );

}

/**
 * Toast de erro.
 */
function demoErrorToast() {

    showToast(
        "Ocorreu um erro na operação.",
        "error"
    );

}

/**
 * Toast de aviso.
 */
function demoWarningToast() {

    showToast(
        "Atenção aos dados informados.",
        "warning"
    );

}

/**
 * Toast informativo.
 */
function demoInfoToast() {

    showToast(
        "Nova atualização disponível.",
        "info"
    );

}