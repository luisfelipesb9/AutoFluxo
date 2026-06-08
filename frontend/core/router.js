/**
 * core/router.js
 * ============================================================
 * Mapa de rotas e permissões por perfil.
 *
 * Cada entrada define:
 *  - path:   caminho relativo à raiz de /frontend/
 *  - label:  texto do menu
 *  - icon:   id do símbolo SVG (sem "#")
 *  - roles:  quais perfis têm acesso
 * ============================================================ */

/** @type {Array<{path:string, label:string, icon:string, roles:string[]}>} */
const ROUTES = [
  {
    path:  'pages/dashboard.html',
    label: 'Dashboard',
    icon:  'icon-dashboard',
    roles: ['admin', 'estoque', 'vendedor', 'caixa', 'montador'],
  },
  {
    path:  'pages/pedidos.html',
    label: 'Pedidos',
    icon:  'icon-orders',
    roles: ['admin', 'estoque', 'vendedor', 'caixa', 'montador'],
  },
  {
    path:  'pages/novo-pedido.html',
    label: 'Novo Pedido',
    icon:  'icon-plus',
    roles: ['vendedor', 'admin', 'caixa'],
  },
  {
    path:  'pages/caixa.html',
    label: 'Caixa',
    icon:  'icon-orders',
    roles: ['admin', 'caixa'],
  },
  {
    path:  'pages/estoque.html',
    label: 'Estoque',
    icon:  'icon-estoque',
    roles: ['admin', 'estoque'],
  },
  {
    path:  'pages/admin/cadastros.html',
    label: 'Cadastros',
    icon:  'icon-cadastros',
    roles: ['admin'],
  },
  {
    path:  'pages/relatorios.html',
    label: 'Relatórios',
    icon:  'icon-relatorios',
    roles: ['admin'],
  },
];

/**
 * Retorna apenas as rotas acessíveis para um dado perfil.
 * @param {string} role
 * @returns {typeof ROUTES}
 */
function getRoutesForRole(role) {
  return ROUTES.filter(r => r.roles.includes(role));
}

/**
 * Resolve o caminho absoluto de uma rota a partir de qualquer
 * profundidade de subpasta.
 * @param {string} routePath  - ex.: "pages/dashboard.html"
 * @param {number} depth      - níveis abaixo de /frontend/ (0 = raiz)
 * @returns {string}
 */
function resolvePath(routePath, depth = 0) {
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  return `${prefix}${routePath}`;
}

/**
 * Retorna a profundidade da página atual em relação a /frontend/.
 * @returns {number}
 */
function getCurrentDepth() {
  const parts  = window.location.pathname.split('/');
  const idx    = parts.indexOf('frontend');
  if (idx === -1) return 0;
  return parts.length - idx - 2; // -2: "frontend" + filename
}

export { ROUTES, getRoutesForRole, resolvePath, getCurrentDepth };
