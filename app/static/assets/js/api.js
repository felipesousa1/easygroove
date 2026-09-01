import { scoreState, currentArrangementId, setCurrentArrangementId } from './state.js';
import { showToast } from './ui/toast.js';
import { renderScore } from './ui/renderScore.js';
import { updateLoopBarVisuals } from './ui/loop.js';
import { historyManager } from './history.js';

export async function saveCurrentArrangement() {
    const { loopState, ...scoreDataToSave } = scoreState;

    const payload = {
        name: scoreState.title || "Sem Título",
        score_data: scoreDataToSave,
        collection_id: null
    };

    const isUpdating = currentArrangementId !== null;
    const url = isUpdating
        ? `/api/arrangements/${currentArrangementId}`
        : "/api/arrangements";
    const method = isUpdating ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        if (response.status === 401) {
            showToast("Você precisa estar logado para salvar.", true);
            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
            return;
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const message = errData.detail || `Erro ao salvar: ${response.statusText}`;
            showToast(message, true);
            return;
        }

        const data = await response.json();

        if (!currentArrangementId) {
            setCurrentArrangementId(data.id);
            window.history.replaceState(null, "", `/?id=${data.id}`);
        }

        showToast("Arranjo salvo com sucesso!");
    } catch (error) {
        console.error("Erro de conexão ao salvar:", error);
        showToast("Falha de conexão com el servidor.", true);
    }
}

export function setupPersistenceEvents() {
    const saveBtn = document.querySelector('.header-right button[title="Salvar Projeto"]');
    if (saveBtn) {
        saveBtn.addEventListener("click", saveCurrentArrangement);
    }
}

export async function loadArrangementFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const arrangementId = urlParams.get("id");

    if (!arrangementId) return;

    try {
        const response = await fetch(`/api/arrangements/${arrangementId}`, {
            credentials: "same-origin"
        });

        if (response.status === 401) {
            showToast("Faça login para abrir este arranjo.", true);
            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
            return;
        }

        if (!response.ok) {
            throw new Error(`Arranjo #${arrangementId} não encontrado.`);
        }

        const arrangement = await response.json();

        if (arrangement && arrangement.score_data) {
            setCurrentArrangementId(arrangement.id);

            Object.assign(scoreState, arrangement.score_data);
            scoreState.loopState = {
                active: false,
                startMeasure: 0,
                endMeasure: scoreState.measuresCount
            };

            const btnLoop = document.getElementById("btn-loop");
            if (btnLoop) btnLoop.classList.remove("active");

            if (window.audioEngine && audioEngine.isInitialized) {
                audioEngine.initInstruments();
            }

            renderScore();
            updateLoopBarVisuals();

            historyManager.undoStack = [];
            historyManager.redoStack = [];
            historyManager.updateButtonsState();
        }
    } catch (error) {
        console.error("Erro ao carregar arranjo:", error);
        showToast("Não foi possível carregar o arranjo especificado.", true);
    }
}