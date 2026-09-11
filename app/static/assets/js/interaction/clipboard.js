import { scoreState, createEmptyMeasure, setClipboard, getClipboard } from '../core/state.js';
import { TIME_SIGNATURES } from '../core/constants.js';
import { historyManager } from '../core/history.js';
import { showToast } from '../ui/toast.js';
import { renderScore } from '../ui/renderScore.js';

// Cópia de seleção de células por instrumento
export function copySelectedMeasures() {
    if (!scoreState.selectedSelection || scoreState.selectedSelection.length === 0) return false;

    const instIds = [...new Set(scoreState.selectedSelection.map(s => s.instId))];
    if (instIds.length > 1) {
        showToast("Copie 1 instrumento por vez.", true);
        return false;
    }

    const targetInstId = instIds[0];
    const inst = scoreState.instruments.find(i => i.id === targetInstId);
    if (!inst) return false;

    const sortedMeasures = [...scoreState.selectedSelection]
        .map(s => s.measureIndex)
        .sort((a, b) => a - b);

    const copiedPatterns = sortedMeasures.map(m => JSON.parse(JSON.stringify(inst.pattern[m] || createEmptyMeasure())));
    const copiedSignatures = sortedMeasures.map(m => {
        return scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
    });

    setClipboard({
        type: "selection",
        instId: targetInstId,
        measures: sortedMeasures,
        patterns: copiedPatterns,
        timeSignatures: copiedSignatures
    });

    showToast(`${copiedPatterns.length} compasso(s) copiado(s)`);
    renderScore();
    return true;
}

// Cópia de uma coluna inteira de compasso (menu contextual)
export function copyFullColumnMeasure(measureIndex) {
    const currentSig = scoreState.measuresConfig?.[measureIndex]?.timeSignature || scoreState.timeSignature || "4/4";

    setClipboard({
        type: "column",
        timeSignature: currentSig,
        instruments: scoreState.instruments.map(inst => ({
            instrumentId: inst.id,
            pattern: JSON.parse(JSON.stringify(inst.pattern[measureIndex] || []))
        }))
    });

    showToast(`Compasso ${measureIndex + 1} copiado`);
}

export function cutSelectedMeasures() {
    if (copySelectedMeasures()) {
        historyManager.pushState();
        clearSelectedMeasures(false);
        renderScore();
    }
}

export function clearSelectedMeasures(showNotification = true) {
    if (!scoreState.selectedSelection || scoreState.selectedSelection.length === 0) return;

    historyManager.pushState();

    scoreState.selectedSelection.forEach(item => {
        const inst = scoreState.instruments.find(i => i.id === item.instId);
        if (inst && inst.pattern[item.measureIndex]) {
            const measurePattern = inst.pattern[item.measureIndex];
            measurePattern.forEach(beatObj => {
                if (beatObj && beatObj.notes) {
                    beatObj.notes = new Array(beatObj.subdivisions).fill(null);
                }
            });
        }
    });

    if (showNotification) showToast("Conteúdo limpo.");
    renderScore();
}

export function getInstrumentFamily(instId) {
    if (!instId) return "";
    if (instId.startsWith("surdo")) return "surdo";
    return instId.split("_")[0];
}

export function pasteClipboardToTarget(targetInstId, targetMeasureIndex) {
    const activeClipboard = getClipboard();

    if (!activeClipboard) {
        showToast("Nenhum dado no clipboard.", true);
        return;
    }

    // Se o clipboard for de uma coluna inteira, realiza a colagem de coluna
    if (activeClipboard.type === "column" || activeClipboard.instruments) {
        pasteFullColumnMeasure(targetMeasureIndex);
        return;
    }

    const sourceFamily = getInstrumentFamily(activeClipboard.instId);
    const targetFamily = getInstrumentFamily(targetInstId);

    if (sourceFamily !== targetFamily) {
        showToast("Não é possível colar o padrão em um instrumento diferente.", true);
        return;
    }

    const inst = scoreState.instruments.find(i => i.id === targetInstId);
    if (!inst) return;

    let incompatible = false;
    activeClipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            const destSig = scoreState.measuresConfig?.[destMeasure]?.timeSignature || scoreState.timeSignature || "4/4";
            const sourceSig = activeClipboard.timeSignatures?.[offset] || "4/4";

            const destBeats = TIME_SIGNATURES[destSig]?.beats || 4;
            const sourceBeats = TIME_SIGNATURES[sourceSig]?.beats || 4;

            if (destBeats !== sourceBeats) {
                incompatible = true;
            }
        }
    });

    if (incompatible) {
        showToast("Não é possível colar: a quantidade de tempos entre os compassos é incompatível.", true);
        return;
    }

    historyManager.pushState();

    activeClipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            inst.pattern[destMeasure] = JSON.parse(JSON.stringify(pattern));
        }
    });

    showToast("Conteúdo colado com sucesso!");
    renderScore();
}

// Colar a coluna inteira atualizando a métrica do compasso de destino
export function pasteFullColumnMeasure(targetMeasureIndex) {
    const activeClipboard = getClipboard();
    if (!activeClipboard) return;

    historyManager.pushState();

    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];

    if (activeClipboard.timeSignature) {
        scoreState.measuresConfig[targetMeasureIndex] = { timeSignature: activeClipboard.timeSignature };
    }

    const rawItems = activeClipboard.instruments || [];
    rawItems.forEach(copiedItem => {
        const inst = scoreState.instruments.find(i => i.id === copiedItem.instrumentId);
        if (inst) {
            inst.pattern[targetMeasureIndex] = JSON.parse(JSON.stringify(copiedItem.pattern));
        }
    });

    showToast("Coluna e métrica coladas com sucesso!");
    renderScore();
}