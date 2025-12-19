/**
 * SCRIPT DE INTERAÇÃO DA PÁGINA DE LOGIN
 * Gerencia o formulário e a ponte com o Firebase.
 */
import { realizarLogin, verificarAcesso } from "./auth.js";
import { aplicarPreferencias } from "./utils.js";

// 1. Aplica preferências visuais antes de tudo
aplicarPreferencias();

// 2. Proteção de rota: Se já estiver logado, sai do login automaticamente
verificarAcesso();

const form = document.getElementById('login-form');
const erroMsg = document.getElementById('login-error');
const btnLogin = document.getElementById('btn-login');

/**
 * EVENTO DE SUBMIT
 * CORREÇÃO CRÍTICA: Transformado em ASYNC para esperar a resposta do Firebase.
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Bloqueia o botão e mostra feedback de carregamento
    btnLogin.disabled = true;
    btnLogin.innerText = "Verificando...";
    if (erroMsg) erroMsg.innerText = "";

    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;

    try {
        /**
         * AQUI ESTAVA O ERRO: Sem o 'await', o JavaScript não esperava o Firebase.
         * Agora o código para nesta linha até o Firebase dizer "Sim" ou "Não".
         */
        const logadoComSucesso = await realizarLogin(user, pass);

        if (logadoComSucesso) {
            // Só redireciona se o Firebase confirmar e o sessionStorage for gravado
            window.location.href = 'dashboard.html';
        } else {
            // Se falhar, libera o formulário e avisa o erro
            btnLogin.disabled = false;
            btnLogin.innerText = "Entrar";
            if (erroMsg) erroMsg.innerText = "Usuário ou senha inválidos.";
        }
    } catch (err) {
        console.error("Erro no processo de login:", err);
        btnLogin.disabled = false;
        btnLogin.innerText = "Entrar";
        if (erroMsg) erroMsg.innerText = "Erro de conexão. Tente novamente.";
    }
});