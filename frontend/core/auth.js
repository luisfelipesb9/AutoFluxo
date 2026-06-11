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

import { api, setTokens, clearTokens, ApiError } from './api.js';

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
 * Realiza login via API real (POST /auth/login).
 * O `perfil` do backend já corresponde ao `role` do front (mesmos valores).
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function login(username, password) {
  try {
    const resp = await api.post(
      '/auth/login',
      { login: username.trim(), senha: password },
      { auth: false }
    );
    // resp = { accessToken, refreshToken, expiresIn, usuario: {id, nome, login, perfil} }
    setTokens({ accessToken: resp.accessToken, refreshToken: resp.refreshToken });

    const u = resp.usuario;
    _setUser({ id: u.id, name: u.nome, role: u.perfil, login: u.login });
    return { ok: true };
  } catch (err) {
    const msg =
      err instanceof ApiError && err.status === 401
        ? 'Usuário ou senha inválidos. Verifique suas credenciais.'
        : (err && err.message) || 'Erro ao entrar. Tente novamente.';
    return { ok: false, error: msg };
  }
}

/**
 * Encerra a sessão e redireciona para o login.
 * @param {string} [loginPath]
 */
function logout(loginPath) {
  sessionStorage.removeItem(AUTH_KEY);
  clearTokens();
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
