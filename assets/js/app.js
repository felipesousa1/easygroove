// ==========================================
// 1. MODELAGEM DO ESTADO (scoreState 4x4)
// ==========================================

const scoreState = {
    title: "Bossa Nova Principal",
    bpm: 120,
    measuresCount: 3,
    beatsPerMeasure: 4, // 4 tempos por compasso (4/4)
    subdivisions: 4,    // 4 semicolcheias por tempo = 16 passos por compasso

    activeTool: {
        instrumentId: "caixa",
        strokeType: "strong"
    },

    instruments: [
        {
            id: "surdo1",
            name: "Surdo 1ª",
            icon: "🥁",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            pattern: [
                // 16 semicolcheias por compasso (4 traves métricas)
                ["strong", null, null, null, null, null, null, null, "accent", null, null, null, null, null, null, null],
                ["strong", null, null, null, null, null, null, null, "accent", null, null, null, null, null, null, null],
                ["strong", null, null, null, null, null, null, null, "accent", null, null, null, null, null, null, null]
            ]
        },
        {
            id: "caixa",
            name: "Caixa",
            icon: "🪘",
            volume: 80,
            availableStrokes: ["strong", "ghost", "accent"],
            pattern: [
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost", "strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"],
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost", "strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"],
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost", "strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"]
            ]
        },
        {
            id: "chocalho",
            name: "Chocalho",
            icon: "🥢",
            volume: 80,
            availableStrokes: ["chevron-accent", "chevron-back"],
            pattern: [
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"],
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"],
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"]
            ]
        },
        {
            id: "tamborim",
            name: "Tamborim",
            icon: "🪗",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            pattern: [
                ["strong", null, null, "strong", null, "accent", null, "strong", null, null, "strong", null, "accent", null, "strong", null],
                [null, "strong", null, "strong", null, null, "accent", null, "strong", null, "strong", null, null, "accent", null, "strong"],
                ["strong", null, null, "strong", null, "accent", null, "strong", null, null, "strong", null, "accent", null, "strong", null]
            ]
        }
    ]
};

// ==========================================
// 2. FUNÇÕES GERADORAS DE TEMPLATE HTML/SVG
// ==========================================

// SVG das 4 semicolcheias por tempo métrico
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
    switch (stroke) {
        case "strong":
            return { className: "filled", content: "" };
        case "ghost":
            return { className: "small-dot", content: "" };
        case "accent":
            return { className: "ring-accent", content: "" };
        case "chevron-accent":
            return { className: "chevron-accent", content: "&gt;" };
        case "chevron-back":
            return { className: "chevron-back", content: "&lt;" };
        default:
            return { className: "empty", content: "" };
    }
}

// ==========================================
// 3. RENDERIZAÇÃO DINÂMICA
// ==========================================

function renderScore() {
    const measuresTrack = document.getElementById("measures-track");
    const sidebarList = document.getElementById("instruments-sidebar-list");
    const scoreGrid = document.getElementById("score-grid");

    if (!measuresTrack || !sidebarList || !scoreGrid) return;

    // Atualiza título e BPM
    const titleEl = document.querySelector(".arrangement-title");
    const bpmInput = document.getElementById("bpm-input");
    if (titleEl) titleEl.textContent = scoreState.title;
    if (bpmInput) bpmInput.value = scoreState.bpm;

    // 1. Renderiza cabeçalhos de cada compasso
    measuresTrack.innerHTML = "";
    for (let m = 0; m < scoreState.measuresCount; m++) {
        const header = document.createElement("div");
        header.className = "measure-header";
        header.innerHTML = `
      <span>Compasso ${m + 1}</span>
      <button type="button" class="measure-menu-btn" title="Opções do Compasso">⋮</button>
    `;
        measuresTrack.appendChild(header);
    }

    // 2. Renderiza os cards na sidebar
    sidebarList.querySelectorAll(".instrument-card").forEach(el => el.remove());
    const btnAdd = sidebarList.querySelector(".btn-add-instrument");

    scoreState.instruments.forEach((inst, index) => {
        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.dataset.instIndex = index;
        card.innerHTML = `
      <span class="inst-icon">${inst.icon}</span>
      <span class="inst-name">${inst.name}</span>
      <div class="inst-controls">
        <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}">
      </div>
    `;

        if (btnAdd) {
            sidebarList.insertBefore(card, btnAdd);
        } else {
            sidebarList.appendChild(card);
        }
    });

    // 3. Renderiza as linhas dos instrumentos
    scoreGrid.querySelectorAll(".score-row").forEach(el => el.remove());

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = "score-row";
        row.dataset.instrumentId = inst.id;

        for (let m = 0; m < scoreState.measuresCount; m++) {
            const measureContainer = document.createElement("div");
            measureContainer.className = "measure-container";

            const measurePattern = inst.pattern[m] || [];

            // 4 tempos por compasso
            for (let b = 0; b < scoreState.beatsPerMeasure; b++) {
                const beatGroup = document.createElement("div");
                beatGroup.className = "beat-group";
                beatGroup.innerHTML = createBeamsSVG();

                const slotsBar = document.createElement("div");
                slotsBar.className = "slots-bar";

                // 4 semicolcheias por tempo
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
}

// ==========================================
// 4. SELEÇÃO DA TOOLBAR & ATALHOS DE HISTÓRICO
// ==========================================

function setupToolbarEvents() {
    const strokeButtons = document.querySelectorAll(".tool-stroke");
    const btnUndo = document.getElementById("btn-undo");
    const btnRedo = document.getElementById("btn-redo");

    const strokeMap = ["strong", "ghost", "accent"];

    strokeButtons.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            strokeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            scoreState.activeTool.strokeType = strokeMap[index] || "strong";
        });
    });

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

    document.getElementById("instruments-sidebar-list").addEventListener("click", (e) => {
        const card = e.target.closest(".instrument-card");
        if (!card) return;

        document.querySelectorAll(".instrument-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        scoreState.activeTool.instrumentId = card.dataset.instrumentId;

        const activeNameEl = document.getElementById("active-tool-name");
        const inst = scoreState.instruments.find(i => i.id === card.dataset.instrumentId);
        if (activeNameEl && inst) activeNameEl.textContent = inst.name;
    });

    historyManager.updateButtonsState();
}

// ==========================================
// 5. INTERATIVIDADE DAS CÉLULAS COM HISTÓRICO
// ==========================================

function setupGridEvents() {
    const scoreGrid = document.getElementById("score-grid");

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

// ==========================================
// 6. EVENTOS DE BPM E TÍTULO
// ==========================================

function setupHeaderEvents() {
    const bpmInput = document.getElementById("bpm-input");
    bpmInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 40 && val <= 260) {
            scoreState.bpm = val;
        } else {
            e.target.value = scoreState.bpm;
        }
    });

    const titleEl = document.querySelector(".arrangement-title");
    titleEl.addEventListener("blur", () => {
        scoreState.title = titleEl.textContent.trim() || "Sem Título";
    });
}

// ==========================================
// 7. CONTROLES DE TRANSPORTE (PLAY / STOP)
// ==========================================

function setupTransportEvents() {
    const btnPlay = document.getElementById("btn-play");
    const btnStop = document.getElementById("btn-stop");
    const bpmInput = document.getElementById("bpm-input");

    btnPlay.addEventListener("click", async () => {
        if (!audioEngine.isPlaying) {
            await audioEngine.start();
            btnPlay.classList.add("active");
            btnPlay.textContent = "⏸";
        } else {
            audioEngine.stop();
            btnPlay.classList.remove("active");
            btnPlay.textContent = "▶";
        }
    });

    btnStop.addEventListener("click", () => {
        audioEngine.stop();
        btnPlay.classList.remove("active");
        btnPlay.textContent = "▶";
    });

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

// ==========================================
// 8. SINCRONIA DO PLAYHEAD VISUAL (60 FPS)
// ==========================================

// ==========================================
// 8. SINCRONIA DO PLAYHEAD VISUAL (60 FPS Interpolarizada)
// ==========================================

// ==========================================
// 8. SINCRONIA DO PLAYHEAD VISUAL (Extensão Completa)
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
            // 1. Largura total de todos os compassos somados
            let totalTrackWidth = 0;
            containers.forEach(c => {
                totalTrackWidth += c.offsetWidth;
            });

            // 2. Ponto de partida: início do primeiro slot
            const startX = firstSlot.offsetLeft;

            // 3. Progresso do loop (0.0 a 1.0) mapeado sobre a largura útil inteira
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

// ==========================================
// 9. GERENCIAMENTO DE HISTÓRICO (UNDO / REDO)
// ==========================================

const historyManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    getSnapshot() {
        return scoreState.instruments.map(inst => ({
            id: inst.id,
            pattern: JSON.parse(JSON.stringify(inst.pattern))
        }));
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
        snapshot.forEach(savedInst => {
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

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    renderScore();
    setupToolbarEvents();
    setupGridEvents();
    setupHeaderEvents();
    setupTransportEvents();
});