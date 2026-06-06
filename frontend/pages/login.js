/**
 * pages/login.js
 * ============================================================
 * Controlador da página de login.
 * Este arquivo é carregado por frontend/login.html,
 * portanto os caminhos são relativos a frontend/
 * ============================================================ */

import { login, getUser } from '../core/auth.js';

/* Se já estiver logado, vai direto ao dashboard */
if (getUser()) {
  window.location.replace('./pages/dashboard.html');
}

const form          = document.getElementById('loginForm');
const btnLogin      = document.getElementById('loginButton');
const errorBox      = document.getElementById('loginError');
const errorText     = document.getElementById('loginErrorText');
const toggleBtn     = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon       = document.getElementById('eyeIcon');

/* ── Toggle visibilidade da senha ─────────────────────── */
toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  eyeIcon.setAttribute('href', isHidden ? '#icon-eye-off' : '#icon-eye');
  toggleBtn.setAttribute('aria-pressed', String(isHidden));
  toggleBtn.setAttribute('aria-label',   isHidden ? 'Ocultar senha' : 'Mostrar senha');
});

/* ── Esconde erro ao digitar ──────────────────────────── */
function hideError() {
  errorBox.classList.remove('error--visible');
}

document.getElementById('username').addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);

/* ── Submit ───────────────────────────────────────────── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    _showError('Preencha usuário e senha para continuar.');
    return;
  }

  btnLogin.classList.add('btn--loading');
  btnLogin.disabled = true;
  hideError();

  const result = await login(username, password);

  if (result.ok) {
    /* login.html está em frontend/ → dashboard está em frontend/pages/ */
    window.location.href = './pages/dashboard.html';
    return;
  }

  _showError(result.error);
  btnLogin.classList.remove('btn--loading');
  btnLogin.disabled = false;
  passwordInput.value = '';
  passwordInput.focus();
});

function _showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.add('error--visible');
}
