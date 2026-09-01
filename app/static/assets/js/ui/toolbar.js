import { scoreState } from '../state.js';
import { STROKE_DEFINITIONS, INSTRUMENT_PRESETS, sanitizeStrokes } from '../constants.js';
import { historyManager } from '../history.js';

export function updateToolbarPalettes() {
    const currentInst = scoreState.instruments.find(i => i.id === scoreState.activeTool.instrumentId) || scoreState.instruments[0];
    if (!currentInst) return;

    // Higieniza as chaves do instrumento caso venham de um JSON antigo
    currentInst.availableStrokes = sanitizeStrokes(currentInst.availableStrokes);

    // Se a ferramenta ativa for uma chave antiga, higieniza também
    scoreState.activeTool.strokeType = sanitizeStrokes([scoreState.activeTool.strokeType])[0];

    const activeIconEl = document.getElementById("active-tool-icon");
    const activeNameEl = document.getElementById("active-tool-name");
    if (activeIconEl) activeIconEl.src = currentInst.iconSvg;
    if (activeNameEl) activeNameEl.textContent = currentInst.name;

    if (!currentInst.availableStrokes.includes(scoreState.activeTool.strokeType)) {
        scoreState.activeTool.strokeType = currentInst.availableStrokes[0];
    }

    const paletteContainer = document.getElementById("strokes-palette-container");
    if (paletteContainer) {
        paletteContainer.innerHTML = "";

        currentInst.availableStrokes.forEach(strokeKey => {
            const def = STROKE_DEFINITIONS[strokeKey];
            if (!def) return;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `tool-stroke ${scoreState.activeTool.strokeType === strokeKey ? 'active' : ''}`;
            btn.title = def.label;
            btn.innerHTML = def.iconHTML || def.renderHTML || def.label;
            btn.dataset.strokeKey = strokeKey;

            btn.addEventListener("click", () => {
                paletteContainer.querySelectorAll(".tool-stroke").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                scoreState.activeTool.strokeType = strokeKey;

                if (window.audioEngine) {
                    audioEngine.previewStroke(currentInst.id, strokeKey);
                }
            });

            paletteContainer.appendChild(btn);
        });
    }

    const instDropdown = document.getElementById("instrument-dropdown");
    if (instDropdown) {
        instDropdown.innerHTML = "";
        scoreState.instruments.forEach(inst => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `inst-dropdown-item ${inst.id === currentInst.id ? 'active' : ''}`;
            item.innerHTML = `<img src="${inst.iconSvg}" class="ui-icon-inst-sm" alt="${inst.name}"> <span>${inst.name}</span>`;
            item.addEventListener("click", () => {
                selectActiveInstrument(inst.id);
                instDropdown.classList.remove("visible");
            });
            instDropdown.appendChild(item);
        });
    }
}

export function selectActiveInstrument(instId) {
    scoreState.activeTool.instrumentId = instId;

    document.querySelectorAll(".instrument-card").forEach(card => {
        card.classList.toggle("active", card.dataset.instrumentId === instId);
    });

    document.querySelectorAll(".score-row").forEach(row => {
        row.classList.toggle("active", row.dataset.instrumentId === instId);
    });

    updateToolbarPalettes();
}

export function setupToolbarEvents() {
    const btnUndo = document.getElementById("btn-undo");
    const btnRedo = document.getElementById("btn-redo");
    const btnActiveInst = document.getElementById("btn-active-instrument");
    const instDropdown = document.getElementById("instrument-dropdown");

    if (btnActiveInst && instDropdown) {
        btnActiveInst.addEventListener("click", (e) => {
            e.stopPropagation();
            instDropdown.classList.toggle("visible");
        });

        document.addEventListener("click", () => {
            instDropdown.classList.remove("visible");
        });
    }

    if (btnUndo) btnUndo.addEventListener("click", () => historyManager.undo());
    if (btnRedo) btnRedo.addEventListener("click", () => historyManager.redo());

    window.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                historyManager.undo();
            } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                e.preventDefault();
                historyManager.redo();
            }
        }
    });

    const sidebarList = document.getElementById("instruments-sidebar-list");
    if (sidebarList) {
        sidebarList.addEventListener("click", (e) => {
            const card = e.target.closest(".instrument-card");
            if (!card) return;
            selectActiveInstrument(card.dataset.instrumentId);
        });
    }

    historyManager.updateButtonsState();
}