/**
 * core/config.js
 * ============================================================
 * Configuração de runtime do frontend.
 *
 * API_BASE descobre sozinho onde está o backend:
 *  - Dev local: qualquer porta não-padrão no localhost  ->  backend em http://<host>:4000/api
 *  - Produção:  servido pelo Nginx no mesmo domínio     ->  "/api" (mesma origem, proxy)
 *
 * Para forçar manualmente, defina window.__API_BASE__ antes de carregar os módulos.
 * ============================================================ */

const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  const { hostname, port, protocol } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isStandardPort = port === '' || port === '80' || port === '443';
  if (isLocalhost && !isStandardPort) {
    return `${protocol}//${hostname}:4000/api`;
  }
  // Produção: mesma origem; o Nginx faz proxy de /api -> backend.
  return '/api';
})();

export { API_BASE };
