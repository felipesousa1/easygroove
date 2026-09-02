import { scoreState, createEmptyMeasure } from '../state.js';
import { INSTRUMENT_PRESETS, getVolumeIcon } from '../constants.js';
import { historyManager } from '../history.js';
import { updateToolbarPalettes } from './toolbar.js';
import { renderScore } from './renderScore.js';

export function setupInstrumentControlEvents() {
    const sidebarList = document.getElementById("instruments-sidebar-list");
    const addInstBtn = document.getElementById("btn-open-add-instrument");
    const addInstDropdown = document.getElementById("add-instrument-dropdown");
    const optionsDropdown = document.getElementById("instrument-options-dropdown");

    let activeInstForMenu = null;
    let draggedInstId = null;

    if (addInstBtn && addInstDropdown) {
        addInstDropdown.innerHTML = "";
        Object.keys(INSTRUMENT_PRESETS).forEach(typeKey => {
            const preset = INSTRUMENT_PRESETS[typeKey];
            const item = document.createElement("button");
            item.type = "button";
            item.className = "inst-dropdown-item";
            item.innerHTML = `<img src="${preset.iconSvg}" class="ui-icon-inst-sm" alt="${preset.name}"> <span>${preset.name}</span>`;
            item.addEventListener("click", () => {
                addNewInstrument(typeKey);
                addInstDropdown.classList.remove("visible");
            });
            addInstDropdown.appendChild(item);
        });

        addInstBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            addInstDropdown.classList.toggle("visible");
        });
    }

    if (sidebarList) {
        // Previne o drag-and-drop do card ao interagir com sliders ou inputs
        sidebarList.addEventListener("dragstart", (e) => {
            if (
                e.target.closest(".vol-slider") ||
                e.target.closest("input") ||
                e.target.closest(".vol-display-box") ||
                e.target.closest(".btn-inst-menu")
            ) {
                e.preventDefault();
                return;
            }

            const card = e.target.closest(".instrument-card");
            if (!card) return;
            draggedInstId = card.dataset.instrumentId;
            card.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        });

        // Atualização do Evento de Duplo Clique no Sidebar
        sidebarList.addEventListener("dblclick", (e) => {
            const card = e.target.closest(".instrument-card");
            if (!card) return;

            const instId = card.dataset.instrumentId;
            const inst = scoreState.instruments.find(i => i.id === instId);

            if (inst) {
                e.stopPropagation();
                startRenameInstrument(card, inst);
            }
        });

        sidebarList.addEventListener("input", (e) => {
            if (e.target.classList.contains("vol-slider")) {
                const instId = e.target.dataset.instId;
                const val = parseInt(e.target.value, 10);
                updateInstrumentVolume(instId, val);
            }
        });

        sidebarList.addEventListener("click", (e) => {
            const muteBtn = e.target.closest(".btn-mute");
            if (muteBtn) {
                e.stopPropagation();
                const instId = muteBtn.dataset.instId;
                const inst = scoreState.instruments.find(i => i.id === instId);
                if (!inst) return;

                if (inst.volume > 0) {
                    inst.previousVolume = inst.volume;
                    updateInstrumentVolume(instId, 0);
                } else {
                    updateInstrumentVolume(instId, inst.previousVolume || 50);
                }
                return;
            }

            const volBox = e.target.closest(".vol-display-box");
            if (volBox) {
                e.stopPropagation();
                const volText = volBox.querySelector(".vol-text");
                const volInput = volBox.querySelector(".vol-direct-input");
                const instId = volBox.dataset.instId;

                volText.style.display = "none";
                volInput.style.display = "block";
                volInput.focus();
                volInput.select();

                function commitVolume() {
                    let val = parseInt(volInput.value, 10);
                    if (isNaN(val)) val = 0;
                    val = Math.max(0, Math.min(100, val));
                    updateInstrumentVolume(instId, val);
                    volInput.style.display = "none";
                    volText.style.display = "block";
                }

                volInput.onkeydown = (evt) => {
                    if (evt.key === "Enter") commitVolume();
                    if (evt.key === "Escape") {
                        volInput.style.display = "none";
                        volText.style.display = "block";
                    }
                };
                volInput.onblur = commitVolume;
                return;
            }

            const menuBtn = e.target.closest(".btn-inst-menu");
            if (menuBtn) {
                e.stopPropagation();
                activeInstForMenu = menuBtn.dataset.instId;

                const targetInst = scoreState.instruments.find(i => i.id === activeInstForMenu);
                const hideBtn = optionsDropdown.querySelector('[data-action="toggle-hide-inst"]');
                if (hideBtn && targetInst) {
                    hideBtn.textContent = targetInst.hidden ? "👁️ Exibir Instrumento" : "👁️ Ocultar Instrumento";
                }

                const rect = menuBtn.getBoundingClientRect();
                optionsDropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
                optionsDropdown.style.left = `${rect.left + window.scrollX}px`;
                optionsDropdown.classList.add("visible");
                return;
            }
        });

        sidebarList.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const targetCard = e.target.closest(".instrument-card");
            if (!targetCard || targetCard.dataset.instrumentId === draggedInstId) return;

            const rect = targetCard.getBoundingClientRect();
            const isTop = (e.clientY - rect.top) < (rect.height / 2);
            targetCard.classList.toggle("drag-over-top", isTop);
            targetCard.classList.toggle("drag-over-bottom", !isTop);
        });

        sidebarList.addEventListener("dragleave", (e) => {
            const targetCard = e.target.closest(".instrument-card");
            if (targetCard) {
                targetCard.classList.remove("drag-over-top", "drag-over-bottom");
            }
        });

        sidebarList.addEventListener("drop", (e) => {
            e.preventDefault();
            const targetCard = e.target.closest(".instrument-card");
            if (!targetCard || !draggedInstId) return;

            const targetInstId = targetCard.dataset.instrumentId;
            if (targetInstId === draggedInstId) return;

            const fromIndex = scoreState.instruments.findIndex(i => i.id === draggedInstId);
            let toIndex = scoreState.instruments.findIndex(i => i.id === targetInstId);

            const rect = targetCard.getBoundingClientRect();
            const isBottom = (e.clientY - rect.top) >= (rect.height / 2);
            if (isBottom) toIndex++;

            if (fromIndex !== -1 && toIndex !== -1) {
                historyManager.pushState();
                const [moved] = scoreState.instruments.splice(fromIndex, 1);
                const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
                scoreState.instruments.splice(insertIndex, 0, moved);
                renderScore();
            }
        });

        sidebarList.addEventListener("dragend", () => {
            draggedInstId = null;
            document.querySelectorAll(".instrument-card").forEach(c => {
                c.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
            });
        });
    }

    if (optionsDropdown) {
        optionsDropdown.addEventListener("click", (e) => {
            const item = e.target.closest(".dropdown-item");
            if (!item || !activeInstForMenu) return;

            const action = item.dataset.action;
            const instIndex = scoreState.instruments.findIndex(i => i.id === activeInstForMenu);
            if (instIndex === -1) return;

            if (action === "rename-inst") {
                optionsDropdown.classList.remove("visible");
                const card = document.querySelector(`.instrument-card[data-instrument-id="${activeInstForMenu}"]`);
                const inst = scoreState.instruments[instIndex];
                if (card && inst) {
                    // Pequeno atraso para fechar o menu antes de dar o foco no input
                    setTimeout(() => startRenameInstrument(card, inst), 50);
                }
                return;
            }

            historyManager.pushState();

            if (action === "toggle-hide-inst") {
                scoreState.instruments[instIndex].hidden = !scoreState.instruments[instIndex].hidden;
            } else if (action === "delete-inst") {
                if (scoreState.instruments.length <= 1) {
                    alert("O arranjo precisa ter no mínimo 1 instrumento.");
                    return;
                }
                scoreState.instruments.splice(instIndex, 1);
                if (scoreState.activeTool.instrumentId === activeInstForMenu) {
                    scoreState.activeTool.instrumentId = scoreState.instruments[0].id;
                }
            } else if (action === "duplicate-inst") {
                const original = scoreState.instruments[instIndex];
                const cloned = {
                    ...JSON.parse(JSON.stringify(original)),
                    id: `${original.id.split('_')[0]}_${Date.now()}`,
                    name: `${original.name} (Cópia)`
                };
                scoreState.instruments.splice(instIndex + 1, 0, cloned);
            } else if (action === "clear-inst") {
                scoreState.instruments[instIndex].pattern = scoreState.instruments[instIndex].pattern.map(() => createEmptyMeasure());
            }

            optionsDropdown.classList.remove("visible");
            renderScore();
        });
    }

    document.addEventListener("click", () => {
        if (addInstDropdown) addInstDropdown.classList.remove("visible");
        if (optionsDropdown) optionsDropdown.classList.remove("visible");
        document.querySelectorAll(".volume-popover").forEach(p => p.classList.remove("visible"));
    });
}

// Função isolada e robusta para ativar a edição do nome
function startRenameInstrument(card, inst) {
    const nameEl = card.querySelector(".inst-name");
    const inputEl = card.querySelector(".inst-name-input");

    if (!nameEl || !inputEl) return;

    nameEl.style.display = "none";
    inputEl.style.display = "block";
    inputEl.focus();
    inputEl.select();

    let isCommitted = false;

    function commitName() {
        if (isCommitted) return;
        isCommitted = true;

        const newName = inputEl.value.trim() || inst.name;
        inst.name = newName;
        nameEl.textContent = newName;
        inputEl.style.display = "none";
        nameEl.style.display = "block";

        updateToolbarPalettes();
    }

    // Enter confirma, Escape cancela
    function handleKeyDown(evt) {
        if (evt.key === "Enter") {
            evt.preventDefault();
            commitName();
            inputEl.blur();
        } else if (evt.key === "Escape") {
            evt.preventDefault();
            isCommitted = true; // Cancela sem alterar
            inputEl.value = inst.name;
            inputEl.style.display = "none";
            nameEl.style.display = "block";
            inputEl.blur();
        }
    }

    inputEl.addEventListener("keydown", handleKeyDown);
    inputEl.addEventListener("blur", commitName, { once: true });
}

export function updateInstrumentVolume(instId, volume) {
    const inst = scoreState.instruments.find(i => i.id === instId);
    if (!inst) return;

    inst.volume = volume;

    const card = document.querySelector(`.instrument-card[data-instrument-id="${instId}"]`);
    if (card) {
        const slider = card.querySelector(".vol-slider");
        const muteImg = card.querySelector(".btn-mute img");
        const volText = card.querySelector(".vol-text");
        const numInput = card.querySelector(".volume-number-input");

        if (slider) slider.value = volume;
        if (volText) volText.textContent = `${volume}%`;
        if (numInput) numInput.value = volume;
        if (muteImg) muteImg.src = getVolumeIcon(volume);
    }

    if (window.audioEngine) {
        audioEngine.setInstrumentVolume(instId, volume);
    }
}

export function addNewInstrument(typeKey) {
    const preset = INSTRUMENT_PRESETS[typeKey];
    if (!preset) return;

    historyManager.pushState();

    const uniqueId = `${typeKey}_${Date.now()}`;
    const newInst = {
        id: uniqueId,
        name: preset.name,
        iconSvg: preset.iconSvg,
        volume: 50,
        availableStrokes: [...preset.availableStrokes],
        pattern: []
    };

    scoreState.instruments.push(newInst);
    scoreState.activeTool.instrumentId = uniqueId;

    if (window.audioEngine && audioEngine.isInitialized) {
        audioEngine.initInstrumentChannel(newInst);
    }

    renderScore();
}