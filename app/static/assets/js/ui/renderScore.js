import { scoreState, createEmptyMeasure, getClipboard } from '../core/state.js';
import { TIME_SIGNATURES, getVolumeIcon } from '../core/constants.js';
import { createBeamsSVG, getStrokeVisual } from './beams.js';
import { updateToolbarPalettes } from './toolbar.js';
import { renderRepeats } from './repeat.js';
import { updateLoopBarVisuals } from './loop.js';
import { historyManager } from '../core/history.js';
import { 
    copySelectedMeasures, 
    cutSelectedMeasures, 
    pasteClipboardToTarget, 
    clearSelectedMeasures 
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                </svg>
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
    loopBar.className = `loop-bar-container ${scoreState.loopState.active ? 'active' : ''}`;
    loopBar.innerHTML = `
        <div class="loop-handle left" data-handle="left"></div>
        <div class="loop-handle right" data-handle="right"></div>
    `;
    trackContainer.appendChild(loopBar);

    updateLoopBarVisuals();
    renderRepeats();
}

function renderSidebar(sidebarList) {
    sidebarList.querySelectorAll(".instrument-card").forEach(el => el.remove());
    const addInstWrapper = sidebarList.querySelector("div");

    scoreState.instruments.forEach((inst, index) => {
        while (inst.pattern.length < scoreState.measuresCount) {
            inst.pattern.push(createEmptyMeasure());
        }

        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''} ${inst.hidden ? 'hidden-track' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.dataset.instIndex = index;
        card.draggable = true;

        card.innerHTML = `
        <div class="inst-header-row">
            <span></span>
            <button type="button" class="btn-inst-menu" data-inst-id="${inst.id}" title="Opções do Instrumento">
            <img src="assets/icons/more-vertical.svg" alt="Opções">
            </button>
        </div>

        <img src="${inst.iconSvg}" class="inst-icon-img" alt="${inst.name}">
        <span class="inst-name" title="Duplo clique para renomear">${inst.name}</span>
        <input type="text" class="inst-name-input" value="${inst.name}" style="display:none;" maxlength="20">

        <div class="inst-volume-row">
            <button type="button" class="btn-mute" data-inst-id="${inst.id}" title="Mute / Desmutar">
            <img src="${getVolumeIcon(inst.volume)}" alt="Volume">
            </button>
            <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}" data-inst-id="${inst.id}">
            
            <div class="vol-display-box" data-inst-id="${inst.id}" title="Clique para editar valor">
            <span class="vol-text">${inst.volume}%</span>
            <input type="number" class="vol-direct-input" min="0" max="100" value="${inst.volume}" style="display: none;">
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

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = `score-row \({inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}\){inst.hidden ? 'hidden-track' : ''}`;
        row.dataset.instrumentId = inst.id;

        for (let m = 0; m < scoreState.measuresCount; m++) {
            const measureContainer = document.createElement("div");

            const isSelected = scoreState.selectedSelection?.some(s => s.instId === inst.id && s.measureIndex === m);
            const isInClipboard = window.selectionClipboard?.instId === inst.id && window.selectionClipboard?.measures?.includes(m);

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
        document.body.appendChild(toolbar);
    }

    const hasClipboardData = Boolean(getClipboard());

    toolbar.innerHTML = `
        <button type="button" class="quick-action-btn" id="quick-btn-copy" title="Copiar (Ctrl+C)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copiar
        </button>
        <button type="button" class="quick-action-btn" id="quick-btn-cut" title="Recortar (Ctrl+X)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
            Recortar
        </button>
        ${hasClipboardData ? `
        <button type="button" class="quick-action-btn" id="quick-btn-paste" title="Colar (Ctrl+V)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            Colar
        </button>
        ` : ''}
        <button type="button" class="quick-action-btn danger" id="quick-btn-clear" title="Limpar (Del)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Limpar
        </button>
    `;

    const selectionCenterX = minLeft + ((maxRight - minLeft) / 2);
    const topPos = minTop + window.scrollY - 36;

    toolbar.style.top = `${topPos}px`;
    toolbar.style.left = `${selectionCenterX}px`;

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
        const sorted = [...scoreState.selectedSelection].sort((a, b) => a.measureIndex - b.measureIndex);
        if (sorted.length > 0) {
            pasteClipboardToTarget(sorted[0].instId, sorted[0].measureIndex);
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
    }
}

export function addMeasureToEnd() {
    historyManager.pushState();
    scoreState.instruments.forEach(inst => {
        inst.pattern.push(createEmptyMeasure());
    });
    scoreState.measuresCount++;
    renderScore();
}