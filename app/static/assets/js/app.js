let currentArrangementId = null;

// ==========================================
// 1. DICIONÁRIO DE ARTICULAÇÕES E METADADOS
// ==========================================

const STROKE_DEFINITIONS = {
    "pele-aberto": {
        label: "Toque Aberto / Pele",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#111827;"></span>`,
        className: "filled",
        renderHTML: ""
    },
    "surdo-abafado": {
        label: "Surdo Abafado",
        iconHTML: `<span class="stroke-ring-accent" style="display:inline-flex; align-items:center; justify-content:center; width:13px; height:13px; border:2px solid #111827; border-radius:50%; box-sizing:border-box; background:#111827; box-shadow: 0 0 0 1.5px #ffffff inset;"></span>`,
        className: "ring-accent",
        renderHTML: ""
    },
    "fantasma": {
        label: "Nota Fantasma / Fraco",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#111827;"></span>`,
        className: "small-dot",
        renderHTML: ""
    },
    "aro": {
        label: "Toque no Aro",
        iconHTML: `<span class="stroke-ring" style="display:inline-block; width:12px; height:12px; border:2px solid #111827; border-radius:50%; box-sizing:border-box;"></span>`,
        className: "ring-empty",
        renderHTML: ""
    },
    "rimshot": {
        label: "Rimshot",
        iconHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot">`
    },
    "rufo": {
        label: "Rufo",
        iconHTML: `<img src="assets/icons/stroke-rufo.svg" alt="Rufo" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rufo.svg" alt="Rufo">`
    },
    "slap": {
        label: "Slap / Mão",
        iconHTML: `<img src="assets/icons/stroke-slap.svg" alt="Slap" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-slap.svg" alt="Slap">`
    },
    "chocalho-frente": {
        label: "Chocalho (Frente)",
        iconHTML: `&gt;`,
        className: "chevron-accent",
        renderHTML: `&gt;`
    },
    "chocalho-tras": {
        label: "Chocalho (Trás)",
        iconHTML: `&lt;`,
        className: "chevron-back",
        renderHTML: `&lt;`
    },
    "tamborim-cima": {
        label: "Tamborim (Em Cima)",
        iconHTML: `▲`,
        className: "arrow-up",
        renderHTML: `▲`
    },
    "tamborim-baixo": {
        label: "Tamborim (Embaixo)",
        iconHTML: `▼`,
        className: "arrow-down",
        renderHTML: `▼`
    }
};

const INSTRUMENT_PRESETS = {
    surdo1: { name: "Surdo 1ª", iconSvg: "assets/icons/inst-surdo1.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    surdo2: { name: "Surdo 2ª", iconSvg: "assets/icons/inst-surdo2.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    surdo3: { name: "Surdo 3ª", iconSvg: "assets/icons/inst-surdo3.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    caixa: { name: "Caixa", iconSvg: "assets/icons/inst-caixa.svg", availableStrokes: ["pele-aberto", "fantasma", "aro", "rimshot", "rufo"] },
    repique: { name: "Repique", iconSvg: "assets/icons/inst-repique.svg", availableStrokes: ["pele-aberto", "rimshot", "aro", "slap", "rufo"] },
    chocalho: { name: "Chocalho", iconSvg: "assets/icons/inst-chocalho.svg", availableStrokes: ["chocalho-frente", "chocalho-tras"] },
    tamborim: { name: "Tamborim", iconSvg: "assets/icons/inst-tamborim.svg", availableStrokes: ["tamborim-cima", "tamborim-baixo"] }
};

function getVolumeIcon(vol) {
    if (vol === 0) return "assets/icons/vol-off.svg";
    if (vol < 60) return "assets/icons/vol-baixo.svg";
    return "assets/icons/vol-alto.svg";
}

// ==========================================
// 2. MODELAGEM DO ESTADO (scoreState)
// ==========================================

const scoreState = {
    title: "Bossa Nova Principal",
    bpm: 120,
    measuresCount: 3,
    beatsPerMeasure: 4,
    subdivisions: 4,

    // Novo estado de loop magnético
    loopState: {
        active: false,
        startMeasure: 0,
        endMeasure: 1 // Inclusivo no início, exclusivo no final (1 compasso de duração)
    },

    activeTool: {
        instrumentId: "surdo1",
        strokeType: "pele-aberto"
    },

    instruments: [
        {
            id: "surdo1",
            name: "Surdo 1ª",
            iconSvg: "assets/icons/inst-surdo1.svg",
            volume: 80,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "surdo2",
            name: "Surdo 2ª",
            iconSvg: "assets/icons/inst-surdo2.svg",
            volume: 80,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "surdo3",
            name: "Surdo 3ª",
            iconSvg: "assets/icons/inst-surdo3.svg",
            volume: 80,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "caixa",
            name: "Caixa",
            iconSvg: "assets/icons/inst-caixa.svg",
            volume: 80,
            availableStrokes: ["pele-aberto", "fantasma", "aro", "rimshot", "rufo"],
            pattern: []
        },
        {
            id: "repique",
            name: "Repique",
            iconSvg: "assets/icons/inst-repique.svg",
            volume: 80,
            availableStrokes: ["pele-aberto", "rimshot", "aro", "slap", "rufo"],
            pattern: []
        },
        {
            id: "chocalho",
            name: "Chocalho",
            iconSvg: "assets/icons/inst-chocalho.svg",
            volume: 80,
            availableStrokes: ["chocalho-frente", "chocalho-tras"],
            pattern: []
        },
        {
            id: "tamborim",
            name: "Tamborim",
            iconSvg: "assets/icons/inst-tamborim.svg",
            volume: 80,
            availableStrokes: ["tamborim-cima", "tamborim-baixo"],
            pattern: []
        }
    ]
};

// ==========================================
// 3. TEMPLATES E RENDERIZAÇÃO
// ==========================================

function createBeamsSVG() {
    return `
    <svg class="beat-beams" viewBox="0 0 112 32" preserveAspectRatio="none">
      <line x1="14" y1="2" x2="98" y2="2" stroke="#0f172a" stroke-width="3.5"/>
      <line x1="14" y1="9" x2="98" y2="9" stroke="#0f172a" stroke-width="3.5"/>
      <line x1="14" y1="2" x2="14" y2="32" stroke="#0f172a" stroke-width="2"/>
      <line x1="42" y1="2" x2="42" y2="32" stroke="#0f172a" stroke-width="2"/>
      <line x1="70" y1="2" x2="70" y2="32" stroke="#0f172a" stroke-width="2"/>
      <line x1="98" y1="2" x2="98" y2="32" stroke="#0f172a" stroke-width="2"/>
    </svg>
  `;
}

function getStrokeVisual(stroke) {
    if (!stroke || !STROKE_DEFINITIONS[stroke]) {
        return { className: "empty", content: "" };
    }
    const def = STROKE_DEFINITIONS[stroke];
    return { className: def.className, content: def.renderHTML };
}

function createEmptyMeasure() {
    return new Array(scoreState.beatsPerMeasure * scoreState.subdivisions).fill(null);
}

function renderScore() {
    const measuresTrack = document.getElementById("measures-track");
    const sidebarList = document.getElementById("instruments-sidebar-list");
    const scoreGrid = document.getElementById("score-grid");

    if (!measuresTrack || !sidebarList || !scoreGrid) return;

    const titleDisplay = document.getElementById("title-display");
    const bpmInput = document.getElementById("bpm-input");
    if (titleDisplay) titleDisplay.textContent = scoreState.title;
    if (bpmInput) bpmInput.value = scoreState.bpm;

    // 1. Cabeçalhos dos Compassos + Botão "+ Compasso"
    measuresTrack.innerHTML = "";
    for (let m = 0; m < scoreState.measuresCount; m++) {
        const header = document.createElement("div");
        header.className = "measure-header";
        header.innerHTML = `
      <span>Compasso ${m + 1}</span>
      <button type="button" class="measure-menu-btn" data-measure-index="${m}" title="Opções do Compasso">
        <img src="assets/icons/more-vertical.svg" alt="Opções">
      </button>
    `;
        measuresTrack.appendChild(header);
    }

    const btnAddTrack = document.createElement("button");
    btnAddTrack.type = "button";
    btnAddTrack.className = "btn-add-measure-track";
    btnAddTrack.innerHTML = "+ Compasso";
    btnAddTrack.addEventListener("click", () => addMeasureToEnd());
    measuresTrack.appendChild(btnAddTrack);

    // Injeção da Barra de Loop
    const loopBar = document.createElement("div");
    loopBar.id = "loop-bar";
    loopBar.className = `loop-bar-container ${scoreState.loopState.active ? 'active' : ''}`;
    loopBar.innerHTML = `
    <div class="loop-handle left" data-handle="left"></div>
    <div class="loop-handle right" data-handle="right"></div>
  `;
    measuresTrack.appendChild(loopBar);
    updateLoopBarVisuals();

    // 2. Sidebar dos Instrumentos
    sidebarList.querySelectorAll(".instrument-card").forEach(el => el.remove());
    const addInstWrapper = sidebarList.querySelector("div");

    scoreState.instruments.forEach((inst, index) => {
        while (inst.pattern.length < scoreState.measuresCount) {
            inst.pattern.push(createEmptyMeasure());
        }

        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.dataset.instIndex = index;

        card.innerHTML = `
      <div class="inst-header-row">
        <span></span>
        <button type="button" class="btn-inst-menu" data-inst-id="${inst.id}" title="Opções do Instrumento">
          <img src="assets/icons/more-vertical.svg" alt="Opções">
        </button>
      </div>

      <img src="${inst.iconSvg}" class="inst-icon-img" alt="${inst.name}">
      <span class="inst-name">${inst.name}</span>

      <div class="inst-volume-row">
        <button type="button" class="btn-mute" data-inst-id="${inst.id}" title="Mute / Desmutar (Duplo clique para digitar %)">
          <img src="${getVolumeIcon(inst.volume)}" alt="Volume">
        </button>
        <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}" data-inst-id="${inst.id}">
        
        <div class="volume-popover">
          <input type="number" class="volume-number-input" min="0" max="100" value="${inst.volume}">
          <span>%</span>
        </div>
      </div>
    `;

        if (addInstWrapper) {
            sidebarList.insertBefore(card, addInstWrapper);
        } else {
            sidebarList.appendChild(card);
        }
    });

    // 3. Linhas da Grade com Destaque
    scoreGrid.querySelectorAll(".score-row").forEach(el => el.remove());

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = `score-row ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}`;
        row.dataset.instrumentId = inst.id;

        for (let m = 0; m < scoreState.measuresCount; m++) {
            const measureContainer = document.createElement("div");
            measureContainer.className = "measure-container";

            const measurePattern = inst.pattern[m] || createEmptyMeasure();

            for (let b = 0; b < scoreState.beatsPerMeasure; b++) {
                const beatGroup = document.createElement("div");
                beatGroup.className = "beat-group";
                beatGroup.innerHTML = createBeamsSVG();

                const slotsBar = document.createElement("div");
                slotsBar.className = "slots-bar";

                for (let s = 0; s < scoreState.subdivisions; s++) {
                    const stepIndex = (b * scoreState.subdivisions) + s;
                    const stroke = measurePattern[stepIndex] || null;
                    const visual = getStrokeVisual(stroke);

                    const slot = document.createElement("div");
                    slot.className = `note-slot ${visual.className}`;
                    slot.innerHTML = visual.content;
                    slot.dataset.instIndex = instIndex;
                    slot.dataset.measure = m;
                    slot.dataset.step = stepIndex;

                    slotsBar.appendChild(slot);
                }

                beatGroup.appendChild(slotsBar);
                measureContainer.appendChild(beatGroup);
            }

            row.appendChild(measureContainer);
        }

        scoreGrid.appendChild(row);
    });

    updateToolbarPalettes();

    if (window.audioEngine && audioEngine.isInitialized) {
        audioEngine.updateTransportSettings();
    }
}

// ==========================================
// 4. ATUALIZAÇÃO CONTEXTUAL DA TOOLBAR
// ==========================================

function updateToolbarPalettes() {
    const currentInst = scoreState.instruments.find(i => i.id === scoreState.activeTool.instrumentId) || scoreState.instruments[0];
    if (!currentInst) return;

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
            btn.innerHTML = def.iconHTML;
            btn.dataset.strokeKey = strokeKey;

            btn.addEventListener("click", () => {
                paletteContainer.querySelectorAll(".tool-stroke").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                scoreState.activeTool.strokeType = strokeKey;
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

function selectActiveInstrument(instId) {
    scoreState.activeTool.instrumentId = instId;

    document.querySelectorAll(".instrument-card").forEach(card => {
        card.classList.toggle("active", card.dataset.instrumentId === instId);
    });

    document.querySelectorAll(".score-row").forEach(row => {
        row.classList.toggle("active", row.dataset.instrumentId === instId);
    });

    updateToolbarPalettes();
}

// ==========================================
// 5. EVENTOS E INTERATIVIDADE
// ==========================================

function setupGridEvents() {
    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    scoreGrid.addEventListener("click", (e) => {
        const slot = e.target.closest(".note-slot");
        if (!slot) return;

        const instIndex = parseInt(slot.dataset.instIndex, 10);
        const measure = parseInt(slot.dataset.measure, 10);
        const step = parseInt(slot.dataset.step, 10);

        const instrument = scoreState.instruments[instIndex];
        if (!instrument || !instrument.pattern[measure]) return;

        if (scoreState.activeTool.instrumentId !== instrument.id) {
            selectActiveInstrument(instrument.id);
        }

        const currentStroke = instrument.pattern[measure][step];
        const targetStroke = scoreState.activeTool.strokeType;
        const nextStroke = (currentStroke === targetStroke) ? null : targetStroke;

        if (currentStroke !== nextStroke) {
            historyManager.pushState();

            instrument.pattern[measure][step] = nextStroke;

            const visual = getStrokeVisual(nextStroke);
            slot.className = `note-slot ${visual.className}`;
            slot.innerHTML = visual.content;
        }
    });
}

function setupToolbarEvents() {
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

function setupMeasureMenuEvents() {
    const dropdown = document.getElementById("measure-dropdown");
    const measuresTrack = document.getElementById("measures-track");
    if (!dropdown || !measuresTrack) return;

    measuresTrack.addEventListener("click", (e) => {
        const btn = e.target.closest(".measure-menu-btn");
        if (!btn) return;

        e.stopPropagation();
        activeMeasureMenuIndex = parseInt(btn.dataset.measureIndex, 10);

        const rect = btn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        dropdown.style.left = `${rect.left + window.scrollX - 160}px`;
        dropdown.classList.add("visible");
    });

    dropdown.addEventListener("click", (e) => {
        const item = e.target.closest(".dropdown-item");
        if (!item || activeMeasureMenuIndex === null) return;

        const action = item.dataset.action;
        handleMeasureAction(action, activeMeasureMenuIndex);
        dropdown.classList.remove("visible");
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("visible");
    });
}

let activeMeasureMenuIndex = null;

function handleMeasureAction(action, index) {
    historyManager.pushState();

    switch (action) {
        case "duplicate":
            scoreState.instruments.forEach(inst => {
                const cloned = JSON.parse(JSON.stringify(inst.pattern[index]));
                inst.pattern.splice(index + 1, 0, cloned);
            });
            scoreState.measuresCount++;
            break;

        case "add-before":
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index, 0, createEmptyMeasure());
            });
            scoreState.measuresCount++;
            break;

        case "add-after":
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index + 1, 0, createEmptyMeasure());
            });
            scoreState.measuresCount++;
            break;

        case "clear":
            scoreState.instruments.forEach(inst => {
                inst.pattern[index] = createEmptyMeasure();
            });
            break;

        case "delete":
            if (scoreState.measuresCount <= 1) {
                alert("O arranjo precisa ter no mínimo 1 compasso.");
                return;
            }
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index, 1);
            });
            scoreState.measuresCount--;
            break;
    }

    renderScore();
}

function addMeasureToEnd() {
    historyManager.pushState();
    scoreState.instruments.forEach(inst => {
        inst.pattern.push(createEmptyMeasure());
    });
    scoreState.measuresCount++;
    renderScore();
}

function setupHeaderEvents() {
    const bpmInput = document.getElementById("bpm-input");
    if (bpmInput) {
        bpmInput.addEventListener("change", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
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
            if (e.key === "Enter") {
                saveTitle();
            } else if (e.key === "Escape") {
                cancelTitleEdit();
            }
        });

        titleInput.addEventListener("blur", saveTitle);
    }
}

function setupTransportEvents() {
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
            audioEngine.stop();
            btnPlay.classList.remove("active");
            if (playIconImg) playIconImg.src = "assets/icons/play.svg";
        }
    });

    btnStop.addEventListener("click", () => {
        audioEngine.stop();
        btnPlay.classList.remove("active");
        if (playIconImg) playIconImg.src = "assets/icons/play.svg";
    });

    if (bpmInput) {
        bpmInput.addEventListener("input", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
                if (Tone.Transport) {
                    Tone.Transport.bpm.value = val;
                }
            }
        });
    }
}

function setupInstrumentControlEvents() {
    const sidebarList = document.getElementById("instruments-sidebar-list");
    const addInstBtn = document.getElementById("btn-open-add-instrument");
    const addInstDropdown = document.getElementById("add-instrument-dropdown");
    const optionsDropdown = document.getElementById("instrument-options-dropdown");

    let activeInstForMenu = null;

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
                    updateInstrumentVolume(instId, inst.previousVolume || 80);
                }
                return;
            }

            const menuBtn = e.target.closest(".btn-inst-menu");
            if (menuBtn) {
                e.stopPropagation();
                activeInstForMenu = menuBtn.dataset.instId;
                const rect = menuBtn.getBoundingClientRect();
                optionsDropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
                optionsDropdown.style.left = `${rect.left + window.scrollX}px`;
                optionsDropdown.classList.add("visible");
                return;
            }
        });

        sidebarList.addEventListener("dblclick", (e) => {
            const volRow = e.target.closest(".inst-volume-row");
            if (!volRow) return;

            e.stopPropagation();
            const popover = volRow.querySelector(".volume-popover");
            const numInput = volRow.querySelector(".volume-number-input");
            const slider = volRow.querySelector(".vol-slider");
            const instId = slider.dataset.instId;

            document.querySelectorAll(".volume-popover").forEach(p => p.classList.remove("visible"));
            popover.classList.add("visible");
            numInput.focus();
            numInput.select();

            function applyExact() {
                let val = parseInt(numInput.value, 10);
                if (isNaN(val)) val = 0;
                val = Math.max(0, Math.min(100, val));
                updateInstrumentVolume(instId, val);
                popover.classList.remove("visible");
            }

            numInput.onkeydown = (evt) => {
                if (evt.key === "Enter") applyExact();
                if (evt.key === "Escape") popover.classList.remove("visible");
            };
            numInput.onblur = applyExact;
        });
    }

    if (optionsDropdown) {
        optionsDropdown.addEventListener("click", (e) => {
            const item = e.target.closest(".dropdown-item");
            if (!item || !activeInstForMenu) return;

            const action = item.dataset.action;
            const instIndex = scoreState.instruments.findIndex(i => i.id === activeInstForMenu);
            if (instIndex === -1) return;

            historyManager.pushState();

            if (action === "delete-inst") {
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
                    id: `${original.id}_copy_${Date.now()}`,
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

function updateInstrumentVolume(instId, volume) {
    const inst = scoreState.instruments.find(i => i.id === instId);
    if (!inst) return;

    inst.volume = volume;

    const card = document.querySelector(`.instrument-card[data-instrument-id="${instId}"]`);
    if (card) {
        const slider = card.querySelector(".vol-slider");
        const muteImg = card.querySelector(".btn-mute img");
        const numInput = card.querySelector(".volume-number-input");

        if (slider) slider.value = volume;
        if (numInput) numInput.value = volume;
        if (muteImg) muteImg.src = getVolumeIcon(volume);
    }

    if (window.audioEngine) {
        audioEngine.setInstrumentVolume(instId, volume);
    }
}

function addNewInstrument(typeKey) {
    const preset = INSTRUMENT_PRESETS[typeKey];
    if (!preset) return;

    historyManager.pushState();

    const uniqueId = `${typeKey}_${Date.now()}`;
    const newInst = {
        id: uniqueId,
        name: preset.name,
        iconSvg: preset.iconSvg,
        volume: 80,
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

// ==========================================
// 6. PLAYHEAD E HISTÓRICO
// ==========================================

let playheadAnimFrameId = null;

function animatePlayhead() {
  if (!audioEngine.isPlaying) return;

  const playhead = document.getElementById("playhead");
  if (playhead) {
    // 1 semínima = Tone.Transport.PPQ (default 192). 4 semínimas = 768 ticks por compasso.
    const ticksPerMeasure = scoreState.beatsPerMeasure * Tone.Transport.PPQ;
    const measureWidth = 448;
    
    // Converte os ticks nativos e contínuos para pixels
    const currentX = (Tone.Transport.ticks / ticksPerMeasure) * measureWidth;
    playhead.style.transform = `translateX(${currentX}px)`;
  }

  playheadAnimFrameId = requestAnimationFrame(animatePlayhead);
}

function startPlayheadAnimation() {
    if (playheadAnimFrameId) cancelAnimationFrame(playheadAnimFrameId);
    playheadAnimFrameId = requestAnimationFrame(animatePlayhead);
}

function stopPlayheadAnimation() {
    if (playheadAnimFrameId) {
        cancelAnimationFrame(playheadAnimFrameId);
        playheadAnimFrameId = null;
    }

    const playhead = document.getElementById("playhead");
    const firstSlot = document.querySelector(".score-row .note-slot");

    if (playhead && firstSlot) {
        playhead.style.transform = `translateX(${firstSlot.offsetLeft}px)`;
    }
}

window.startPlayheadAnimation = startPlayheadAnimation;
window.stopPlayheadAnimation = stopPlayheadAnimation;

const historyManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    getSnapshot() {
        return {
            measuresCount: scoreState.measuresCount,
            instruments: scoreState.instruments.map(inst => ({
                id: inst.id,
                pattern: JSON.parse(JSON.stringify(inst.pattern))
            }))
        };
    },

    pushState() {
        this.undoStack.push(this.getSnapshot());
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateButtonsState();
    },

    undo() {
        if (this.undoStack.length === 0) return;

        this.redoStack.push(this.getSnapshot());
        const previousSnapshot = this.undoStack.pop();

        this.applySnapshot(previousSnapshot);
        this.updateButtonsState();
    },

    redo() {
        if (this.redoStack.length === 0) return;

        this.undoStack.push(this.getSnapshot());
        const nextSnapshot = this.redoStack.pop();

        this.applySnapshot(nextSnapshot);
        this.updateButtonsState();
    },

    applySnapshot(snapshot) {
        scoreState.measuresCount = snapshot.measuresCount;
        snapshot.instruments.forEach(savedInst => {
            const targetInst = scoreState.instruments.find(i => i.id === savedInst.id);
            if (targetInst) {
                targetInst.pattern = JSON.parse(JSON.stringify(savedInst.pattern));
            }
        });

        renderScore();
    },

    updateButtonsState() {
        const btnUndo = document.getElementById("btn-undo");
        const btnRedo = document.getElementById("btn-redo");

        if (btnUndo) btnUndo.style.opacity = this.undoStack.length > 0 ? "1" : "0.4";
        if (btnRedo) btnRedo.style.opacity = this.redoStack.length > 0 ? "1" : "0.4";
    }
};

// ==========================================
// 8. CONTROLE DE LOOP E ARRASTE MAGNÉTICO
// ==========================================

function updateLoopBarVisuals() {
    const loopBar = document.getElementById("loop-bar");
    if (!loopBar) return;

    // Garante que os limites não extrapolem o tamanho do arranjo
    if (scoreState.loopState.endMeasure > scoreState.measuresCount) {
        scoreState.loopState.endMeasure = scoreState.measuresCount;
    }
    if (scoreState.loopState.startMeasure >= scoreState.loopState.endMeasure) {
        scoreState.loopState.startMeasure = Math.max(0, scoreState.loopState.endMeasure - 1);
    }

    const measureWidth = 448; // Largura exata de 1 bloco de compasso
    loopBar.style.left = `${scoreState.loopState.startMeasure * measureWidth}px`;
    loopBar.style.width = `${(scoreState.loopState.endMeasure - scoreState.loopState.startMeasure) * measureWidth}px`;

    if (scoreState.loopState.active) {
        loopBar.classList.add("active");
    } else {
        loopBar.classList.remove("active");
    }
}

function setupLoopEvents() {
    const btnLoop = document.getElementById("btn-loop");
    const measuresTrack = document.getElementById("measures-track");
    let draggingHandle = null;

    if (btnLoop) {
        btnLoop.addEventListener("click", () => {
            scoreState.loopState.active = !scoreState.loopState.active;
            btnLoop.classList.toggle("active", scoreState.loopState.active);
            updateLoopBarVisuals();
            if (window.audioEngine) audioEngine.updateTransportSettings();
        });
    }

    // Lógica magnética de drag-and-drop
    document.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("loop-handle")) {
            draggingHandle = e.target.dataset.handle;
            document.body.style.cursor = "ew-resize";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!draggingHandle || !measuresTrack) return;

        const rect = measuresTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const measureWidth = 448;
        let targetMeasure = Math.round(x / measureWidth);
        targetMeasure = Math.max(0, Math.min(scoreState.measuresCount, targetMeasure));

        if (draggingHandle === "left") {
            if (targetMeasure < scoreState.loopState.endMeasure) {
                scoreState.loopState.startMeasure = targetMeasure;
            }
        } else if (draggingHandle === "right") {
            if (targetMeasure > scoreState.loopState.startMeasure) {
                scoreState.loopState.endMeasure = targetMeasure;
            }
        }

        updateLoopBarVisuals();
    });

    document.addEventListener("mouseup", () => {
        if (draggingHandle) {
            draggingHandle = null;
            document.body.style.cursor = "default";
            if (window.audioEngine) audioEngine.updateTransportSettings();
        }
    });
}

// ==========================================
// 9. PERSISTÊNCIA (API FETCH)
// ==========================================

function showToast(message, isError = false) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "80px"; // Respiro para não sobrepor o botão de ajuda
        toast.style.padding = "10px 18px";
        toast.style.borderRadius = "8px";
        toast.style.color = "#fff";
        toast.style.fontSize = "0.9rem";
        toast.style.fontWeight = "600";
        toast.style.zIndex = "9999";
        toast.style.transition = "opacity 0.3s ease";
        document.body.appendChild(toast);
    }
    
    toast.style.backgroundColor = isError ? "#dc2626" : "#16a34a";
    toast.textContent = message;
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2500);
}

async function saveCurrentArrangement() {
    const payload = {
        name: scoreState.title || "Sem Título",
        score_data: scoreState,
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
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!currentArrangementId) {
            currentArrangementId = data.id;
            window.history.replaceState(null, "", `/?id=${data.id}`);
        }

        showToast("Arranjo salvo com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar arranjo:", error);
        showToast("Falha ao salvar o arranjo.", true);
    }
}

function setupPersistenceEvents() {
    // Localiza o botão salvar pelo atributo title
    const saveBtn = document.querySelector('.header-right button[title="Salvar Projeto"]');
    if (saveBtn) {
        saveBtn.addEventListener("click", saveCurrentArrangement);
    }
}

// ==========================================
// 7. INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    renderScore();
    setupToolbarEvents();
    setupGridEvents();
    setupHeaderEvents();
    setupTransportEvents();
    setupMeasureMenuEvents();
    setupInstrumentControlEvents();
    setupLoopEvents();
    setupPersistenceEvents();
});