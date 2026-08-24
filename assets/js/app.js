// ==========================================
// 1. DICIONÁRIO DE ARTICULAÇÕES E METADADOS
// ==========================================

const STROKE_DEFINITIONS = {
    strong: {
        label: "Toque Forte / Centro",
        icon: "●",
        className: "filled",
        renderHTML: ""
    },
    ghost: {
        label: "Nota Fantasma / Mão",
        icon: "•",
        className: "small-dot",
        renderHTML: ""
    },
    accent: {
        label: "Acento / Rimshot / Borda",
        icon: "⦿",
        className: "ring-accent",
        renderHTML: ""
    },
    "chevron-accent": {
        label: "Chocalho (Frente)",
        icon: ">",
        className: "chevron-accent",
        renderHTML: "&gt;"
    },
    "chevron-back": {
        label: "Chocalho (Trás)",
        icon: "<",
        className: "chevron-back",
        renderHTML: "&lt;"
    }
};

// ==========================================
// 2. MODELAGEM DO ESTADO (scoreState)
// ==========================================

const scoreState = {
    title: "Bossa Nova Principal",
    bpm: 120,
    measuresCount: 3,
    beatsPerMeasure: 4,
    subdivisions: 4,

    activeTool: {
        instrumentId: "surdo1",
        strokeType: "strong"
    },

    instruments: [
        {
            id: "surdo1",
            name: "Surdo 1ª",
            iconSvg: "assets/icons/inst-surdo1.svg",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            pattern: []
        },
        {
            id: "surdo2",
            name: "Surdo 2ª",
            iconSvg: "assets/icons/inst-surdo2.svg",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            pattern: []
        },
        {
            id: "surdo3",
            name: "Surdo 3ª",
            iconSvg: "assets/icons/inst-surdo3.svg",
            volume: 80,
            availableStrokes: ["strong", "ghost", "accent"],
            pattern: []
        },
        {
            id: "caixa",
            name: "Caixa",
            iconSvg: "assets/icons/inst-caixa.svg",
            volume: 80,
            availableStrokes: ["strong", "ghost", "accent"],
            pattern: []
        },
        {
            id: "repique",
            name: "Repique",
            iconSvg: "assets/icons/inst-repique.svg",
            volume: 80,
            availableStrokes: ["strong", "ghost", "accent"],
            pattern: []
        },
        {
            id: "chocalho",
            name: "Chocalho",
            iconSvg: "assets/icons/inst-chocalho.svg",
            volume: 80,
            availableStrokes: ["chevron-accent", "chevron-back"],
            pattern: []
        },
        {
            id: "tamborim",
            name: "Tamborim",
            iconSvg: "assets/icons/inst-tamborim.svg",
            volume: 80,
            availableStrokes: ["strong", "accent"],
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
      <line x1="14" y1="2" x2="98" y2="2" stroke="#111827" stroke-width="3.5"/>
      <line x1="14" y1="9" x2="98" y2="9" stroke="#111827" stroke-width="3.5"/>
      <line x1="14" y1="2" x2="14" y2="32" stroke="#111827" stroke-width="2"/>
      <line x1="42" y1="2" x2="42" y2="32" stroke="#111827" stroke-width="2"/>
      <line x1="70" y1="2" x2="70" y2="32" stroke="#111827" stroke-width="2"/>
      <line x1="98" y1="2" x2="98" y2="32" stroke="#111827" stroke-width="2"/>
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

    // 2. Sidebar dos Instrumentos
    sidebarList.querySelectorAll(".instrument-card").forEach(el => el.remove());
    const btnAddInst = sidebarList.querySelector(".btn-add-instrument");

    scoreState.instruments.forEach((inst, index) => {
        while (inst.pattern.length < scoreState.measuresCount) {
            inst.pattern.push(createEmptyMeasure());
        }

        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.dataset.instIndex = index;
        card.innerHTML = `
      <img src="${inst.iconSvg}" class="inst-icon-img" alt="${inst.name}">
      <span class="inst-name">${inst.name}</span>
      <div class="inst-controls">
        <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}">
      </div>
    `;

        if (btnAddInst) {
            sidebarList.insertBefore(card, btnAddInst);
        } else {
            sidebarList.appendChild(card);
        }
    });

    // 3. Linhas da Grade
    scoreGrid.querySelectorAll(".score-row").forEach(el => el.remove());

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = "score-row";
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
            btn.textContent = def.icon;
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

    updateToolbarPalettes();
}

// ==========================================
// 5. EVENTOS E INTERATIVIDADE
// ==========================================

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

// ==========================================
// 6. PLAYHEAD E HISTÓRICO
// ==========================================

let playheadAnimFrameId = null;

function animatePlayhead() {
    if (!audioEngine.isPlaying) return;

    const playhead = document.getElementById("playhead");
    const firstRow = document.querySelector(".score-row");

    if (playhead && firstRow) {
        const firstSlot = firstRow.querySelector(".note-slot");
        const containers = firstRow.querySelectorAll(".measure-container");

        if (firstSlot && containers.length > 0) {
            let totalTrackWidth = 0;
            containers.forEach(c => {
                totalTrackWidth += c.offsetWidth;
            });

            const startX = firstSlot.offsetLeft;
            const currentX = startX + (Tone.Transport.progress * totalTrackWidth);
            playhead.style.transform = `translateX(${currentX}px)`;
        }
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
// 7. INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    renderScore();
    setupToolbarEvents();
    setupGridEvents();
    setupHeaderEvents();
    setupTransportEvents();
    setupMeasureMenuEvents();
});