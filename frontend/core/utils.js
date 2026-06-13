/**
 * core/utils.js — utilitários de segurança compartilhados pelo frontend.
 */

const _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

/**
 * Escapa caracteres HTML especiais para prevenir XSS ao inserir
 * dados não-confiáveis via innerHTML / template literals.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, c => _ESC[c]);
}
