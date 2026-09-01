import { scoreState, createEmptyMeasure, setSelectionClipboard } from './state.js';
import { showToast } from './ui/toast.js';
import { historyManager } from './history.js';
import { renderScore } from './ui/renderScore.js';

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

    setSelectionClipboard({
        instId: targetInstId,
        measures: sortedMeasures,
        patterns: copiedPatterns
    });

    showToast(`${copiedPatterns.length} compasso(s) copiado(s)`);
    renderScore();
    return true;
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
            inst.pattern[item.measureIndex] = createEmptyMeasure();
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
    const clipboard = window.selectionClipboard;

    if (!clipboard || !clipboard.patterns || clipboard.patterns.length === 0) {
        showToast("Nenhum compasso copiado.", true);
        return;
    }

    const sourceFamily = getInstrumentFamily(clipboard.instId);
    const targetFamily = getInstrumentFamily(targetInstId);

    if (sourceFamily !== targetFamily) {
        showToast("Não é possível colar o padrão em um instrumento diferente.", true);
        return;
    }

    const inst = scoreState.instruments.find(i => i.id === targetInstId);
    if (!inst) return;

    historyManager.pushState();

    clipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            inst.pattern[destMeasure] = JSON.parse(JSON.stringify(pattern));
        }
    });

    showToast("Conteúdo colado com sucesso!");
    renderScore();
}