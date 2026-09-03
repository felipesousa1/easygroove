import { scoreState } from './state.js';
import { renderScore } from './ui/renderScore.js';
import { showToast } from './ui/toast.js';
import { historyManager } from './history.js';

// Serializa o estado atual e dispara o download do arquivo .json
export function exportScoreToJSON() {
    try {
        // Remove propriedades voláteis antes de exportar
        const { loopState, selectedSelection, ...cleanScoreData } = scoreState;

        const jsonString = JSON.stringify(cleanScoreData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Sanitiza o título do arranjo para usar como nome de arquivo
        const fileName = (scoreState.title || "arranjos-easygroove")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${fileName}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        if (typeof showToast === "function") {
            showToast("Arranjo exportado em JSON com sucesso!");
        }
    } catch (err) {
        console.error("Erro ao exportar JSON:", err);
        if (typeof showToast === "function") {
            showToast("Erro ao gerar o arquivo de exportação.", true);
        }
    }
}

// Configura os escutadores do botão de exportação e do leitor de arquivos
export function setupExportEvents() {
    // Botão de Exportar da Topbar
    const exportBtn = document.querySelector('.header-right button[title="Exportar Arranjo"]');
    if (exportBtn) {
        exportBtn.addEventListener("click", exportScoreToJSON);
    }
}