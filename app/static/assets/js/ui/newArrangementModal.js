import { INSTRUMENT_PRESETS } from '../constants.js';
import { scoreState } from '../state.js';
import { renderScore } from './renderScore.js';

export function setupNewArrangementModal() {
    const modalOverlay = document.getElementById("new-arrangement-modal");
    if (!modalOverlay) return;

    // Se estiver editando um arranjo existente (URL com id=), não abre o modal
    if (window.location.search.includes("id=")) {
        return;
    }

    const titleInput = document.getElementById("modal-arr-title");
    const timeSigSelect = document.getElementById("modal-arr-timesig");
    const instrumentsListContainer = document.getElementById("modal-instruments-list");
    const errorMsg = document.getElementById("modal-inst-error");
    const btnCreate = document.getElementById("btn-create-arrangement");

    if (!instrumentsListContainer || !btnCreate) return;

    // Preenche a lista de checkboxes com os presets
    instrumentsListContainer.innerHTML = Object.entries(INSTRUMENT_PRESETS).map(([id, preset]) => `
        <label class="modal-checkbox-item">
            <input type="checkbox" value="${id}" checked>
            <span>${preset.name}</span>
        </label>
    `).join("");

    // Exibe o modal com o backdrop em blur
    modalOverlay.classList.add("active");

    btnCreate.addEventListener("click", () => {
        const checkedInputs = Array.from(
            instrumentsListContainer.querySelectorAll("input[type='checkbox']:checked")
        );

        // Validação: Exige no mínimo 1 instrumento
        if (checkedInputs.length === 0) {
            errorMsg.style.display = "block";
            return;
        }
        errorMsg.style.display = "none";

        const selectedTitle = titleInput.value.trim() || "Novo arranjo";
        const selectedTimeSig = timeSigSelect.value || "4/4";

        // Monta a lista final de instrumentos selecionados
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

        // Atualiza o estado global
        scoreState.title = selectedTitle;
        scoreState.timeSignature = selectedTimeSig;
        scoreState.measuresConfig = [{ timeSignature: selectedTimeSig }];
        scoreState.instruments = selectedInstruments;

        // Atualiza o elemento de título na barra superior, se existir
        const titleDisplay = document.getElementById("title-display");
        if (titleDisplay) {
            titleDisplay.textContent = selectedTitle;
        }

        // Esconde o modal e renderiza a grade limpa
        modalOverlay.classList.remove("active");
        renderScore();
    });
}