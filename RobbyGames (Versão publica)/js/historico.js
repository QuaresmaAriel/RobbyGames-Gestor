/**
 * SISTEMA DE GESTÃO - MÓDULO DE HISTÓRICO (JS)
 * OBJETIVO: Gerenciar a visualização e manutenção de tarefas finalizadas.
 * * REGRAS DE NEGÓCIO:
 * - Apenas documentos com 'finalizado: true' são carregados.
 * - A exportação para Excel agora inclui as notas registradas.
 * - Correção: Campo 'observacao' alterado para 'nota' para alinhar com o Dashboard.
 */

import { aplicarPreferencias } from "./utils.js";
import { verificarAcesso } from "./auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot, 
    orderBy, 
    where, 
    getDocs,
    deleteDoc,
    doc  
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// --- 1. CONFIGURAÇÕES INICIAIS ---
verificarAcesso();
aplicarPreferencias();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências do DOM
const tabelaCorpo = document.getElementById('tabela-historico');
const searchInput = document.getElementById('search-historico');
const modalConfirm = document.getElementById('custom-confirm');
const btnSim = document.getElementById('confirm-yes');
const btnNao = document.getElementById('confirm-no');

let dadosHistorico = []; // Cache local para busca instantânea e exportação

// --- 2. SINCRONIZAÇÃO COM FIREBASE ---
/**
 * Escuta em tempo real itens finalizados.
 * Ordenação: 'desc' (Mais novos no topo da tabela).
 */
const q = query(
    collection(db, "tarefas_unificadas"), 
    where("finalizado", "==", true),
    orderBy("dataCriacao", "desc")
);

onSnapshot(q, (snapshot) => {
    dadosHistorico = [];
    snapshot.forEach((doc) => {
        dadosHistorico.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabela(dadosHistorico);
});

// --- 3. INTERFACE DA TABELA ---
function renderizarTabela(lista) {
    tabelaCorpo.innerHTML = '';

    if (lista.length === 0) {
        // Atualizado colspan para 7 para acomodar a nova coluna de notas
        tabelaCorpo.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const tr = document.createElement('tr');

        // Estilização condicional para Perda Total
        if (item.status === "Perda Total") {
            tr.style.backgroundColor = "rgba(255, 0, 0, 0.05)";
        }

        // Pega a última nota do histórico (se existir)
// Dentro do seu loop lista.forEach:

const ultimaNota = item.historico && item.historico.length > 0 
    ? item.historico[item.historico.length - 1].nota || "---" 
    : "---";

tr.innerHTML = `
    <td data-label="Data:">${formataDataSimples(item.dataCriacao)}</td>
    <td data-label="Tipo:">
        <span class="tag-tipo ${item.tipo}">${item.tipo}</span>
    </td>
    <td data-label="Cliente:">
        <strong>${item.nomeCliente || item.tituloTarefa}</strong><br>
        <small>${item.aparelho || ''}</small>
    </td>
    <td data-label="Status:">${item.status}</td>
    
    <td data-label="Última Nota: " class="coluna-nota">
        <i>${ultimaNota}</i>
    </td>

    <td data-label="Responsável" class="coluna-responsavel">
        ${item.historico ? item.historico[item.historico.length - 1].user : '---'}
    </td>
    
    <td data-label="">
        <button type="button" class="btn btn-detalhes" onclick="verDetalhesHistorico('${item.id}')">
            Histórico
        </button>
    </td>
`;
tabelaCorpo.appendChild(tr);
    });
}

// --- 4. FILTRAGEM DE BUSCA ---
searchInput.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = dadosHistorico.filter(i => 
        (i.nomeCliente?.toLowerCase().includes(termo)) || 
        (i.os?.includes(termo)) || 
        (i.aparelho?.toLowerCase().includes(termo))
    );
    renderizarTabela(filtrados);
});

// --- 5. VISUALIZAÇÃO DE LOGS (MODAL) ---
window.verDetalhesHistorico = (id) => {
    const item = dadosHistorico.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-log');
    const container = document.getElementById('modal-log-content');
    container.innerHTML = ''; 

    if (item.historico && item.historico.length > 0) {

        item.historico.forEach(l => {
            const divItem = document.createElement('div');
            divItem.classList.add('log-item');

            const obsHtml = l.nota 
                ? `<div class="nota-historico">📝 ${l.nota.replace(/\n/g, '<br>')}</div>` 
                : '';

            divItem.innerHTML = `
                <div class="log-header">
                    <div class="log-user">Responsável: ${l.user}</div>
                    <strong>${l.data}</strong> -
                    <span class="log-status">${l.status}</span>
                </div>
                
                ${obsHtml}
            `;

            container.appendChild(divItem);
        });

    } else {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Sem histórico registrado.</p>';
    }

    modal.classList.remove('hidden');

    const btnClose = document.getElementById('modal-log-close');
    if (btnClose) btnClose.onclick = () => modal.classList.add('hidden');
};


// --- 6. EXPORTAÇÃO (EXCEL) ---
function exportarDadosParaExcel() {
    if (dadosHistorico.length === 0) {
        alert("Nada para exportar!");
        return;
    }

    const dataAjustada = dadosHistorico.map(item => ({
        "Data": item.dataCriacao?.toDate().toLocaleDateString() || "",
        "Tipo": item.tipo || "",
        "Cliente": item.nomeCliente || item.tituloTarefa,
        "Aparelho": item.aparelho || "",
        "Status": item.status,
        "Nota Final": item.historico && item.historico.length > 0 ? item.historico[item.historico.length - 1].nota : "",
        "Responsável": item.historico ? item.historico[item.historico.length - 1].user : ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataAjustada);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");

    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(wb, `RobbyGames_Historico_${dataHoje}.xlsx`);
}

// Vincula a exportação ao botão específico de Excel
document.getElementById('btn-exportar').onclick = exportarDadosParaExcel;

// --- 7. LIMPEZA DE HISTÓRICO ---
document.getElementById('btn-limpar-historico').onclick = () => {
    document.getElementById('confirm-title').innerText = "Excluir Histórico";
    document.getElementById('confirm-msg').innerText = "Tem certeza que deseja apagar permanentemente todos os registros concluídos? Certifique-se de ter baixado o Excel antes, se necessário.";
    modalConfirm.classList.remove('hidden');

    btnSim.onclick = async () => {
        try {
            const qExcluir = query(collection(db, "tarefas_unificadas"), where("finalizado", "==", true));
            const snapshot = await getDocs(qExcluir);
            
            const promises = snapshot.docs.map(d => deleteDoc(doc(db, "tarefas_unificadas", d.id)));
            await Promise.all(promises);
            
            modalConfirm.classList.add('hidden');
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir dados.");
        }
    };

    btnNao.onclick = () => modalConfirm.classList.add('hidden');
};

// --- AUXILIARES ---
function formataDataSimples(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR');
}