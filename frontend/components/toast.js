/**
 * components/toast.js
 * ============================================================
 * Sistema de notificações toast.
 *   - Máximo 4 simultâneos
 *   - Auto-dismiss em 4s com fade-out
 *   - Tipos: success | error | warning | info
 *   - Acessível: role="alert" + aria-live
 * ============================================================ */

const MAX = 4;
const DURATION = 4000;

let _container = null;

function _getContainer() {
  if (!_container) {
    _container = document.createElement('div');
    _container.id            = 'toast-container';
    _container.className     = 'toast-container';
    _container.setAttribute('aria-live', 'polite');
    _container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(_container);
  }
  return _container;
}

/**
 * Exibe um toast.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 */
function showToast(message, type = 'info') {
  const container = _getContainer();
  const active    = container.querySelectorAll('.toast');

  if (active.length >= MAX) active[0].remove();

  const icons = {
    success: 'icon-check',
    error:   'icon-alert',
    warning: 'icon-alert',
    info:    'icon-info',
  };

  const toast = document.createElement('div');
  toast.className   = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML   = `
    <svg class="toast__icon" aria-hidden="true">
      <use href="../icons/icons.svg#${icons[type]}"/>
    </svg>
    <span class="toast__message">${message}</span>
    <button class="toast__close" aria-label="Fechar notificação">
      <svg aria-hidden="true"><use href="../icons/icons.svg#icon-x"/></svg>
    </button>
  `;

  toast.querySelector('.toast__close').addEventListener('click', () => _dismiss(toast));
  container.appendChild(toast);

  // Force reflow para animar entrada
  toast.getBoundingClientRect();
  toast.classList.add('toast--visible');

  const timer = setTimeout(() => _dismiss(toast), DURATION);
  toast._timer = timer;
}

function _dismiss(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('toast--visible');
  toast.classList.add('toast--leaving');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

export { showToast };
