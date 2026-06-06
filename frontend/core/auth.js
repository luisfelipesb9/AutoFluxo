/**
 * core/auth.js
 * ============================================================
 * Módulo centralizado de autenticação e sessão do usuário.
 *
 * Responsabilidades:
 *  - Armazenar/recuperar o usuário logado (sessionStorage)
 *  - Verificar autenticação em cada página protegida
 *  - Realizar logout de forma padronizada
 *  - Expor o usuário corrente para outros módulos
 *
 * NOTA: No estado atual os dados são mock.
 * Quando o backend JWT estiver pronto, apenas as funções
 * login() e _fetchSession() precisam ser atualizadas.
 * ============================================================ */

const AUTH_KEY = 'gmx_session';

/** @typedef {{ id: number, name: string, role: 'admin'|'estoque'|'vendedor'|'caixa'|'montador' }} User */

/**
 * Retorna o usuário logado ou null se não houver sessão.
 * @returns {User|null}
 */
function getUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persiste a sessão do usuário.
 * @param {User} user
 */
function _setUser(user) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

/**
 * Realiza login (mock — substituir por fetch ao endpoint /auth/login).
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function login(username, password) {
  // --- MOCK: simula latência de rede ---
  await new Promise(r => setTimeout(r, 1200));

  const MOCK_USERS = {
    admin:    { id: 1, name: 'Samuel Freitas',  role: 'admin' },
    estoque:  { id: 2, name: 'Luis Felipe',     role: 'estoque' },
    vendedor: { id: 3, name: 'Carla Mendes',    role: 'vendedor' },
    caixa:    { id: 4, name: 'Paulo Andrade',   role: 'caixa' },
    montador: { id: 5, name: 'Ricardo Costa',   role: 'montador' },
  };

  const found = MOCK_USERS[username.toLowerCase()];

  if (!found || password.length < 1) {
    return { ok: false, error: 'Usuário ou senha inválidos. Verifique suas credenciais.' };
  }

  _setUser(found);
  return { ok: true };
}

/**
 * Encerra a sessão e redireciona para o login.
 * @param {string} [loginPath]
 */
function logout(loginPath) {
  sessionStorage.removeItem(AUTH_KEY);
  const base = _getBasePath();
  window.location.href = loginPath || `${base}login.html`;
}

/**
 * Guarda que chamamos de "page guard": redireciona para login
 * se não houver sessão ativa. Chamar no topo de toda página protegida.
 * @param {string} [loginPath]
 */
function requireAuth(loginPath) {
  if (!getUser()) {
    const base = _getBasePath();
    window.location.replace(loginPath || `${base}login.html`);
  }
}

/**
 * Calcula o caminho base relativo à raiz do frontend,
 * independente de quantos níveis de subpasta a página atual esteja.
 * @returns {string}  ex.: "" | "../" | "../../"
 */
function _getBasePath() {
  const depth = (window.location.pathname.match(/\//g) || []).length - 1;
  // Conta os níveis abaixo de /frontend/
  const parts = window.location.pathname.split('/');
  const frontendIdx = parts.indexOf('frontend');
  if (frontendIdx === -1) return '';
  const levels = parts.length - frontendIdx - 2; // -2: "frontend" + filename
  return levels > 0 ? '../'.repeat(levels) : '';
}

export { getUser, login, logout, requireAuth };
