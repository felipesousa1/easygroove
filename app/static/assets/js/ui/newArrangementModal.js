import { INSTRUMENT_PRESETS } from '../constants.js';
import { scoreState } from '../state.js';
import { renderScore } from './renderScore.js';
import { showToast } from './toast.js';

let isEventsInitialized = false;

// Preenche a lista de instrumentos e abre o modal
export function openNewArrangementModal() {
    const modalOverlay = document.getElementById("new-arrangement-modal");
    const instrumentsListContainer = document.getElementById("modal-instruments-list");
    const errorMsg = document.getElementById("modal-inst-error");

    if (!modalOverlay || !instrumentsListContainer) return;

    if (errorMsg) errorMsg.style.display = "none";

    // Preenche os checkboxes dos instrumentos
    instrumentsListContainer.innerHTML = Object.entries(INSTRUMENT_PRESETS).map(([id, preset]) => `
        <label class="modal-checkbox-item">
            <input type="checkbox" value="${id}" checked>
            <span>${preset.name}</span>
        </label>
    `).join("");

    modalOverlay.classList.add("active");
}

export function setupNewArrangementModal() {
    const modalOverlay = document.getElementById("new-arrangement-modal");
    if (!modalOverlay) return;

    const hasArrangementId = window.location.search.includes("id=");

    const btnCreate = document.getElementById("btn-create-arrangement");
    const btnImport = document.getElementById("btn-import-json");
    const importFileInput = document.getElementById("import-file-input");

    // Vincula os eventos apenas uma única vez
    if (!isEventsInitialized && btnCreate) {
        isEventsInitialized = true;

        // Ação do Botão "Criar Arranjo"
        btnCreate.addEventListener("click", () => {
            const titleInput = document.getElementById("modal-arr-title");
            const timeSigSelect = document.getElementById("modal-arr-timesig");
            const instrumentsListContainer = document.getElementById("modal-instruments-list");
            const errorMsg = document.getElementById("modal-inst-error");

            if (!instrumentsListContainer) return;

            const checkedInputs = Array.from(
                instrumentsListContainer.querySelectorAll("input[type='checkbox']:checked")
            );

            if (checkedInputs.length === 0) {
                if (errorMsg) errorMsg.style.display = "block";
                return;
            }
            if (errorMsg) errorMsg.style.display = "none";

            const selectedTitle = (titleInput && titleInput.value.trim()) || "Novo arranjo";
            const selectedTimeSig = (timeSigSelect && timeSigSelect.value) || "4/4";

            const selectedInstruments = checkedInputs.map(input => {
                const presetKey = input.value;
                const preset = INSTRUMENT_PRESETS[presetKey];
                return {
                    id: presetKey,
                    name: preset.name,
                    iconSvg: preset.iconSvg,
                    volume: 50,
                    availableStrokes: [...preset.availableStrokes],
                    pattern: []
                };
            });

            // Reseta o estado global para o novo arranjo
            scoreState.title = selectedTitle;
            scoreState.timeSignature = selectedTimeSig;
            scoreState.measuresCount = 1;
            scoreState.measuresConfig = [{ timeSignature: selectedTimeSig }];
            scoreState.instruments = selectedInstruments;
            scoreState.repeats = [];

            const titleDisplay = document.getElementById("title-display");
            if (titleDisplay) {
                titleDisplay.textContent = selectedTitle;
            }

            modalOverlay.classList.remove("active");
            renderScore();

            if (typeof showToast === "function") {
                showToast("Novo arranjo criado com sucesso!");
            }
        });

        // Ação de Importar JSON dentro do Modal
        if (btnImport && importFileInput) {
            btnImport.addEventListener("click", () => {
                importFileInput.click();
            });

            importFileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);

                        if (!importedData.instruments || !Array.isArray(importedData.instruments)) {
                            throw new Error("Estrutura do arquivo JSON inválida.");
                        }

                        Object.assign(scoreState, importedData);

                        const titleDisplay = document.getElementById("title-display");
                        if (titleDisplay && scoreState.title) {
                            titleDisplay.textContent = scoreState.title;
                        }

                        modalOverlay.classList.remove("active");
                        renderScore();

                        if (typeof showToast === "function") {
                            showToast("Arranjo importado com sucesso!");
                        }
                    } catch (err) {
                        console.error("Erro ao importar JSON:", err);
                        alert("Não foi possível carregar o arquivo. Certifique-se de ser um arquivo .json de arranjo válido.");
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    // Se for uma página limpa (sem ID na URL), abre o modal no carregamento inicial
    if (!hasArrangementId) {
        openNewArrangementModal();
    }
}