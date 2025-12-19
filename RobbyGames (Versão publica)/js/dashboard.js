/**
 * DOCUMENTAÇÃO DE USO PARA FUTUROS DESENVOLVEDORES:
 * * Este script gerencia uma fila de tarefas unificadas (serviços, agendamentos e particulares).
 * - A fila é atualizada em Tempo Real via Firebase onSnapshot.
 * - A ordem é Cronológica: O item mais antigo fica no topo e o mais recente no fim.
 * - Integração: Quando o status é 'Concluido', 'Perda Total' ou 'Cancelado', 
 * o campo 'finalizado' vira true e o item migra automaticamente para o Histórico.
 */

import { aplicarPreferencias, formatarData } from "./utils.js";
import { verificarAcesso } from "./auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, arrayUnion, collection, query, onSnapshot, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// ==========================================
// 1. CONFIGURAÇÕES INICIAIS
// ==========================================
verificarAcesso();
aplicarPreferencias();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listaTarefasElement = document.getElementById('lista-tarefas');
const searchInput = document.getElementById('search-input');
const userDisplay = document.getElementById('user-name');

let todasTarefas = []; 
let filtroAtivo = 'todos';

const usuarioLogado = sessionStorage.getItem('usuario') || 'Usuário';
if (userDisplay) userDisplay.textContent = usuarioLogado;

// ==========================================
// 2. CONEXÃO EM TEMPO REAL (FIREBASE)
// ==========================================
const q = query(
    collection(db, "tarefas_unificadas"), 
    where("finalizado", "==", false), // Dashboard foca no que está em aberto
    orderBy("dataCriacao", "asc") 
);

onSnapshot(q, (snapshot) => {
    todasTarefas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processarEFiltrar();
});

// ==========================================
// 3. REGRAS DE NEGÓCIO E FILTRAGEM
// ==========================================
function deveMostrarNaData(item) {
    if (item.tipo !== 'agendado') return true;
    const hoje = new Date().toISOString().split('T')[0];
    return (item.dataAgendamento <= hoje);
}

function processarEFiltrar() {
    const termo = searchInput.value.toLowerCase();
    
    const filtradas = todasTarefas.filter(item => {
        const matchesBusca = (item.nomeCliente?.toLowerCase().includes(termo)) || 
                             (item.os?.includes(termo)) || 
                             (item.aparelho?.toLowerCase().includes(termo)) ||
                             (item.tituloTarefa?.toLowerCase().includes(termo));
        
        const matchesFiltro = (filtroAtivo === 'todos') || (item.tipo === filtroAtivo);
        const matchesData = deveMostrarNaData(item);

        return matchesBusca && matchesFiltro && matchesData;
    });

    renderizarCards(filtradas);
}

// ==========================================
// 4. INTERFACE DO USUÁRIO (DOM)
// ==========================================
function renderizarCards(tarefas) {
    listaTarefasElement.innerHTML = '';
    
    if (tarefas.length === 0) {
        listaTarefasElement.innerHTML = `
            <div class="empty-queue-msg">
                <h3>Nenhuma tarefa por enquanto !</h3>
                <p>Bora curtir a família! </p>
            </div>`;
        return;
    }

    tarefas.forEach(item => {
        const card = document.createElement('div');
        card.className = `card-tarefa ${item.tipo}`; 
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${item.nomeCliente || item.tituloTarefa}</span>
                <span class="badge-status">${item.status}</span>
            </div>
            <div class="card-body">
                <p>${item.aparelho || item.descricao || 'Sem descrição'}</p>
                <div class="card-footer">
                    <span>${formatarDataFirebase(item.dataCriacao)}</span>
                    ${item.os ? `<b>OS: ${item.os}</b>` : ''}
                </div>
            </div>`;
        
        card.onclick = () => abrirAcao(item);
        listaTarefasElement.appendChild(card);
    });
}

// ==========================================
// 5. GESTÃO DE DETALHES E HISTÓRICO (MODAL)
// ==========================================
function abrirAcao(item) {
    const isMobile = window.innerWidth < 1024;
    const targetId = isMobile ? 'modal-body' : 'conteudo-detalhes';
    const container = document.getElementById(targetId);

    if (isMobile) {
        document.getElementById('modal-container').classList.remove('hidden');
    } else {
        const vazio = document.getElementById('vazio-selection');
        if (vazio) vazio.classList.add('hidden');
        document.getElementById('conteudo-detalhes').classList.remove('hidden');
    }

    const docRef = doc(db, "tarefas_unificadas", item.id);
    onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const dadosAtualizados = { id: docSnap.id, ...docSnap.data() };
        renderConteudoDetalhes(container, dadosAtualizados);
    });
}

function renderConteudoDetalhes(container, item) {
    const bibliotecaStatus = {
        'servico': ["🔍 Em Analise", "🛠️ Em Manutencao", "📦 Aguardando Peça", "🎮 Em Teste", "💰 Aguardando Aprovação", "✅ Concluido", "❌ Perda Total"],
        'agendado': ["📅 Agendado", "🚀 A caminho", "👨‍🔧 Em Atendimento", "✅ Concluido", "❌ Cancelado"],
        'particular': ["📝 Pendente", "🏗️ Em Andamento", "✅ Concluido", "❌ Cancelado"]
    };

    const statusDisponiveis = bibliotecaStatus[item.tipo] || ["Pendente", "Concluido"];
    
// Localize este trecho dentro da função renderConteudoDetalhes e substitua:

    container.innerHTML = `
        <div class="detalhes-container">
            <h3>${item.nomeCliente || item.tituloTarefa}</h3>
            <div class="form-group">
                <label>Alterar Status</label>
                <select id="novo-status-select" class="modern-input">
                    ${statusDisponiveis.map(s => {
                        const valorLimpo = s.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]/gu, "").trim();
                        return `<option value="${valorLimpo}" ${item.status === valorLimpo ? 'selected' : ''}>${s}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Nota / Observação</label>
                <textarea id="nota-status" class="modern-input" placeholder="Descreva o progresso..."></textarea>
            </div>
            <button class="btn-primary" id="btn-salvar-status" style="width:100%">Salvar Alteração</button>
            
            <div class="timeline-area">
                <h4>Linha do Tempo</h4>
                <ul class="timeline-list">
                    ${(item.historico || []).map(log => `
                        <li>
                            <small>${log.data} - <b>${log.user}</b></small><br>
                            <b>${log.status}</b> ${log.nota ? `: <i>"${log.nota}"</i>` : ''}
                        </li>
                    `).reverse().join('')}
                </ul>
            </div>
        </div>`;

    document.getElementById('btn-salvar-status').onclick = () => {
        const novoStatus = document.getElementById('novo-status-select').value;
        const nota = document.getElementById('nota-status').value;
        processarAtualizacao(item.id, novoStatus, nota);
    };
}

// ==========================================
// 6. PERSISTÊNCIA (GRAVAÇÃO NO FIREBASE)
// ==========================================
async function processarAtualizacao(id, novoStatus, nota) {
    const usuarioAtivo = sessionStorage.getItem('usuario') || 'Admin';
    const agora = new Date().toLocaleString('pt-BR');
    
    // REGRA DE NEGÓCIO: Se o status selecionado for um destes, o item vai para o Histórico.
    const finalizado = ["Concluido", "Perda Total", "Cancelado"].includes(novoStatus);

    try {
        const docRef = doc(db, "tarefas_unificadas", id);
        await updateDoc(docRef, {
            status: novoStatus,
            finalizado: finalizado,
            historico: arrayUnion({ 
                status: novoStatus, 
                data: agora, 
                user: usuarioAtivo, 
                nota: nota || "Alteração de status" // Garante que nunca fique vazio para o histórico
            })
        });
        
        if (window.innerWidth < 1024) fecharModal();
        mostrarNotificacao("✅ Atualizado com sucesso");

    } catch (e) {
        console.error("Erro ao atualizar:", e);
        mostrarNotificacao("❌ Erro ao salvar", true);
    }
}

// ==========================================
// 7. EVENTOS E AUXILIARES
// ==========================================
function mostrarNotificacao(mensagem, erro = false) {
    const toast = document.createElement('div');
    toast.className = `toast-moderno ${erro ? 'erro' : ''}`;
    toast.innerText = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
    }, 1000);
}

searchInput.addEventListener('input', processarEFiltrar);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroAtivo = btn.getAttribute('data-filter');
        processarEFiltrar();
    };
});

window.fecharModal = () => document.getElementById('modal-container').classList.add('hidden');

function formatarDataFirebase(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR') + " " + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}