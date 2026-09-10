import { scoreState, createEmptyMeasure } from '../core/state.js';
import { TIME_SIGNATURES, getVolumeIcon } from '../core/constants.js';
import { createBeamsSVG, getStrokeVisual } from './beams.js';
import { updateToolbarPalettes } from './toolbar.js';
import { renderRepeats } from './repeat.js';
import { updateLoopBarVisuals } from './loop.js';
import { historyManager } from '../core/history.js';

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
        row.className = `score-row ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''} ${inst.hidden ? 'hidden-track' : ''}`;
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