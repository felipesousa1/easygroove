import { scoreState, createEmptyMeasure, setSelectionClipboard } from './state.js';
import { TIME_SIGNATURES } from './constants.js';
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
    
    // Mapeia a métrica de cada compasso copiado
    const copiedSignatures = sortedMeasures.map(m => {
        return scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
    });

    setSelectionClipboard({
        instId: targetInstId,
        measures: sortedMeasures,
        patterns: copiedPatterns,
        timeSignatures: copiedSignatures
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
            const measurePattern = inst.pattern[item.measureIndex];
            // Apaga o conteúdo das notas preservando o objeto e subdivisões de cada tempo
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

    // Validação de Compatibilidade de Métricas
    let incompatible = false;
    clipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            const destSig = scoreState.measuresConfig?.[destMeasure]?.timeSignature || scoreState.timeSignature || "4/4";
            const sourceSig = clipboard.timeSignatures?.[offset] || "4/4";

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

    clipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            inst.pattern[destMeasure] = JSON.parse(JSON.stringify(pattern));
        }
    });

    showToast("Conteúdo colado com sucesso!");
    renderScore();
}

// Colar a coluna inteira atualizando as métricas dos compassos de destino
export function pasteColumnClipboard(targetMeasureIndex) {
    const clipboard = window.selectionClipboard;
    if (!clipboard || !clipboard.patterns || clipboard.patterns.length === 0) return;

    historyManager.pushState();

    if (!scoreState.measuresConfig) scoreState.measuresConfig = [];

    clipboard.patterns.forEach((pattern, offset) => {
        const destMeasure = targetMeasureIndex + offset;
        if (destMeasure < scoreState.measuresCount) {
            const sourceSig = clipboard.timeSignatures?.[offset] || "4/4";
            
            // Atualiza a métrica da coluna inteira para a métrica de origem
            scoreState.measuresConfig[destMeasure] = { timeSignature: sourceSig };

            // Copia para o instrumento correspondente
            const inst = scoreState.instruments.find(i => i.id === clipboard.instId);
            if (inst) {
                inst.pattern[destMeasure] = JSON.parse(JSON.stringify(pattern));
            }
        }
    });

    showToast("Coluna e métricas coladas com sucesso!");
    renderScore();
}