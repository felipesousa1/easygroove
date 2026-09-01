import { scoreState, createEmptyMeasure, setCopiedMeasureData, copiedMeasureData } from '../state.js';
import { historyManager } from '../history.js';
import { renderScore } from './renderScore.js';

export function setupMeasureMenuEvents() {
    const measuresTrack = document.getElementById("measures-track");
    const dropdown = document.getElementById("measure-dropdown");

    if (!measuresTrack || !dropdown) return;

    let activeMeasureIndex = null;

    measuresTrack.addEventListener("click", (e) => {
        const btn = e.target.closest(".measure-menu-btn");
        if (!btn) return;

        e.stopPropagation();
        activeMeasureIndex = parseInt(btn.dataset.measureIndex, 10);

        const rect = btn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;

        const btnMoveLeft = dropdown.querySelector('[data-action="move-left"]');
        const btnMoveRight = dropdown.querySelector('[data-action="move-right"]');

        if (btnMoveLeft) btnMoveLeft.style.display = (activeMeasureIndex === 0) ? "none" : "flex";
        if (btnMoveRight) btnMoveRight.style.display = (activeMeasureIndex === scoreState.measuresCount - 1) ? "none" : "flex";

        const btnPaste = dropdown.querySelector('[data-action="paste"]');
        if (btnPaste) btnPaste.style.display = copiedMeasureData ? "flex" : "none";

        dropdown.classList.add("visible");
    });

    dropdown.addEventListener("click", (e) => {
        const item = e.target.closest(".dropdown-item");
        if (!item || activeMeasureIndex === null) return;

        const action = item.dataset.action;
        const m = activeMeasureIndex;

        historyManager.pushState();

        if (action === "copy") {
            setCopiedMeasureData(scoreState.instruments.map(inst => {
                return {
                    instrumentId: inst.id,
                    pattern: JSON.parse(JSON.stringify(inst.pattern[m] || []))
                };
            }));
        } else if (action === "paste") {
            if (copiedMeasureData) {
                copiedMeasureData.forEach(copiedItem => {
                    const inst = scoreState.instruments.find(i => i.id === copiedItem.instrumentId);
                    if (inst) {
                        inst.pattern[m] = JSON.parse(JSON.stringify(copiedItem.pattern));
                    }
                });
            }
        } else if (action === "move-left") {
            if (m > 0) {
                scoreState.instruments.forEach(inst => {
                    const temp = inst.pattern[m];
                    inst.pattern[m] = inst.pattern[m - 1];
                    inst.pattern[m - 1] = temp;
                });
            }
        } else if (action === "move-right") {
            if (m < scoreState.measuresCount - 1) {
                scoreState.instruments.forEach(inst => {
                    const temp = inst.pattern[m];
                    inst.pattern[m] = inst.pattern[m + 1];
                    inst.pattern[m + 1] = temp;
                });
            }
        } else if (action === "duplicate") {
            handleMeasureAction("duplicate", m);
        } else if (action === "add-before") {
            handleMeasureAction("add-before", m);
        } else if (action === "add-after") {
            handleMeasureAction("add-after", m);
        } else if (action === "clear") {
            handleMeasureAction("clear", m);
        } else if (action === "delete") {
            handleMeasureAction("delete", m);
        }

        dropdown.classList.remove("visible");
        renderScore();
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("visible");
    });
}

export function handleMeasureAction(action, index) {
    historyManager.pushState();

    switch (action) {
        case "duplicate":
            scoreState.instruments.forEach(inst => {
                const cloned = JSON.parse(JSON.stringify(inst.pattern[index]));
                inst.pattern.splice(index + 1, 0, cloned);
            });
            scoreState.measuresCount++;

            if (index < scoreState.loopState.startMeasure) {
                scoreState.loopState.startMeasure++;
                scoreState.loopState.endMeasure++;
            } else if (index < scoreState.loopState.endMeasure) {
                scoreState.loopState.endMeasure++;
            }
            break;

        case "add-before":
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index, 0, createEmptyMeasure());
            });
            scoreState.measuresCount++;

            if (index <= scoreState.loopState.startMeasure) {
                scoreState.loopState.startMeasure++;
                scoreState.loopState.endMeasure++;
            } else if (index < scoreState.loopState.endMeasure) {
                scoreState.loopState.endMeasure++;
            }
            break;

        case "add-after":
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index + 1, 0, createEmptyMeasure());
            });
            scoreState.measuresCount++;

            if (index < scoreState.loopState.startMeasure) {
                scoreState.loopState.startMeasure++;
                scoreState.loopState.endMeasure++;
            } else if (index < scoreState.loopState.endMeasure) {
                scoreState.loopState.endMeasure++;
            }
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

            if (index < scoreState.loopState.startMeasure) {
                scoreState.loopState.startMeasure--;
                scoreState.loopState.endMeasure--;
            } else if (index >= scoreState.loopState.startMeasure && index < scoreState.loopState.endMeasure) {
                scoreState.loopState.endMeasure--;
                if (scoreState.loopState.startMeasure >= scoreState.loopState.endMeasure) {
                    scoreState.loopState.startMeasure = Math.max(0, scoreState.loopState.endMeasure - 1);
                }
            }

            if (scoreState.loopState.endMeasure > scoreState.measuresCount) {
                scoreState.loopState.endMeasure = scoreState.measuresCount;
            }
            if (scoreState.loopState.startMeasure >= scoreState.loopState.endMeasure) {
                scoreState.loopState.startMeasure = Math.max(0, scoreState.loopState.endMeasure - 1);
            }
            break;
    }

    renderScore();

    if (window.audioEngine && audioEngine.isInitialized) {
        audioEngine.updateTransportSettings();
    }
}