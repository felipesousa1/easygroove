import { STROKE_DEFINITIONS } from '../constants.js';
import { scoreState } from '../state.js';
import { historyManager } from '../history.js';

export function createBeamsSVG(subdivisionsCount = 4) {
    // Força a conversão para número para garantir as linhas corretas
    const count = Number(subdivisionsCount);
    
    let linesCount = 2; // Padrão: semicolcheia/sextina
    if (count === 2 || count === 3) linesCount = 1; // Colcheia/Tercina
    else if (count === 8) linesCount = 3; // Fusa

    let linesHTML = "";
    const yStart = 4;
    const lineSpacing = 6;

    const stemsX = [];
    
    // Distribui as hastes proporcionalmente em porcentagem (0 a 100)
    for (let s = 0; s < count; s++) {
        const xPercentage = ((s + 0.5) / count) * 100;
        stemsX.push(xPercentage);
        linesHTML += `<line x1="${xPercentage}" y1="${yStart}" x2="${xPercentage}" y2="28" stroke="currentColor" stroke-width="1.2"/>`;
    }

    // A trave horizontal vai exatamente do centro da primeira haste até a última
    const xMin = stemsX[0];
    const xMax = stemsX[count - 1];

    for (let i = 0; i < linesCount; i++) {
        const y = yStart + (i * lineSpacing);
        linesHTML += `<line x1="${xMin}" y1="${y}" x2="${xMax}" y2="${y}" stroke="currentColor" stroke-width="2.5"/>`;
    }

    // viewBox estático 0 a 100 mapeia diretamente para a porcentagem
    return `
      <svg class="beat-beams clickable-beam" viewBox="0 0 100 28" preserveAspectRatio="none" style="width: 100%; height: 28px; display: block; cursor: pointer;">
        ${linesHTML}
      </svg>
    `;
}

export function getStrokeVisual(stroke) {
    if (!stroke || !STROKE_DEFINITIONS[stroke]) {
        return { className: "empty", content: "" };
    }
    const def = STROKE_DEFINITIONS[stroke];
    return { className: def.className, content: def.renderHTML };
}

// ==========================================
// LÓGICA DO POPOVER DE SUBDIVISÃO (NÍVEL 3)
// ==========================================

let activePopover = null;

export function setupSubdivisionEvents() {
    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    scoreGrid.addEventListener("click", (e) => {
        const beam = e.target.closest(".clickable-beam");
        if (!beam) return;

        e.stopPropagation();
        closeSubdivisionPopover();

        const beatGroup = beam.closest(".beat-group");
        if (!beatGroup) return;

        const instId = beatGroup.dataset.instId;
        const measureIndex = parseInt(beatGroup.dataset.measureIndex, 10);
        const beatIndex = parseInt(beatGroup.dataset.beatIndex, 10);

        const rect = beam.getBoundingClientRect();
        
        activePopover = document.createElement("div");
        activePopover.className = "subdivision-popover";
        activePopover.style.top = `${rect.top - 48}px`;
        activePopover.style.left = `${rect.left + (rect.width / 2) - 80}px`;

        const options = [2, 3, 4, 6, 8];
        options.forEach(num => {
            const btn = document.createElement("button");
            btn.textContent = num;
            btn.type = "button";
            btn.addEventListener("click", () => {
                applySubdivision(instId, measureIndex, beatIndex, num);
                closeSubdivisionPopover();
            });
            activePopover.appendChild(btn);
        });

        document.body.appendChild(activePopover);
    });

    document.addEventListener("click", (e) => {
        if (activePopover && !e.target.closest(".subdivision-popover")) {
            closeSubdivisionPopover();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && activePopover) {
            closeSubdivisionPopover();
        }
    });
}

function closeSubdivisionPopover() {
    if (activePopover) {
        activePopover.remove();
        activePopover = null;
    }
}

function applySubdivision(instId, measureIndex, beatIndex, newSubdivision) {
    const inst = scoreState.instruments.find(i => i.id === instId);
    if (!inst || !inst.pattern[measureIndex] || !inst.pattern[measureIndex][beatIndex]) return;

    const currentBeat = inst.pattern[measureIndex][beatIndex];
    if (currentBeat.subdivisions === newSubdivision) return; 

    historyManager.pushState();

    // Atualiza subdivisão e apaga o conteúdo do tempo preenchendo com nulos
    currentBeat.subdivisions = newSubdivision;
    currentBeat.notes = new Array(newSubdivision).fill(null);

    // Usa um import dinâmico ou dispara um evento para evitar dependência circular
    import('./renderScore.js').then(module => {
        module.renderScore();
    });
}