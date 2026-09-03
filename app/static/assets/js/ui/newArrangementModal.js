import { INSTRUMENT_PRESETS } from '../constants.js';
import { scoreState } from '../state.js';
import { renderScore } from './renderScore.js';
import { showToast } from './toast.js';

export function setupNewArrangementModal() {
    const modalOverlay = document.getElementById("new-arrangement-modal");
    if (!modalOverlay) return;

    if (window.location.search.includes("id=")) {
        return;
    }

    const titleInput = document.getElementById("modal-arr-title");
    const timeSigSelect = document.getElementById("modal-arr-timesig");
    const instrumentsListContainer = document.getElementById("modal-instruments-list");
    const errorMsg = document.getElementById("modal-inst-error");
    const btnCreate = document.getElementById("btn-create-arrangement");
    const btnImport = document.getElementById("btn-import-json");
    const importFileInput = document.getElementById("import-file-input");

    if (!instrumentsListContainer || !btnCreate) return;

    instrumentsListContainer.innerHTML = Object.entries(INSTRUMENT_PRESETS).map(([id, preset]) => `
        <label class="modal-checkbox-item">
            <input type="checkbox" value="${id}" checked>
            <span>${preset.name}</span>
        </label>
    `).join("");

    modalOverlay.classList.add("active");

    // Lógica para Criar Novo Arranjo
    btnCreate.addEventListener("click", () => {
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

        scoreState.title = selectedTitle;
        scoreState.timeSignature = selectedTimeSig;
        scoreState.measuresConfig = [{ timeSignature: selectedTimeSig }];
        scoreState.instruments = selectedInstruments;

        const titleDisplay = document.getElementById("title-display");
        if (titleDisplay) {
            titleDisplay.textContent = selectedTitle;
        }

        modalOverlay.classList.remove("active");
        renderScore();
    });

    // Lógica de Abertura do Leitor de JSON
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

                    // Garante que o arquivo possui a estrutura mínima esperada
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