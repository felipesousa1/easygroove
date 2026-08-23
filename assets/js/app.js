// ==========================================
// 1. MODELAGEM DO ESTADO (scoreState)
// ==========================================

const scoreState = {
    title: "Arranjo",
    bpm: 120,
    measuresCount: 3,
    beatsPerMeasure: 2, // 2 tempos por compasso (2/4 padrão de samba)
    subdivisions: 4,    // 4 semicolcheias por tempo

    // Ferramenta ativa selecionada na Toolbar
    activeTool: {
        instrumentId: "caixa",
        strokeType: "strong" // 'strong', 'ghost', 'accent', 'chevron-accent', 'chevron-back', etc.
    },

    // Definição dos Instrumentos e suas articulações possíveis
    instruments: [
        {
            id: "surdo1",
            name: "Surdo 1ª",
            icon: "🪘",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            // Cada array representa os passos de 1 compasso (2 tempos x 4 = 8 semicolcheias por compasso)
            // null = pausa
            pattern: [
                ["strong", null, null, null, "accent", null, null, null], // Compasso 1
                ["strong", null, null, null, "accent", null, null, null], // Compasso 2
                ["strong", null, null, null, "accent", null, null, null]  // Compasso 3
            ]
        },
        {
            id: "caixa",
            name: "Caixa",
            icon: "🥁",
            volume: 80,
            availableStrokes: ["strong", "ghost", "accent"],
            pattern: [
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"],
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"],
                ["strong", "ghost", "ghost", "ghost", "accent", "ghost", "ghost", "ghost"]
            ]
        },
        {
            id: "chocalho",
            name: "Chocalho",
            icon: "🪇",
            volume: 80,
            availableStrokes: ["chevron-accent", "chevron-back"],
            pattern: [
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"],
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"],
                ["chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back", "chevron-accent", "chevron-back"]
            ]
        },
        {
            id: "tamborim",
            name: "Tamborim",
            icon: "🥢",
            volume: 80,
            availableStrokes: ["strong", "accent"],
            pattern: [
                ["strong", null, null, "strong", null, "accent", null, "strong"],
                ["null", "strong", null, "strong", null, null, "accent", null],
                ["strong", null, null, "strong", null, "accent", null, "strong"]
            ]
        }
    ]
};

// ==========================================
// 2. FUNÇÕES GERADORAS DE TEMPLATE HTML/SVG
// ==========================================

// SVG das traves métricas por tempo (4 semicolcheias)
function createBeamsSVG() {
    return `
    <svg class="beat-beams" viewBox="0 0 100 40">
      <line x1="12" y1="0" x2="88" y2="0" stroke="black" stroke-width="4"/>
      <line x1="12" y1="8" x2="88" y2="8" stroke="black" stroke-width="4"/>
      <line x1="12" y1="0" x2="12" y2="40" stroke="black" stroke-width="2.5"/>
      <line x1="37" y1="0" x2="37" y2="40" stroke="black" stroke-width="2.5"/>
      <line x1="63" y1="0" x2="63" y2="40" stroke="black" stroke-width="2.5"/>
      <line x1="88" y1="0" x2="88" y2="40" stroke="black" stroke-width="2.5"/>
    </svg>
  `;
}

// Classe CSS e símbolo visual para cada tipo de toque
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
    const measuresTagsContainer = document.getElementById("measures-tags");
    const sidebarContainer = document.getElementById("instruments-sidebar");
    const scoreGrid = document.getElementById("score-grid");

    // Atualiza título e BPM
    document.querySelector(".arrangement-title").textContent = scoreState.title;
    document.getElementById("bpm-input").value = scoreState.bpm;

    // 1. Renderiza as tags de compasso no topo
    measuresTagsContainer.innerHTML = "";
    for (let m = 0; m < scoreState.measuresCount; m++) {
        const tag = document.createElement("div");
        tag.className = "measure-tag";
        tag.innerHTML = `Compasso ${m + 1} <span class="tag-dots">⋮</span>`;
        measuresTagsContainer.appendChild(tag);
    }

    // 2. Renderiza os cards dos instrumentos na sidebar
    // Mantém o botão de adicionar no final
    const btnAddInst = sidebarContainer.querySelector(".btn-add-instrument");
    sidebarContainer.querySelectorAll(".instrument-card").forEach(el => el.remove());

    scoreState.instruments.forEach((inst, index) => {
        const card = document.createElement("div");
        card.className = `instrument-card ${inst.id === scoreState.activeTool.instrumentId ? 'active' : ''}`;
        card.dataset.instrumentId = inst.id;
        card.innerHTML = `
      <div class="inst-icon">${inst.icon}</div>
      <div class="inst-name">${inst.name}</div>
      <div class="inst-vol">
        <span>🔈</span>
        <input type="range" class="vol-slider" min="0" max="100" value="${inst.volume}">
      </div>
    `;
        sidebarContainer.insertBefore(card, btnAddInst);
    });

    // 3. Renderiza as pautas e as notas
    // Remove linhas anteriores sem apagar o playhead
    scoreGrid.querySelectorAll(".score-row").forEach(el => el.remove());

    scoreState.instruments.forEach((inst, instIndex) => {
        const row = document.createElement("div");
        row.className = "score-row";
        row.dataset.instrumentId = inst.id;

        // Para cada compasso
        for (let m = 0; m < scoreState.measuresCount; m++) {
            const measureContainer = document.createElement("div");
            measureContainer.className = "measure-container";

            const measurePattern = inst.pattern[m] || [];

            // Para cada tempo do compasso (ex: 2 tempos)
            for (let b = 0; b < scoreState.beatsPerMeasure; b++) {
                const beatGroup = document.createElement("div");
                beatGroup.className = "beat-group";
                beatGroup.innerHTML = createBeamsSVG();

                const slotsBar = document.createElement("div");
                slotsBar.className = "slots-bar";

                // Para cada semicolcheia do tempo (4 subdivisões)
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
// 4. SELEÇÃO DA TOOLBAR (Ferramenta Ativa)
// ==========================================

function setupToolbarEvents() {
    const strokeButtons = document.querySelectorAll(".tool-stroke");
    const btnUndo = document.getElementById("btn-undo");
    const btnRedo = document.getElementById("btn-redo");

    // Mapeamento dos botões para os tipos de toque
    const strokeMap = ["strong", "ghost", "accent"];

    strokeButtons.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            strokeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            scoreState.activeTool.strokeType = strokeMap[index] || "strong";
        });
    });

    // Botões de Desfazer e Refazer
    if (btnUndo) btnUndo.addEventListener("click", () => historyManager.undo());
    if (btnRedo) btnRedo.addEventListener("click", () => historyManager.redo());

    // Atalhos de teclado (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
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

    // Troca rápida de instrumento ativo ao clicar no card da sidebar
    document.getElementById("instruments-sidebar").addEventListener("click", (e) => {
        const card = e.target.closest(".instrument-card");
        if (!card) return;

        document.querySelectorAll(".instrument-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        scoreState.activeTool.instrumentId = card.dataset.instrumentId;
    });

    historyManager.updateButtonsState();
}

// ==========================================
// 5. INTERATIVIDADE DAS CÉLULAS (Event Delegation)
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
        if (!instrument) return;

        const currentStroke = instrument.pattern[measure][step];
        const targetStroke = scoreState.activeTool.strokeType;

        // Regra: se clicar no mesmo toque, remove (pausa); senão, aplica o novo toque
        const nextStroke = (currentStroke === targetStroke) ? null : targetStroke;

        if (currentStroke !== nextStroke) {
            historyManager.pushState();

            // 1. Atualiza o Estado
            instrument.pattern[measure][step] = nextStroke;

            // 2. Atualiza a DOM do slot
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
        }
    });

    btnStop.addEventListener("click", () => {
        audioEngine.stop();
        btnPlay.classList.remove("active");
    });

    // Atualiza o BPM no Tone.js em tempo real
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
// 8. SINCRONIA DO PLAYHEAD VISUAL
// ==========================================

function updatePlayheadPosition(globalStep) {
    const playhead = document.getElementById("playhead");
    if (!playhead) return;

    const totalStepsPerMeasure = scoreState.beatsPerMeasure * scoreState.subdivisions;
    const measure = Math.floor(globalStep / totalStepsPerMeasure);
    const stepInMeasure = globalStep % totalStepsPerMeasure;

    // Busca o slot do primeiro instrumento no passo atual como âncora de coordenadas
    const targetSlot = document.querySelector(`.note-slot[data-inst-index="0"][data-measure="${measure}"][data-step="${stepInMeasure}"]`);
    const scoreGrid = document.getElementById("score-grid");

    if (targetSlot && scoreGrid) {
        const gridRect = scoreGrid.getBoundingClientRect();
        const slotRect = targetSlot.getBoundingClientRect();

        // Centraliza o playhead no meio do slot horizontalmente
        const offsetLeft = (slotRect.left - gridRect.left) + (slotRect.width / 2) - (playhead.offsetWidth / 2);
        playhead.style.transform = `translateX(${offsetLeft}px)`;
    }
}

// Expõe para o audio.js
window.updatePlayheadPosition = updatePlayheadPosition;


// ==========================================
// 9. GERENCIAMENTO DE HISTÓRICO (UNDO / REDO)
// ==========================================

const historyManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    // Captura apenas a matriz de notas para manter o snapshot leve
    getSnapshot() {
        return scoreState.instruments.map(inst => ({
            id: inst.id,
            pattern: JSON.parse(JSON.stringify(inst.pattern))
        }));
    },

    // Salva o estado atual na pilha antes de uma modificação
    pushState() {
        this.undoStack.push(this.getSnapshot());
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        // Qualquer nova ação limpa o refazer
        this.redoStack = [];
        this.updateButtonsState();
    },

    undo() {
        if (this.undoStack.length === 0) return;

        // Guarda o estado atual no redo antes de voltar
        this.redoStack.push(this.getSnapshot());
        const previousSnapshot = this.undoStack.pop();

        this.applySnapshot(previousSnapshot);
        this.updateButtonsState();
    },

    redo() {
        if (this.redoStack.length === 0) return;

        // Guarda o estado atual no undo antes de avançar
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

        // Re-renderiza a grade com os novos padrões restaurados
        renderScore();
    },

    updateButtonsState() {
        const btnUndo = document.getElementById("btn-undo");
        const btnRedo = document.getElementById("btn-redo");

        if (btnUndo) btnUndo.style.opacity = this.undoStack.length > 0 ? "1" : "0.4";
        if (btnRedo) btnRedo.style.opacity = this.redoStack.length > 0 ? "1" : "0.4";
    }
};

// Atualizar o listener de inicialização
document.addEventListener("DOMContentLoaded", () => {
    renderScore();
    setupToolbarEvents();
    setupGridEvents();
    setupHeaderEvents();
    setupTransportEvents();
});