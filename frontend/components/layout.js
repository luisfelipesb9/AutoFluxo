/**
 * components/layout.js
 * ============================================================
 * Inicializa o shell da aplicação:
 *  - Sidebar: menu dinâmico por perfil, item ativo, mobile overlay
 *  - Header: nome do usuário, dropdown, notificações
 *  - Sidebar footer: nome do operador + logout
 *
 * Dependências: core/auth.js, core/router.js
 * ============================================================ */

import { getUser, logout }               from '../core/auth.js';
import { escapeHtml }                    from '../core/utils.js';
import { getRoutesForRole, resolvePath, getCurrentDepth } from '../core/router.js';

/**
 * Ponto de entrada — chamar no DOMContentLoaded de cada página com layout.
 * @param {{ pageTitle?: string }} [options]
 */
function initLayout(options = {}) {
  const user = getUser();
  if (!user) return; // requireAuth() já redirecionou

  const depth = getCurrentDepth();

  _buildSidebar(user, depth);
  _buildHeader(user, options.pageTitle);
  _initMobileMenu();
  _initUserDropdown();
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR                                                             */
/* ------------------------------------------------------------------ */

function _buildSidebar(user, depth) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // — Menu —
  const menuEl = sidebar.querySelector('#sidebarMenu');
  if (menuEl) {
    const routes = getRoutesForRole(user.role);
    menuEl.innerHTML = routes.map(route => {
      const href    = resolvePath(route.path, depth);
      const isActive = window.location.pathname.endsWith(route.path.split('/').pop());
      return `
        <a href="${href}"
           class="menu-item${isActive ? ' menu-item--active' : ''}"
           aria-current="${isActive ? 'page' : 'false'}">
          <svg class="menu-item__icon" aria-hidden="true">
            <use href="${resolvePath('icons/icons.svg', depth)}#${route.icon}"/>
          </svg>
          <span class="menu-item__label">${route.label}</span>
        </a>`;
    }).join('');
  }

  // — Footer —
  const existingFooter = sidebar.querySelector('.sidebar-footer');
  if (existingFooter) existingFooter.remove();

  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = `
    <div class="sidebar-footer__info">
      <svg class="sidebar-footer__avatar" aria-hidden="true">
        <use href="${resolvePath('icons/icons.svg', depth)}#icon-user"/>
      </svg>
      <div class="sidebar-footer__text">
        <span class="sidebar-footer__name">${escapeHtml(user.name)}</span>
        <span class="sidebar-footer__role">${escapeHtml(_roleLabel(user.role))}</span>
      </div>
    </div>
    <button class="sidebar-footer__logout" id="sidebarLogoutBtn" aria-label="Sair do sistema">
      <svg aria-hidden="true"><use href="${resolvePath('icons/icons.svg', depth)}#icon-logout"/></svg>
    </button>
  `;
  sidebar.appendChild(footer);

  document.getElementById('sidebarLogoutBtn')
    ?.addEventListener('click', () => logout(resolvePath('login.html', depth)));
}

/* ------------------------------------------------------------------ */
/*  HEADER                                                              */
/* ------------------------------------------------------------------ */

function _buildHeader(user, pageTitle) {
  // Título da página
  const titleEl = document.getElementById('pageTitle');
  if (titleEl && pageTitle) titleEl.textContent = pageTitle;

  // Nome no user menu
  const userNameEl = document.getElementById('headerUserName');
  if (userNameEl) userNameEl.textContent = user.name;

  // Logout pelo header dropdown
  document.getElementById('headerLogoutBtn')
    ?.addEventListener('click', e => {
      e.preventDefault();
      logout();
    });
}

/* ------------------------------------------------------------------ */
/*  MOBILE — Hamburger / Overlay                                        */
/* ------------------------------------------------------------------ */

function _initMobileMenu() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');

  function openMenu()  { sidebar?.classList.add('sidebar--open');  overlay?.classList.add('overlay--visible'); hamburger?.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { sidebar?.classList.remove('sidebar--open'); overlay?.classList.remove('overlay--visible'); hamburger?.setAttribute('aria-expanded', 'false'); }

  hamburger?.addEventListener('click', () =>
    sidebar?.classList.contains('sidebar--open') ? closeMenu() : openMenu()
  );

  overlay?.addEventListener('click', closeMenu);

  // Fecha ao navegar em mobile
  document.querySelectorAll('.menu-item').forEach(item =>
    item.addEventListener('click', () => {
      if (window.innerWidth < 768) closeMenu();
    })
  );
}

/* ------------------------------------------------------------------ */
/*  DROPDOWN DO USUÁRIO                                                 */
/* ------------------------------------------------------------------ */

function _initUserDropdown() {
  const trigger  = document.getElementById('userMenuTrigger');
  const dropdown = document.getElementById('userDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('dropdown--open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('dropdown--open');
    trigger?.setAttribute('aria-expanded', 'false');
  });
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */

function _roleLabel(role) {
  const labels = {
    admin:    'Administrador',
    estoque:  'Estoque',
    vendedor: 'Vendedor',
    caixa:    'Caixa',
    montador: 'Montador',
  };
  return labels[role] || role;
}

export { initLayout };
