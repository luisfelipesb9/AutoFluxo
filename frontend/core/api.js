/**
 * core/api.js
 * ============================================================
 * Cliente HTTP único do frontend. Responsável por:
 *  - Montar a URL com base no config (API_BASE)
 *  - Anexar o token JWT no header Authorization
 *  - Serializar/parsear JSON
 *  - Padronizar erros (ApiError) e tratar sessão expirada (401)
 *
 * Uso:
 *   import { api } from './api.js';
 *   const pedidos = await api.get('/pedidos?status=aberto');
 *   const novo    = await api.post('/pedidos', { cliente_id, itens });
 * ============================================================ */

import { API_BASE } from './config.js';

const TOKEN_KEY = 'gmx_token';
const SESSION_KEY = 'gmx_session';

/** @returns {{accessToken:string, refreshToken:string}|null} */
function getTokens() {
  try {
    return JSON.parse(sessionStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

function setTokens(tokens) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Erro padronizado da API. `status` 0 = falha de rede (servidor fora). */
class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Faz uma requisição à API.
 * @param {string} path  - ex.: "/pedidos" (começa com /)
 * @param {{method?:string, body?:any, auth?:boolean, headers?:object}} [opts]
 * @returns {Promise<any>} corpo JSON (null em 204)
 */
async function apiFetch(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  if (auth) {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      opts.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique se ele está rodando.');
  }

  // Sessão expirada/ inválida: limpa e deixa o page guard mandar pro login.
  if (res.status === 401 && auth) {
    clearTokens();
    sessionStorage.removeItem(SESSION_KEY);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* resposta sem corpo */
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Erro ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  return data;
}

const api = {
  get:  (path, opts) => apiFetch(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  put:  (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  del:  (path, opts) => apiFetch(path, { ...opts, method: 'DELETE' }),
};

export { api, apiFetch, ApiError, getTokens, setTokens, clearTokens };
