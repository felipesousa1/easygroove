import { scoreState } from '../state.js';
import { historyManager } from '../history.js';
import { renderScore } from './renderScore.js';

export function renderRepeats() {
    const measuresTrack = document.getElementById("measures-track");
    if (!measuresTrack) return;

    measuresTrack.querySelectorAll(".repeat-container").forEach(el => el.remove());

    if (!scoreState.repeats || scoreState.repeats.length === 0) return;

    const measureHeaders = measuresTrack.querySelectorAll(".measure-header");
    if (measureHeaders.length === 0) return;

    scoreState.repeats.forEach((repeat) => {
        const startHeader = measureHeaders[repeat.start];
        const endHeader = measureHeaders[repeat.end];

        if (!startHeader || !endHeader) return;

        const hasAdjacentLeft = scoreState.repeats.some(r => r.id !== repeat.id && r.end === repeat.start - 1);
        const hasAdjacentRight = scoreState.repeats.some(r => r.id !== repeat.id && r.start === repeat.end + 1);

        const leftOffset = hasAdjacentLeft ? 5 : 0;
        const rightOffset = hasAdjacentRight ? 5 : 0;

        const left = startHeader.offsetLeft + leftOffset;
        const right = endHeader.offsetLeft + endHeader.offsetWidth - rightOffset;
        const width = right - left;

        const container = document.createElement("div");
        container.className = "repeat-container";
        container.style.left = `${left}px`;
        container.style.width = `${width}px`;
        container.dataset.repeatId = repeat.id;

        container.innerHTML = `
            <div class="repeat-handle left" data-handle="start" title="Arrastar início do ritornelo"></div>
            <div class="repeat-line-top"></div>
            <div class="repeat-start-bar"></div>
            <div class="repeat-loop-arrow"></div>
            <div class="repeat-control-pill" data-repeat-id="${repeat.id}">
                <button type="button" class="repeat-btn btn-repeat-minus" title="Diminuir Repetições">−</button>
                <span class="repeat-times-text">${repeat.times}x</span>
                <button type="button" class="repeat-btn btn-repeat-plus" title="Aumentar Repetições">+</button>
            </div>
            <div class="repeat-handle right" data-handle="end" title="Arrastar fim do ritornelo"></div>
        `;

        measuresTrack.appendChild(container);
    });
}

function syncAudioWithRepeats() {
    if (window.audioEngine) {
        window.audioEngine.updateTransportSettings();
        if (window.audioEngine.isInitialized) {
            window.audioEngine.schedulePlaybackSequence();
        }
    }
}

export function setupRepeatControlEvents() {
    const measuresTrack = document.getElementById("measures-track");
    if (!measuresTrack) return;

    // 1. Ações dos botões de incremento/decremento (- e +)
    measuresTrack.addEventListener("click", (e) => {
        const btnMinus = e.target.closest(".btn-repeat-minus");
        const btnPlus = e.target.closest(".btn-repeat-plus");

        if (!btnMinus && !btnPlus) return;

        e.stopPropagation();
        e.preventDefault();

        const pill = e.target.closest(".repeat-control-pill");
        if (!pill) return;

        const repeatId = pill.dataset.repeatId;
        const repeat = scoreState.repeats.find(r => r.id === repeatId);
        if (!repeat) return;

        historyManager.pushState();

        if (btnMinus) {
            repeat.times -= 1;
            if (repeat.times <= 1) {
                scoreState.repeats = scoreState.repeats.filter(r => r.id !== repeatId);
            }
        } else if (btnPlus) {
            repeat.times += 1;
        }

        renderScore();
        syncAudioWithRepeats();
    });

    // 2. Lógica de Drag and Drop para os handles do Ritornelo
    let activeDrag = null;

    measuresTrack.addEventListener("mousedown", (e) => {
        const handle = e.target.closest(".repeat-handle");
        if (!handle) return;

        e.stopPropagation();
        e.preventDefault();

        const container = handle.closest(".repeat-container");
        const repeatId = container?.dataset.repeatId;
        const repeat = scoreState.repeats.find(r => r.id === repeatId);
        if (!repeat) return;

        historyManager.pushState();

        activeDrag = {
            handleType: handle.dataset.handle, // "start" ou "end"
            repeat: repeat
        };

        document.body.style.cursor = "ew-resize";
    });

    window.addEventListener("mousemove", (e) => {
        if (!activeDrag) return;

        const measureHeaders = Array.from(measuresTrack.querySelectorAll(".measure-header"));
        if (measureHeaders.length === 0) return;

        // Identifica sobre qual compasso o ponteiro do mouse está posicionado
        let hoveredMeasureIndex = -1;
        for (let i = 0; i < measureHeaders.length; i++) {
            const rect = measureHeaders[i].getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right) {
                hoveredMeasureIndex = i;
                break;
            }
        }

        if (hoveredMeasureIndex === -1) return;

        const { handleType, repeat } = activeDrag;

        if (handleType === "start") {
            // Garante que o início não ultrapasse o fim
            if (hoveredMeasureIndex <= repeat.end && repeat.start !== hoveredMeasureIndex) {
                repeat.start = hoveredMeasureIndex;
                renderScore();
            }
        } else if (handleType === "end") {
            // Garante que o fim não seja menor que o início
            if (hoveredMeasureIndex >= repeat.start && repeat.end !== hoveredMeasureIndex) {
                repeat.end = hoveredMeasureIndex;
                renderScore();
            }
        }
    });

    window.addEventListener("mouseup", () => {
        if (activeDrag) {
            activeDrag = null;
            document.body.style.cursor = "";
            syncAudioWithRepeats();
        }
    });
}

export function setupMeasureLoopEvents() {
    const measuresTrack = document.getElementById("measures-track");
    if (!measuresTrack) return;

    measuresTrack.addEventListener("click", (e) => {
        const loopBtn = e.target.closest(".measure-loop-btn");
        if (!loopBtn) return;

        e.stopPropagation();
        const mIndex = parseInt(loopBtn.dataset.measureIndex, 10);
        if (isNaN(mIndex)) return;

        if (!scoreState.repeats) scoreState.repeats = [];

        const existingIndex = scoreState.repeats.findIndex(r => mIndex >= r.start && mIndex <= r.end);

        historyManager.pushState();

        if (existingIndex !== -1) {
            scoreState.repeats.splice(existingIndex, 1);
        } else {
            scoreState.repeats.push({
                id: `rep-${Date.now()}`,
                start: mIndex,
                end: mIndex,
                times: 2
            });
        }

        renderScore();
        syncAudioWithRepeats();
    });
}