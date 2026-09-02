import { scoreState, createEmptyMeasure, setCopiedMeasureData, copiedMeasureData } from '../state.js';
import { historyManager } from '../history.js';
import { renderScore } from './renderScore.js';
import { TIME_SIGNATURES } from '../constants.js';

// Função utilitária para criar a estrutura do compasso baseada na métrica
export function createEmptyMeasureForSig(timeSigKey) {
    const config = TIME_SIGNATURES[timeSigKey] || TIME_SIGNATURES["4/4"];
    const measureData = [];
    for (let b = 0; b < config.beats; b++) {
        measureData.push({
            subdivisions: config.subdivisions,
            notes: new Array(config.subdivisions).fill(null)
        });
    }
    return measureData;
}

export function setupMeasureMenuEvents() {
    const measuresTrack = document.getElementById("measures-track");
    const dropdown = document.getElementById("measure-dropdown");
    const measureTimeSigSelect = document.getElementById("measure-timesig-select");

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

        if (measureTimeSigSelect) {
            const currentSig = scoreState.measuresConfig?.[activeMeasureIndex]?.timeSignature || scoreState.timeSignature || "4/4";
            measureTimeSigSelect.value = currentSig;
        }

        dropdown.classList.add("visible");
    });

    if (measureTimeSigSelect) {
        measureTimeSigSelect.addEventListener("change", (e) => {
            if (activeMeasureIndex === null) return;
            setColumnTimeSignature(activeMeasureIndex, e.target.value);
            dropdown.classList.remove("visible");
        });
    }

    dropdown.addEventListener("click", (e) => {
        const item = e.target.closest(".dropdown-item");
        if (!item || activeMeasureIndex === null) return;

        const action = item.dataset.action;
        const m = activeMeasureIndex;

        if (action === "copy") {
            setCopiedMeasureData(scoreState.instruments.map(inst => {
                return {
                    instrumentId: inst.id,
                    pattern: JSON.parse(JSON.stringify(inst.pattern[m] || []))
                };
            }));
        } else if (action === "paste") {
            if (copiedMeasureData) {
                historyManager.pushState();
                copiedMeasureData.forEach(copiedItem => {
                    const inst = scoreState.instruments.find(i => i.id === copiedItem.instrumentId);
                    if (inst) {
                        inst.pattern[m] = JSON.parse(JSON.stringify(copiedItem.pattern));
                    }
                });
                renderScore();
            }
        } else if (action === "move-left") {
            if (m > 0) {
                historyManager.pushState();
                scoreState.instruments.forEach(inst => {
                    const temp = inst.pattern[m];
                    inst.pattern[m] = inst.pattern[m - 1];
                    inst.pattern[m - 1] = temp;
                });
                renderScore();
            }
        } else if (action === "move-right") {
            if (m < scoreState.measuresCount - 1) {
                historyManager.pushState();
                scoreState.instruments.forEach(inst => {
                    const temp = inst.pattern[m];
                    inst.pattern[m] = inst.pattern[m + 1];
                    inst.pattern[m + 1] = temp;
                });
                renderScore();
            }
        } else {
            handleMeasureAction(action, m);
        }

        dropdown.classList.remove("visible");
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("visible");
    });
}

export function handleMeasureAction(action, index) {
    historyManager.pushState();

    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];

    const currentSig = scoreState.measuresConfig[index]?.timeSignature || scoreState.timeSignature || "4/4";

    switch (action) {
        case "add-before":
            scoreState.measuresConfig.splice(index, 0, { timeSignature: currentSig });
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index, 0, createEmptyMeasureForSig(currentSig));
            });
            scoreState.measuresCount++;
            break;

        case "add-after":
            scoreState.measuresConfig.splice(index + 1, 0, { timeSignature: currentSig });
            scoreState.instruments.forEach(inst => {
                inst.pattern.splice(index + 1, 0, createEmptyMeasureForSig(currentSig));
            });
            scoreState.measuresCount++;
            break;

        case "duplicate":
            const clonedConfig = JSON.parse(JSON.stringify(scoreState.measuresConfig[index] || { timeSignature: currentSig }));
            scoreState.measuresConfig.splice(index + 1, 0, clonedConfig);
            scoreState.instruments.forEach(inst => {
                const clonedPattern = JSON.parse(JSON.stringify(inst.pattern[index]));
                inst.pattern.splice(index + 1, 0, clonedPattern);
            });
            scoreState.measuresCount++;
            break;

        case "clear":
            scoreState.instruments.forEach(inst => {
                inst.pattern[index] = createEmptyMeasureForSig(currentSig);
            });
            break;

        case "delete":
            if (scoreState.measuresCount <= 1) {
                alert("O arranjo precisa ter no mínimo 1 compasso.");
                return;
            }
            scoreState.measuresConfig.splice(index, 1);
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

// Altera a métrica de uma coluna específica
export function setColumnTimeSignature(measureIndex, newTimeSig) {
    historyManager.pushState();

    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];
    scoreState.measuresConfig[measureIndex] = { timeSignature: newTimeSig };

    scoreState.instruments.forEach(inst => {
        inst.pattern[measureIndex] = createEmptyMeasureForSig(newTimeSig);
    });

    renderScore();
}