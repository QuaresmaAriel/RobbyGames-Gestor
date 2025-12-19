import { aplicarPreferencias } from "./utils.js";
import { verificarAcesso } from "./auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// Adicionado query, where e getDocs para a validação de OS
import { 
    getFirestore, collection, addDoc, serverTimestamp, 
    query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

verificarAcesso();
aplicarPreferencias();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const usuarioAtivo = sessionStorage.getItem('usuario') || 'Desconhecido';

/**
 * FUNÇÃO DE NOTIFICAÇÃO (Substitui o alert)
 * @param {string} msg - Mensagem a ser exibida
 * @param {string} tipo - 'sucesso' ou 'erro'
 */
function mostrarFeedback(msg, tipo = 'sucesso') {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '9999';
    toast.style.color = '#fff';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    toast.style.transition = 'all 0.5s ease';
    
    // Cores baseadas no tipo
    toast.style.backgroundColor = tipo === 'sucesso' ? '#28a745' : '#dc3545';

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// 2. FUNÇÃO PARA SALVAR NO BANCO
async function salvarNoFirebase(dados) {
    try {
        // --- VALIDAÇÃO DE OS DUPLICADA MELHORADA ---
        if (dados.tipo === 'servico' && dados.os) {
            const q = query(collection(db, "tarefas_unificadas"), where("os", "==", dados.os));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                mostrarFeedback(`⚠️ A OS nº ${dados.os} já está cadastrada em outro serviço!`, 'erro');
                return; 
            }
        }

        // Prepara a nota inicial com Descrição e Orçamento
        let notaCompleta = dados.descricao || "Sem descrição";
        if (dados.valor) {
            notaCompleta += ` | Orçamento: R$ ${dados.valor}`;
        }

        const payload = {
            ...dados,
            finalizado: false,
            dataCriacao: serverTimestamp(),
            historico: [{
                status: dados.status || "Em manutenção",
                data: new Date().toLocaleString('pt-BR'),
                user: usuarioAtivo,
                nota: notaCompleta
            }]
        };

        await addDoc(collection(db, "tarefas_unificadas"), payload);
        
        mostrarFeedback("🎉 Registrado com sucesso! Redirecionando...");
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);

    } catch (e) {
        console.error("Erro detalhado:", e);
        mostrarFeedback("❌ Erro ao salvar. Verifique sua conexão com o Firebase.", "erro");
    }
}

// 3. CAPTURA DOS FORMULÁRIOS
const formServico = document.getElementById('form-servico');
if (formServico) {
    formServico.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarNoFirebase({
            tipo: 'servico',
            nomeCliente: document.getElementById('cliente-nome').value,
            os: document.getElementById('os-numero').value,
            aparelho: document.getElementById('aparelho').value,
            descricao: document.getElementById('problema').value,
            valor: document.getElementById('orcamento').value,
            status: "Em Manutenção"
        });
    });
}

const formTarefa = document.getElementById('form-tarefa');
if (formTarefa) {
    formTarefa.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarNoFirebase({
            tipo: 'particular',
            tituloTarefa: document.getElementById('tarefa-titulo').value,
            descricao: document.getElementById('tarefa-notas').value,
            status: "Pendente"
        });
    });
}

const formAgendar = document.getElementById('form-agendar');
if (formAgendar) {
    formAgendar.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarNoFirebase({
            tipo: 'agendado',
            dataAgendamento: document.getElementById('agenda-data').value,
            tituloTarefa: document.getElementById('agenda-titulo').value,
            descricao: document.getElementById('agenda-notas').value,
            status: "Agendado"
        });
    });
}