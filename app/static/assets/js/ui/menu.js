import { scoreState, createEmptyMeasure, setCopiedMeasureData, copiedMeasureData } from '../core/state.js';
import { historyManager } from '../core/history.js';
import { TIME_SIGNATURES } from '../core/constants.js';
import { renderScore } from './renderScore.js';

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
        const btnPaste = dropdown.querySelector('[data-action="paste"]');

        const isFirst = activeMeasureIndex === 0;
        const isLast = activeMeasureIndex === scoreState.measuresCount - 1;
        const hasCopiedData = Boolean(copiedMeasureData);

        if (btnMoveLeft) {
            btnMoveLeft.disabled = isFirst;
            btnMoveLeft.classList.toggle("disabled", isFirst);
        }

        if (btnMoveRight) {
            btnMoveRight.disabled = isLast;
            btnMoveRight.classList.toggle("disabled", isLast);
        }

        if (btnPaste) {
            btnPaste.disabled = !hasCopiedData;
            btnPaste.classList.toggle("disabled", !hasCopiedData);
        }

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
    // 1. Garante que o array de configurações exista e tenha o tamanho correto
    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];

    for (let i = 0; i < scoreState.measuresCount; i++) {
        if (!scoreState.measuresConfig[i]) {
            scoreState.measuresConfig[i] = { timeSignature: scoreState.timeSignature || "4/4" };
        }
    }

    // 2. Salva a foto exata do estado ANTES de aplicar qualquer modificação
    historyManager.pushState();

    // 3. Atualiza a métrica do compasso específico
    scoreState.measuresConfig[measureIndex] = { timeSignature: newTimeSig };

    // 4. Zera o conteúdo do compasso para todos os instrumentos na nova métrica
    scoreState.instruments.forEach(inst => {
        inst.pattern[measureIndex] = createEmptyMeasureForSig(newTimeSig);
    });

    // 5. Redesenha a partitura e atualiza a engine de áudio
    renderScore();

    if (window.audioEngine && audioEngine.isInitialized) {
        audioEngine.updateTransportSettings();
    }
}