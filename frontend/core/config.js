/**
 * core/config.js
 * ============================================================
 * Configuração de runtime do frontend.
 *
 * API_BASE descobre sozinho onde está o backend:
 *  - Dev local: frontend servido na porta 3000  ->  backend em http://<host>:4000/api
 *  - Produção:  servido pelo Nginx no mesmo domínio  ->  "/api" (mesma origem, proxy)
 *
 * Para forçar manualmente, defina window.__API_BASE__ antes de carregar os módulos.
 * ============================================================ */

const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  const { hostname, port, protocol } = window.location;
  // Dev: o frontend roda na :3000 e o backend na :4000 (mesma máquina/rede).
  if (port === '3000') {
    return `${protocol}//${hostname}:4000/api`;
  }
  // Produção: mesma origem; o Nginx faz proxy de /api -> backend.
  return '/api';
})();

export { API_BASE };
