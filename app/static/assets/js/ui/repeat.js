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

        const left = startHeader.offsetLeft;
        const right = endHeader.offsetLeft + endHeader.offsetWidth;
        const width = right - left;

        const canShrink = repeat.end > repeat.start;

        const container = document.createElement("div");
        container.className = "repeat-container";
        container.style.left = `${left}px`;
        container.style.width = `${width}px`;

        container.innerHTML = `
            <div class="repeat-line-top"></div>
            <div class="repeat-start-bar"></div>
            <div class="repeat-loop-arrow"></div>
            <div class="repeat-control-pill" data-repeat-id="${repeat.id}">
                ${canShrink ? '<button type="button" class="repeat-btn btn-repeat-shrink" title="Reduzir 1 Compasso">|←</button>' : ''}
                <button type="button" class="repeat-btn btn-repeat-minus" title="Diminuir Repetições">−</button>
                <span class="repeat-times-text">${repeat.times}x</span>
                <button type="button" class="repeat-btn btn-repeat-plus" title="Aumentar Repetições">+</button>
                <button type="button" class="repeat-btn btn-repeat-extend" title="Expandir 1 Compasso">→|</button>
            </div>
        `;

        measuresTrack.appendChild(container);
    });
}

export function setupRepeatControlEvents() {
    const measuresTrack = document.getElementById("measures-track");
    if (!measuresTrack) return;

    measuresTrack.addEventListener("click", (e) => {
        const btnMinus = e.target.closest(".btn-repeat-minus");
        const btnPlus = e.target.closest(".btn-repeat-plus");
        const btnExtend = e.target.closest(".btn-repeat-extend");
        const btnShrink = e.target.closest(".btn-repeat-shrink");

        if (!btnMinus && !btnPlus && !btnExtend && !btnShrink) return;

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
        } else if (btnExtend) {
            if (repeat.end < scoreState.measuresCount - 1) {
                repeat.end += 1;
            }
        } else if (btnShrink) {
            if (repeat.end > repeat.start) {
                repeat.end -= 1;
            }
        }

        renderScore();
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
    });
}