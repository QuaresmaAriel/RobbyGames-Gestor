/**
 * CONFIGURAÇÕES - SISTEMA GESTOR (RobbyGames)
 * Este ficheiro controla as preferências visuais locais e a segurança global via Firebase.
 * OBSERVADO: Removida lógica de status local. Tudo agora deve ser via BD.
 */

import { aplicarPreferencias } from "./utils.js";
import { verificarAcesso } from "./auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// 1. SEGURANÇA E TEMA INICIAL
verificarAcesso();
aplicarPreferencias();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. CARREGAMENTO DE INTERFACE
document.addEventListener('DOMContentLoaded', () => {
    // Carrega preferências visuais do LocalStorage
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const fontSize = localStorage.getItem('fontSize') || '16px';
    
    if(document.getElementById('dark-mode-input')) document.getElementById('dark-mode-input').checked = darkMode;
    if(document.getElementById('font-size-input')) document.getElementById('font-size-input').value = fontSize;
    
    // Identifica o usuário logado para a segurança
    const usuarioLogado = sessionStorage.getItem('usuario') || 'Usuário';
    const displayUser = document.getElementById('nome-usuario-config');
    if(displayUser) displayUser.innerText = usuarioLogado;
});

// 3. ALTERAR SENHA (FIREBASE)
// Exposto em 'window' para ser chamado pelo botão no HTML
window.alterarSenhaUsuario = async function() {
    const novaSenha = document.getElementById('nova-senha-input').value;
    const confirmaSenha = document.getElementById('confirma-senha-input').value;
    const usuarioAtivo = sessionStorage.getItem('usuario'); 

    if (!novaSenha || novaSenha.length < 4) {
        alert("A senha deve ter pelo menos 4 caracteres.");
        return;
    }

    if (novaSenha !== confirmaSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    try {
        const userRef = doc(db, "usuarios", usuarioAtivo);
        await updateDoc(userRef, { senha: novaSenha });
        
        alert("✅ Senha alterada com sucesso no Banco de Dados!");
        
        document.getElementById('nova-senha-input').value = '';
        document.getElementById('confirma-senha-input').value = '';
    } catch (error) {
        console.error("Erro Firebase:", error);
        alert("Erro técnico ao acessar o banco de dados.");
    }
};

// 4. SALVAR PREFERÊNCIAS VISUAIS (LOCAL STORAGE)
document.getElementById('btn-salvar-config')?.addEventListener('click', function() {
    const darkMode = document.getElementById('dark-mode-input').checked;
    const fontSize = document.getElementById('font-size-input').value;

    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('fontSize', fontSize);
    
    aplicarPreferencias();
    
    // Feedback visual de sucesso
    const originalText = this.innerText;
    this.innerText = "✅ Aplicado com Sucesso!";
    this.style.background = "#27ae60";
    
    setTimeout(() => {
        this.innerText = originalText;
        this.style.background = ""; // Volta ao CSS original
    }, 2000);
});