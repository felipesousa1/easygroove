import { icon } from './icon.js';
import { scoreState, createEmptyMeasure, createEmptyMeasureForSig, getClipboard, isInstrumentHidden, openVolumePanels } from '../core/state.js';
import { TIME_SIGNATURES, getVolumeIcon, supportsSticking } from '../core/constants.js';
import { createBeamsSVG, getStrokeVisual } from './beams.js';
import { updateToolbarPalettes } from './toolbar.js';
import { renderRepeats } from './repeat.js';
import { updateLoopBarVisuals } from './loop.js';
import { historyManager } from '../core/history.js';
import {
    copySelectedMeasures,
    cutSelectedMeasures,
    pasteClipboardToTarget,
    clearSelectedMeasures,
    checkPasteCompatibility
} from '../interaction/clipboard.js';

function updateHeader() {
    const titleDisplay = document.getElementById("title-display");
    const bpmInput = document.getElementById("bpm-input");
    const popoverBpmDisplay = document.getElementById("popover-bpm-display");

    if (titleDisplay) titleDisplay.textContent = scoreState.title;
    if (bpmInput) bpmInput.value = scoreState.bpm;
    if (popoverBpmDisplay) popoverBpmDisplay.textContent = scoreState.bpm;
}

function renderMeasuresTrack(trackContainer) {
    trackContainer.innerHTML = "";

    for (let m = 0; m < scoreState.measuresCount; m++) {
        const header = document.createElement("div");
        header.className = "measure-header";

        const currentSig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
        const config = TIME_SIGNATURES[currentSig] || TIME_SIGNATURES["4/4"];
        const measureWidth = config.beats * 112;

        header.style.width = `${measureWidth}px`;

        const activeRepeat = scoreState.repeats?.find(r => m >= r.start && m <= r.end);
        const isRepeatEnd = activeRepeat && activeRepeat.end === m;
        const isInsideRepeat = activeRepeat && !isRepeatEnd;

        const [num, den] = currentSig.split("/");

        header.innerHTML = `
          <div class="measure-title-group">
            <button type="button" class="time-sig-badge-btn" data-measure-index="${m}" title="Alterar Métrica">
              <span class="sig-num">${num}</span>
              <span class="sig-den">${den}</span>
            </button>
            <span class="measure-title-text">Compasso ${m + 1}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${!isInsideRepeat ? `
            <button type="button" class="measure-loop-btn ${isRepeatEnd ? 'active' : ''}" data-measure-index="${m}" title="Ativar/Desativar Ritornelo">
                ${icon("repeat")}
            </button>
            ` : ''}
            <button type="button" class="measure-menu-btn" data-measure-index="${m}" title="Opções do Compasso">
              <img src="assets/icons/more-vertical.svg" alt="Opções">
            </button>
          </div>
        `;
        trackContainer.appendChild(header);
    }

    const btnAddTrack = document.createElement("button");
    btnAddTrack.type = "button";
    btnAddTrack.className = "btn-add-measure-track";
    btnAddTrack.innerHTML = "+ Compasso";
    btnAddTrack.addEventListener("click", addMeasureToEnd);
    trackContainer.appendChild(btnAddTrack);

    const loopBar = document.createElement("div");
    loopBar.id = "loop-bar";
    loopBar.className = `loop-bar-container ${scoreState.loopState.active && !scoreState.loopState.empty ? 'active' : ''}`;
    loopBar.innerHTML = `
        <div class="loop-handle left" data-handle="left"></div>
        <div class="loop-grab" title="Arrastar loop"></div>
        <div class="loop-handle right" data-handle="right"></div>
    `;
    trackContainer.appendChild(loopBar);

    // Régua clicável abaixo dos compassos, por onde passa a cabeça do playhead
    const playheadLane = document.createElement("div");
    playheadLane.className = "playhead-lane";
    playheadLane.title = "Clique ou arraste para mover o playhead";
    let lanePx = 0;
    for (let m = 0; m < scoreState.measuresCount; m++) {
        const cfg = TIME_SIGNATURES[scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4"] || TIME_SIGNATURES["4/4"];
        lanePx += cfg.beats * 112;
    }
    playheadLane.style.width = `${lanePx}px`;
    playheadLane.innerHTML = `<div id="playhead-head" class="playhead-head"><span class="playhead-grip"></span></div>`;
    trackContainer.appendChild(playheadLane);

    updateLoopBarVisuals();
    renderRepeats();
    if (window.updatePlayheadPosition) window.updatePlayheadPosition();
}


function renderSidebar(sidebarList) {
    sidebarList.querySelectorAll(".instrument-card").forEach(el => el.remove());
    const addInstWrapper = sidebarList.querySelector("div");

    scoreState.instruments.forEach((inst, index) => {
        while (inst.pattern.length < scoreState.measuresCount) {
            inst.pattern.push(createEmptyMeasure());
        }

        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''} ${isInstrumentHidden(inst) ? 'hidden-track' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.dataset.instIndex = index;
        card.draggable = true;

        const isSolo = Boolean(inst.solo);
        const volOpen = openVolumePanels.has(inst.id);
        card.classList.toggle('vol-open', volOpen);
        card.innerHTML = `
        <div class="inst-side inst-side-left">
            <button type="button" class="btn-inst-act btn-hide${inst.hidden ? ' active' : ''}" data-action="toggle-hide-inst" data-inst-id="${inst.id}" data-label="${inst.hidden ? 'Exibir instrumento' : 'Ocultar instrumento'}" aria-label="${inst.hidden ? 'Exibir instrumento' : 'Ocultar instrumento'}">
                ${inst.hidden ? icon("eye-off") : icon("eye")}
            </button>
            <button type="button" class="btn-inst-act btn-solo${isSolo ? ' active' : ''}" data-action="toggle-solo-inst" data-inst-id="${inst.id}" data-label="${isSolo ? 'Desativar solo' : 'Solo'}" aria-label="Solo" aria-pressed="${isSolo}">S</button>
            <button type="button" class="btn-inst-act btn-vol" data-action="toggle-volume" data-inst-id="${inst.id}" data-label="Volume" aria-label="Volume"><img src="${getVolumeIcon(inst.volume)}" alt=""></button>
        </div>
        <div class="inst-side inst-side-right">
            <button type="button" class="btn-inst-act" data-action="duplicate-inst" data-inst-id="${inst.id}" data-label="Duplicar linha" aria-label="Duplicar linha">${icon("duplicate")}</button>
            <button type="button" class="btn-inst-act" data-action="clear-inst" data-inst-id="${inst.id}" data-label="Limpar notas" aria-label="Limpar notas">${icon("eraser")}</button>
            <button type="button" class="btn-inst-act btn-danger" data-action="delete-inst" data-inst-id="${inst.id}" data-label="Excluir instrumento" aria-label="Excluir instrumento">${icon("trash")}</button>
        </div>

        <img src="${inst.iconSvg}" class="inst-icon-img" alt="${inst.name}">
        <span class="inst-name" title="Duplo clique para renomear">${inst.name}</span>
        <input type="text" class="inst-name-input" value="${inst.name}" style="display:none;" maxlength="20">

        <div class="inst-vol-panel">
            <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}" data-inst-id="${inst.id}">
            <div class="vol-display-box" data-inst-id="${inst.id}" title="Clique para editar valor">
                <span class="vol-text">${inst.volume}%</span>
                <input type="number" class="vol-direct-input" min="0" max="100" value="${inst.volume}" style="display: none;">
                <span class="vol-percent" style="display: none;">%</span>
            </div>
        </div>
        `;

        const volSlider = card.querySelector(".vol-slider");
        if (volSlider) {
            volSlider.addEventListener("mousedown", () => { card.draggable = false; });
            volSlider.addEventListener("mouseup", () => { card.draggable = true; });
            volSlider.addEventListener("mouseleave", () => { card.draggable = true; });
        }

        if (addInstWrapper) {
            sidebarList.insertBefore(card, addInstWrapper);
        } else {
            sidebarList.appendChild(card);
        }
    });
}

function renderGrid(scoreGrid) {
    scoreGrid.querySelectorAll(".score-row").forEach(el => el.remove());

    const activeClipboard = getClipboard();

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = `score-row ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''} ${isInstrumentHidden(inst) ? 'hidden-track' : ''}`;
        row.dataset.instrumentId = inst.id;
        const hasSticking = supportsSticking(inst.id);

        for (let m = 0; m < scoreState.measuresCount; m++) {
            const measureContainer = document.createElement("div");

            const isSelected = scoreState.selectedSelection?.some(s => s.instId === inst.id && s.measureIndex === m);
            // Verifica se o compasso está no clipboard multi-instrumento ou de coluna
            let isInClipboard = false;
            if (activeClipboard) {
                if (activeClipboard.type === "column") {
                    isInClipboard = activeClipboard.measureIndex === m;
                } else if (activeClipboard.items) {
                    isInClipboard = activeClipboard.items.some(item => item.instId === inst.id && item.measures.includes(m));
                }
            }

            let classes = ["measure-container"];
            if (isSelected) classes.push("selected");
            if (isInClipboard) classes.push("in-clipboard");

            measureContainer.className = classes.join(" ");
            measureContainer.dataset.instId = inst.id;
            measureContainer.dataset.measureIndex = m;

            const currentSig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
            const config = TIME_SIGNATURES[currentSig] || TIME_SIGNATURES["4/4"];
            const measureWidth = config.beats * 112;
            measureContainer.style.width = `${measureWidth}px`;

            const measurePattern = inst.pattern[m] || [];

            for (let b = 0; b < config.beats; b++) {
                const beatData = measurePattern[b] || { subdivisions: config.subdivisions, notes: new Array(config.subdivisions).fill(null) };
                const beatSubdivs = beatData.subdivisions;

                const beatGroup = document.createElement("div");
                beatGroup.className = "beat-group";
                beatGroup.dataset.instId = inst.id;
                beatGroup.dataset.measureIndex = m;
                beatGroup.dataset.beatIndex = b;
                beatGroup.innerHTML = createBeamsSVG(beatSubdivs);

                const slotsBar = document.createElement("div");
                slotsBar.className = "slots-bar";

                for (let s = 0; s < beatSubdivs; s++) {
                    const stroke = beatData.notes[s] || null;
                    const visual = getStrokeVisual(stroke);

                    const slot = document.createElement("div");
                    slot.className = `note-slot ${visual.className}`;
                    slot.innerHTML = visual.content;
                    slot.dataset.instIndex = instIndex;
                    slot.dataset.measure = m;
                    slot.dataset.beat = b;
                    slot.dataset.step = s;

                    slotsBar.appendChild(slot);
                }

                beatGroup.appendChild(slotsBar);

                // Linha de manulação (D/E) logo abaixo dos toques; o botão só aparece no hover quando está vazio
                if (hasSticking) {
                    const stickingBar = document.createElement("div");
                    stickingBar.className = "sticking-bar";
                    for (let s = 0; s < beatSubdivs; s++) {
                        const hasNote = Boolean(beatData.notes[s]);
                        const hand = hasNote ? (beatData.hands?.[s] || null) : null;
                        const cell = document.createElement("button");
                        cell.type = "button";
                        cell.className = `sticking-cell${hasNote ? "" : " no-note"}`;
                        cell.textContent = hand || "";
                        cell.title = "Manulação: clique para alternar D / E / vazio";
                        cell.tabIndex = hasNote ? 0 : -1;
                        cell.dataset.instIndex = instIndex;
                        cell.dataset.measure = m;
                        cell.dataset.beat = b;
                        cell.dataset.step = s;
                        stickingBar.appendChild(cell);
                    }
                    beatGroup.appendChild(stickingBar);
                }
                measureContainer.appendChild(beatGroup);
            }

            row.appendChild(measureContainer);
        }
        scoreGrid.appendChild(row);
    });
}

export function renderSelectionToolbar() {
    let toolbar = document.getElementById("selection-quick-toolbar");
    if (!scoreState.selectedSelection || scoreState.selectedSelection.length === 0) {
        if (toolbar) toolbar.remove();
        return;
    }

    const selectedEls = document.querySelectorAll(".measure-container.selected");
    if (selectedEls.length === 0) {
        if (toolbar) toolbar.remove();
        return;
    }

    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    const gridRect = scoreGrid.getBoundingClientRect();

    let minTop = Infinity;
    let minLeft = Infinity;
    let maxRight = -Infinity;

    selectedEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < minTop) minTop = rect.top;
        if (rect.left < minLeft) minLeft = rect.left;
        if (rect.right > maxRight) maxRight = rect.right;
    });

    if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.id = "selection-quick-toolbar";
        scoreGrid.appendChild(toolbar);
    } else if (toolbar.parentElement !== scoreGrid) {
        scoreGrid.appendChild(toolbar);
    }

    const hasClipboardData = Boolean(getClipboard());

    // Obtém a célula superior esquerda da seleção atual para validar a colagem
    const sortedSelection = [...scoreState.selectedSelection].sort((a, b) => {
        if (a.instId !== b.instId) {
            const idxA = scoreState.instruments.findIndex(i => i.id === a.instId);
            const idxB = scoreState.instruments.findIndex(i => i.id === b.instId);
            return idxA - idxB;
        }
        return a.measureIndex - b.measureIndex;
    });

    const targetItem = sortedSelection[0];
    const pasteStatus = hasClipboardData ? checkPasteCompatibility(targetItem.instId, targetItem.measureIndex) : { compatible: false, reason: "Nenhum conteúdo no clipboard." };

    toolbar.innerHTML = `
        <button type="button" class="quick-action-btn" id="quick-btn-copy" title="Copiar (Ctrl+C)">
            ${icon("copy")}
            Copiar
        </button>
        <button type="button" class="quick-action-btn" id="quick-btn-cut" title="Recortar (Ctrl+X)">
            ${icon("cut")}
            Recortar
        </button>
        ${hasClipboardData ? `
        <button type="button" class="quick-action-btn \({!pasteStatus.compatible ? 'disabled' : ''}" id="quick-btn-paste" title="\){pasteStatus.compatible ? 'Colar (Ctrl+V)' : pasteStatus.reason}" ${!pasteStatus.compatible ? 'disabled' : ''}>
            ${icon("paste")}
            Colar
        </button>
        ` : ''}
        <button type="button" class="quick-action-btn danger" id="quick-btn-clear" title="Limpar (Del)">
            ${icon("clear")}
            Limpar
        </button>
    `;

    const relativeLeft = (minLeft - gridRect.left) + ((maxRight - minLeft) / 2);
    const relativeTop = (minTop - gridRect.top) - 34;

    toolbar.style.top = `${relativeTop}px`;
    toolbar.style.left = `${relativeLeft}px`;

    document.getElementById("quick-btn-copy")?.addEventListener("click", (e) => {
        e.stopPropagation();
        copySelectedMeasures();
    });

    document.getElementById("quick-btn-cut")?.addEventListener("click", (e) => {
        e.stopPropagation();
        cutSelectedMeasures();
    });

    document.getElementById("quick-btn-paste")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (pasteStatus.compatible && targetItem) {
            pasteClipboardToTarget(targetItem.instId, targetItem.measureIndex);
        }
    });

    document.getElementById("quick-btn-clear")?.addEventListener("click", (e) => {
        e.stopPropagation();
        clearSelectedMeasures();
    });
}
export function renderScore() {
    const measuresTrack = document.getElementById("measures-track");
    const sidebarList = document.getElementById("instruments-sidebar-list");
    const scoreGrid = document.getElementById("score-grid");

    if (!measuresTrack || !sidebarList || !scoreGrid) return;

    updateHeader();
    renderMeasuresTrack(measuresTrack);
    renderSidebar(sidebarList);
    renderGrid(scoreGrid);
    updateToolbarPalettes();
    renderSelectionToolbar();

    if (window.audioEngine && audioEngine.isInitialized) {
        audioEngine.updateTransportSettings();
        audioEngine.syncWithScore();
    }
}

export function addMeasureToEnd() {
    historyManager.pushState();

    // Herda a métrica do último compasso
    const lastIndex = scoreState.measuresCount - 1;
    const lastSig = scoreState.measuresConfig?.[lastIndex]?.timeSignature || scoreState.timeSignature || "4/4";

    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];
    scoreState.measuresConfig[scoreState.measuresCount] = { timeSignature: lastSig };

    scoreState.instruments.forEach(inst => {
        inst.pattern.push(createEmptyMeasureForSig(lastSig));
    });
    scoreState.measuresCount++;
    renderScore();
}