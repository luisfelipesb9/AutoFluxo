/* =========================================================
   GERENCIAUTOMIX - COMPONENTS.JS
   - openModal / closeModal
   - showToast (max 4, auto-dismiss 4s)
   - ESC fecha modal
   - Clique fora fecha modal
   ========================================================= */

const MAX_TOASTS = 4;

/* =========================================================
   MODAL
   ========================================================= */

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`Modal não encontrado: ${modalId}`);
        return;
    }
    modal.classList.add("show");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("show");
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "info") {

    let container = document.getElementById("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id        = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    /* Limita máximo de 4 toasts simultâneos */
    const activeToasts = container.querySelectorAll(".toast");
    if (activeToasts.length >= MAX_TOASTS) {
        activeToasts[0].remove();
    }

    const toast = document.createElement("div");
    toast.className   = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    /* Auto-dismiss com fade out */
    setTimeout(() => {
        toast.style.transition = "opacity 200ms ease, transform 200ms ease";
        toast.style.opacity    = "0";
        toast.style.transform  = "translateX(24px)";
        setTimeout(() => toast.remove(), 200);
    }, 4000);

}

/* =========================================================
   INICIALIZAÇÃO AUTOMÁTICA
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeModals();
});

/* ESC fecha qualquer modal aberto */
function initializeModals() {

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            document.querySelectorAll(".modal-overlay.show")
                .forEach((modal) => modal.classList.remove("show"));
        }
    });

    initializeModalOverlay();

}

/* Clique no overlay (fora do .modal) fecha */
function initializeModalOverlay() {

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                overlay.classList.remove("show");
            }
        });

    });

}

/* =========================================================
   HELPERS DE DEMO
   ========================================================= */

function demoSuccessToast() { showToast("Operação realizada com sucesso.", "success"); }
function demoErrorToast()   { showToast("Ocorreu um erro na operação.", "error"); }
function demoWarningToast() { showToast("Atenção aos dados informados.", "warning"); }
function demoInfoToast()    { showToast("Nova atualização disponível.", "info"); }
