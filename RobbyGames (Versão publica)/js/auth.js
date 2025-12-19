/**
 * SISTEMA DE AUTENTICAÇÃO - RobbyGames
 * STATUS: Finalizado e Corrigido para busca direta.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function realizarLogin(usuarioDigitado, senhaDigitada) {
    const userLow = usuarioDigitado.trim();
    const passTrim = String(senhaDigitada).trim();

    try {
        // Busca o documento pelo ID (ronaldo ou agatha)
        const userRef = doc(db, "usuarios", userLow);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const dados = userSnap.data();
            // Garante que a senha do banco seja tratada como texto para comparar
            const senhaNoBanco = String(dados.senha).trim();

            if (senhaNoBanco === passTrim) {
                sessionStorage.setItem('logado', 'true');
                sessionStorage.setItem('usuario', userLow);
                return true;
            }
        }
        return false; 
    } catch (error) {
        console.error("Erro na conexão com o Banco:", error);
        return false;
    }
}

export function verificarAcesso() {
    const logado = sessionStorage.getItem('logado');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (logado === 'true' && isLoginPage) {
        window.location.href = 'dashboard.html';
        return;
    }

    if (logado !== 'true' && !isLoginPage) {
        window.location.href = 'index.html';
    }
}