/**
 * components/modal.js
 * ============================================================
 * Sistema de modais acessível.
 *   - Animação slide-up 250ms
 *   - Fecha com ESC ou clique no overlay
 *   - Focus trap dentro do modal
 *   - Scroll lock no body enquanto aberto
 * ============================================================ */

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * @param {string} id  - id do .modal-overlay
 */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) { console.warn(`[Modal] Elemento não encontrado: #${id}`); return; }

  overlay.classList.add('modal--open');
  document.body.style.overflow = 'hidden';

  // Foca no primeiro elemento focável
  requestAnimationFrame(() => {
    const first = overlay.querySelector(FOCUSABLE);
    first?.focus();
  });

  // ESC
  overlay._escHandler = (e) => { if (e.key === 'Escape') closeModal(id); };
  document.addEventListener('keydown', overlay._escHandler);

  // Focus trap
  overlay._trapHandler = (e) => _trapFocus(e, overlay);
  overlay.addEventListener('keydown', overlay._trapHandler);
}

/**
 * @param {string} id
 */
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;

  overlay.classList.remove('modal--open');
  document.body.style.overflow = '';

  document.removeEventListener('keydown', overlay._escHandler);
  overlay.removeEventListener('keydown', overlay._trapHandler);
}

function _trapFocus(e, overlay) {
  if (e.key !== 'Tab') return;
  const focusable = [...overlay.querySelectorAll(FOCUSABLE)];
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

/** Inicializa todos os overlays da página para fechar ao clicar fora. */
function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

export { openModal, closeModal, initModals };
