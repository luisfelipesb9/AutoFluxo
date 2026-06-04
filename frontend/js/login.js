const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {

    passwordInput.type =
        passwordInput.type === "password"
            ? "text"
            : "password";

});

const loginForm =
    document.getElementById("loginForm");

const loginButton =
    document.getElementById("loginButton");

const loginError =
    document.getElementById("loginError");

loginForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        loginError.textContent = "";

        loginButton.disabled = true;
        loginButton.textContent = "Entrando...";

        await new Promise(
            resolve => setTimeout(resolve, 1500)
        );

        const username =
            document.getElementById("username").value;

        if(username === "admin"){

            window.location.href =
                "dashboard.html";

            return;

        }

        loginError.textContent =
            "Usuário ou senha inválidos. Verifique suas credenciais e tente novamente.";

        loginButton.disabled = false;
        loginButton.textContent = "Entrar";

    }
);