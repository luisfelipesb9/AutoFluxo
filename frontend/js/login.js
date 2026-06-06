/* =========================================================
   GERENCIAUTOMIX - LOGIN
   ========================================================= */

const passwordInput  = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm      = document.getElementById("loginForm");
const loginButton    = document.getElementById("loginButton");
const loginError     = document.getElementById("loginError");

/* Toggle visibilidade da senha */
togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁";
});

/* Submit */
loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    loginError.textContent = "";

    /* Ativa loading state */
    loginButton.classList.add("btn--loading");
    loginButton.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 1500));

    const username = document.getElementById("username").value.trim();

    /* Redirecionamento por perfil */
    if (username === "admin") {
        window.location.href = "dashboard.html";
        return;
    }

    if (username === "estoque" || username === "vendedor") {
        window.location.href = "dashboard.html";
        return;
    }

    /* Erro amigável */
    loginError.textContent =
        "Usuário ou senha inválidos. Verifique suas credenciais e tente novamente.";

    loginButton.classList.remove("btn--loading");
    loginButton.disabled = false;

});
