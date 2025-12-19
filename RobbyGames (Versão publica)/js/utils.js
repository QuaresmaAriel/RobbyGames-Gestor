/**
 * UTILS - MÓDULO DE UTILITÁRIOS GLOBAIS
 * Este arquivo centraliza funções que são compartilhadas por múltiplas páginas.
 * 1. Preferências de Visual (Tema e Fonte)
 * 2. Formatação de Dados (Datas do Firebase)
 * 3. Gestão de Listas Dinâmicas (Status da Fila)
 */

/**
 * Aplica as preferências visuais salvas no navegador.
 * O tamanho da fonte é definido no <html> para que todas as medidas em 'rem'
 * nos arquivos CSS sejam ajustadas proporcionalmente.
 */
export function aplicarPreferencias() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const fontSize = localStorage.getItem('fontSize') || '16px';

    // Aplicação do tema Dark Mode
    if (darkMode) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
    }

    // Define a base de escala para o sistema (Acessibilidade)
    document.documentElement.style.fontSize = fontSize;
}

/**
 * FONTE PARA STATUS:
 * @returns {string[]} Array de strings com os nomes dos status.
 */
export function obterStatusOS() {
    const salvos = localStorage.getItem('statusOS');
    if (salvos) {
        try {
            return JSON.parse(salvos);
        } catch (e) {
            console.error("Erro ao ler status personalizados, usando padrão.");
        }
    }
    // Lista padrão inicial
    return ["Em Manutenção", "Aguardando Peça"];
}

/**
 * Formata datas vindas do Firebase (Timestamp) ou objetos Date.
 * @param {any} data - Objeto de data ou Timestamp do Firebase
 * @returns {string} Data formatada: DD/MM HH:MM
 */
export function formatarData(data) {
    if (!data) return "";
    
    // Converte Timestamp do Firebase para objeto Date nativo do JS
    const d = data.toDate ? data.toDate() : new Date(data);
    
    // Validação para evitar erros de "Invalid Date" no layout
    if (isNaN(d.getTime())) return "";

    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}