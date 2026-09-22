import { scoreState, createEmptyMeasure, setClipboard, getClipboard } from '../core/state.js';
import { TIME_SIGNATURES } from '../core/constants.js';
import { historyManager } from '../core/history.js';
import { showToast } from '../ui/toast.js';
import { renderScore } from '../ui/renderScore.js';

export function getInstrumentFamily(instId) {
    if (!instId) return "";
    if (instId.startsWith("surdo")) return "surdo";
    return instId.split("_")[0];
}

// Verifica se uma lista de compassos/padrões está totalmente vazia (apenas pausas/nulos)
function isPatternEmpty(patterns) {
    if (!patterns || patterns.length === 0) return true;
    return patterns.every(measure => {
        if (!measure) return true;
        return measure.every(beat => {
            if (!beat || !beat.notes) return true;
            return beat.notes.every(note => note === null || note === "empty");
        });
    });
}

// Cópia de seleção (suporta 1 ou mais instrumentos e compassos)
export function copySelectedMeasures() {
    if (!scoreState.selectedSelection || scoreState.selectedSelection.length === 0) return false;

    const selectionByInst = {};
    scoreState.selectedSelection.forEach(item => {
        if (!selectionByInst[item.instId]) {
            selectionByInst[item.instId] = [];
        }
        selectionByInst[item.instId].push(item.measureIndex);
    });

    const items = [];
    scoreState.instruments.forEach(inst => {
        if (selectionByInst[inst.id]) {
            const sortedMeasures = [...selectionByInst[inst.id]].sort((a, b) => a - b);
            const copiedPatterns = sortedMeasures.map(m => JSON.parse(JSON.stringify(inst.pattern[m] || createEmptyMeasure())));
            const copiedSignatures = sortedMeasures.map(m => {
                return scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
            });

            items.push({
                instId: inst.id,
                measures: sortedMeasures,
                patterns: copiedPatterns,
                timeSignatures: copiedSignatures
            });
        }
    });

    setClipboard({
        type: "selection",
        items: items
    });

    const totalMeasures = items.reduce((acc, curr) => acc + curr.patterns.length, 0);
    showToast(`${totalMeasures} bloco(s) de compasso copiados`);
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

// Verifica se os dados do clipboard podem ser colados a partir do ponto de destino
export function checkPasteCompatibility(targetInstId, targetMeasureIndex) {
    const activeClipboard = getClipboard();
    if (!activeClipboard) return { compatible: false, reason: "Nenhum conteúdo no clipboard." };

    if (activeClipboard.type === "column" || activeClipboard.instruments) {
        return { compatible: true };
    }

    const items = activeClipboard.items || [];
    if (items.length === 0) return { compatible: false, reason: "Clipboard vazio." };

    const targetInstIndex = scoreState.instruments.findIndex(i => i.id === targetInstId);
    if (targetInstIndex === -1) return { compatible: false, reason: "Instrumento de destino inválido." };

    for (let i = 0; i < items.length; i++) {
        const sourceItem = items[i];
        const destInst = scoreState.instruments[targetInstIndex + i];

        if (!destInst) {
            return { compatible: false, reason: "Não há linhas suficientes no destino para colar todos os instrumentos." };
        }

        // Validação de Família de Instrumentos:
        // Se o padrão copiado estiver completamente VAZIO (sem notas), a colagem é permitida em qualquer instrumento
        const isEmpty = isPatternEmpty(sourceItem.patterns);
        if (!isEmpty) {
            const sourceFamily = getInstrumentFamily(sourceItem.instId);
            const destFamily = getInstrumentFamily(destInst.id);

            if (sourceFamily !== destFamily) {
                return {
                    compatible: false,
                    reason: `Incompatível: ${destInst.name} não é da mesma família do instrumento copiado.`
                };
            }
        }

        // Validação de Métricas / Quantidade de Tempos
        for (let offset = 0; offset < sourceItem.patterns.length; offset++) {
            const destMeasure = targetMeasureIndex + offset;
            if (destMeasure < scoreState.measuresCount) {
                const destSig = scoreState.measuresConfig?.[destMeasure]?.timeSignature || scoreState.timeSignature || "4/4";
                const sourceSig = sourceItem.timeSignatures?.[offset] || "4/4";

                const destBeats = TIME_SIGNATURES[destSig]?.beats || 4;
                const sourceBeats = TIME_SIGNATURES[sourceSig]?.beats || 4;

                if (destBeats !== sourceBeats) {
                    return {
                        compatible: false,
                        reason: `Métrica incompatível no compasso \({destMeasure + 1} (\){sourceBeats} tempos copiados vs ${destBeats} tempos no destino).`
                    };
                }
            }
        }
    }

    return { compatible: true };
}

export function pasteClipboardToTarget(targetInstId, targetMeasureIndex) {
    const activeClipboard = getClipboard();
    if (!activeClipboard) return;

    if (activeClipboard.type === "column" || activeClipboard.instruments) {
        pasteFullColumnMeasure(targetMeasureIndex);
        return;
    }

    const status = checkPasteCompatibility(targetInstId, targetMeasureIndex);
    if (!status.compatible) {
        showToast(status.reason, true);
        return;
    }

    historyManager.pushState();

    const items = activeClipboard.items || [];
    const targetInstIndex = scoreState.instruments.findIndex(i => i.id === targetInstId);

    items.forEach((sourceItem, i) => {
        const destInst = scoreState.instruments[targetInstIndex + i];
        if (destInst) {
            sourceItem.patterns.forEach((pattern, offset) => {
                const destMeasure = targetMeasureIndex + offset;
                if (destMeasure < scoreState.measuresCount) {
                    destInst.pattern[destMeasure] = JSON.parse(JSON.stringify(pattern));
                }
            });
        }
    });

    showToast("Conteúdo colado com sucesso!");
    renderScore();
}

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