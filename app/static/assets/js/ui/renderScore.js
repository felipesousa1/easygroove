import { scoreState, createEmptyMeasure } from '../state.js';
import { TIME_SIGNATURES, getVolumeIcon } from '../constants.js';
import { createBeamsSVG, getStrokeVisual } from './beams.js';
import { updateToolbarPalettes, selectActiveInstrument } from './toolbar.js';
import { renderRepeats } from './repeat.js';
import { updateLoopBarVisuals } from './loop.js';
import { historyManager } from '../history.js';

// ==========================================
// FUNÇÕES AUXILIARES DE RENDERIZAÇÃO
// ==========================================

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

        header.innerHTML = `
          <span>Compasso ${m + 1}</span>
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

// ==========================================
// EXPORTS PRINCIPAIS
// ==========================================

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

// ==========================================
// EVENTOS DE SETUP
// ==========================================

export function setupGridEvents() {
    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    scoreGrid.addEventListener("click", (e) => {
        const slot = e.target.closest(".note-slot");
        if (!slot) return;

        const instIndex = parseInt(slot.dataset.instIndex, 10);
        const measure = parseInt(slot.dataset.measure, 10);
        const beat = parseInt(slot.dataset.beat, 10);
        const step = parseInt(slot.dataset.step, 10);

        const instrument = scoreState.instruments[instIndex];
        if (!instrument || !instrument.pattern[measure] || !instrument.pattern[measure][beat]) return;

        if (scoreState.activeTool.instrumentId !== instrument.id) {
            selectActiveInstrument(instrument.id);
        }

        const currentStroke = instrument.pattern[measure][beat].notes[step];
        const targetStroke = scoreState.activeTool.strokeType;
        const nextStroke = (currentStroke === targetStroke) ? null : targetStroke;

        if (currentStroke !== nextStroke) {
            historyManager.pushState();

            instrument.pattern[measure][beat].notes[step] = nextStroke;

            const visual = getStrokeVisual(nextStroke);
            slot.className = `note-slot ${visual.className}`;
            slot.innerHTML = visual.content;

            if (nextStroke && window.audioEngine) {
                audioEngine.previewStroke(instrument.id, nextStroke);
            }
        }
    });
}

export function setupHeaderEvents() {
    const bpmInput = document.getElementById("bpm-input");
    const popoverBpmDisplay = document.getElementById("popover-bpm-display");

    if (bpmInput) {
        bpmInput.addEventListener("change", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
                if (popoverBpmDisplay) popoverBpmDisplay.textContent = val;
            } else {
                e.target.value = scoreState.bpm;
            }
        });
    }

    const titleDisplay = document.getElementById("title-display");
    const titleInput = document.getElementById("title-input");
    const btnEditTitle = document.getElementById("btn-edit-title");

    if (titleDisplay && titleInput && btnEditTitle) {
        function startEditingTitle() {
            titleInput.value = scoreState.title;
            titleDisplay.style.display = "none";
            btnEditTitle.style.display = "none";
            titleInput.style.display = "inline-block";
            titleInput.focus();
            titleInput.select();
        }

        function saveTitle() {
            const newTitle = titleInput.value.trim() || "Sem Título";
            scoreState.title = newTitle;
            titleDisplay.textContent = newTitle;
            titleDisplay.style.display = "inline-block";
            btnEditTitle.style.display = "inline-flex";
            titleInput.style.display = "none";
        }

        function cancelTitleEdit() {
            titleDisplay.style.display = "inline-block";
            btnEditTitle.style.display = "inline-flex";
            titleInput.style.display = "none";
        }

        btnEditTitle.addEventListener("click", startEditingTitle);
        titleDisplay.addEventListener("dblclick", startEditingTitle);

        titleInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveTitle();
            else if (e.key === "Escape") cancelTitleEdit();
        });

        titleInput.addEventListener("blur", saveTitle);
    }
}

export function setupTransportEvents() {
    const btnPlay = document.getElementById("btn-play");
    const btnStop = document.getElementById("btn-stop");
    const bpmInput = document.getElementById("bpm-input");
    const playIconImg = document.getElementById("play-icon-img");

    if (!btnPlay || !btnStop) return;

    btnPlay.addEventListener("click", async () => {
        if (!audioEngine.isPlaying) {
            await audioEngine.start();
            btnPlay.classList.add("active");
            if (playIconImg) playIconImg.src = "assets/icons/pause.svg";
        } else {
            audioEngine.pause();
            btnPlay.classList.remove("active");
            if (playIconImg) playIconImg.src = "assets/icons/play.svg";
        }
    });

    btnStop.addEventListener("click", () => {
        audioEngine.stop();
        btnPlay.classList.remove("active");
        if (playIconImg) playIconImg.src = "assets/icons/play.svg";
    });

    // POPOVER DO METRÔNOMO
    const btnMetronome = document.getElementById("btn-metronome");
    const popover = document.getElementById("metronome-popover");
    const toggleInput = document.getElementById("popover-metronome-toggle");
    const popoverBpmDisplay = document.getElementById("popover-bpm-display");
    const volSlider = document.getElementById("metronome-vol-slider");
    const volDisplay = document.getElementById("metronome-vol-display");

    if (btnMetronome && popover) {
        btnMetronome.addEventListener("click", (e) => {
            e.stopPropagation();
            popover.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!popover.contains(e.target) && !btnMetronome.contains(e.target)) {
                popover.classList.remove("active");
            }
        });

        toggleInput?.addEventListener("change", (e) => {
            audioEngine.metronomeEnabled = e.target.checked;
            btnMetronome.classList.toggle("active", e.target.checked);
        });

        volSlider?.addEventListener("input", (e) => {
            const vol = parseInt(e.target.value, 10);
            if (volDisplay) volDisplay.textContent = `${vol}%`;
            audioEngine.setMetronomeVolume(vol);
        });
    }

    // BOTÕES DE INCREMENTO DE BPM (POPOVER)
    document.querySelectorAll(".bpm-stepper-control .btn-bpm-step").forEach(btn => {
        btn.addEventListener("click", () => {
            const step = parseInt(btn.dataset.step, 10);
            let currentBpm = scoreState.bpm || 120;
            let newBpm = Math.min(Math.max(currentBpm + step, 40), 260);

            scoreState.bpm = newBpm;
            if (bpmInput) bpmInput.value = newBpm;
            if (popoverBpmDisplay) popoverBpmDisplay.textContent = newBpm;

            if (window.audioEngine) window.audioEngine.updateTransportSettings();
        });
    });

    if (bpmInput) {
        bpmInput.addEventListener("input", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
                if (popoverBpmDisplay) popoverBpmDisplay.textContent = val;
                if (Tone.Transport) {
                    Tone.Transport.bpm.value = val;
                }
            }
        });
    }
}

export function setupMainMenuEvents() {
    const btnMenu = document.getElementById("btn-main-menu");
    const menuDropdown = document.getElementById("main-app-menu");
    const importFileInput = document.getElementById("import-file-input");

    if (!btnMenu || !menuDropdown) return;

    btnMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!menuDropdown.contains(e.target) && e.target !== btnMenu) {
            menuDropdown.classList.remove("active");
        }
    });

    document.getElementById("menu-opt-new")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const modal = document.getElementById("new-arrangement-modal");
        if (modal) modal.classList.add("active");
    });

    document.getElementById("menu-opt-library")?.addEventListener("click", () => {
        window.location.href = "/biblioteca";
    });

    document.getElementById("menu-opt-save")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const saveBtn = document.querySelector('.header-right button[title="Salvar Projeto"]');
        if (saveBtn) saveBtn.click();
    });

    document.getElementById("menu-opt-export-json")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const exportBtn = document.querySelector('.header-right button[title="Exportar Arranjo"]');
        if (exportBtn) exportBtn.click();
    });

    document.getElementById("menu-opt-import-json")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        if (importFileInput) importFileInput.click();
    });

    document.getElementById("menu-opt-help")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const helpBtn = document.querySelector(".floating-help-btn");
        if (helpBtn) helpBtn.click();
    });

    document.getElementById("menu-opt-exit")?.addEventListener("click", () => {
        window.location.href = "/";
    });
}