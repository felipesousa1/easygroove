import { scoreState, setIsDirty } from './state.js';
import { renderScore } from '../ui/renderScore.js';

export const historyManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    getSnapshot() {
        return {
            measuresCount: scoreState.measuresCount,
            // 1. Salva uma cópia profunda da métrica de cada compasso
            measuresConfig: JSON.parse(JSON.stringify(scoreState.measuresConfig || [])),
            repeats: JSON.parse(JSON.stringify(scoreState.repeats || [])),
            title: scoreState.title,
            activeInstrumentId: scoreState.activeTool?.instrumentId,
            // Cópia profunda de cada instrumento inteiro (nome, volume, oculto, ordem, pattern...),
            // para que ocultar/duplicar/excluir/reordenar/renomear também sejam desfeitos
            instruments: JSON.parse(JSON.stringify(scoreState.instruments))
        };
    },

    pushState() {
        this.undoStack.push(this.getSnapshot());
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateButtonsState();

        setIsDirty(true);
    },

    undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push(this.getSnapshot());
        const previousSnapshot = this.undoStack.pop();
        this.applySnapshot(previousSnapshot);
        this.updateButtonsState();
        setIsDirty(true);
    },

    redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push(this.getSnapshot());
        const nextSnapshot = this.redoStack.pop();
        this.applySnapshot(nextSnapshot);
        this.updateButtonsState();
        setIsDirty(true);
    },
    
    applySnapshot(snapshot) {
        scoreState.measuresCount = snapshot.measuresCount;

        // Restaura as configurações de métrica de forma isolada
        if (snapshot.measuresConfig) {
            scoreState.measuresConfig = JSON.parse(JSON.stringify(snapshot.measuresConfig));
        }

        scoreState.repeats = JSON.parse(JSON.stringify(snapshot.repeats || []));
        if (snapshot.title !== undefined) scoreState.title = snapshot.title;
        scoreState.instruments = JSON.parse(JSON.stringify(snapshot.instruments));

        if (scoreState.instruments.some(i => i.id === snapshot.activeInstrumentId)) {
            scoreState.activeTool.instrumentId = snapshot.activeInstrumentId;
        } else if (!scoreState.instruments.some(i => i.id === scoreState.activeTool.instrumentId)) {
            scoreState.activeTool.instrumentId = scoreState.instruments[0]?.id;
        }

        // Seleção e loop podem apontar para compassos/instrumentos que não existem mais
        scoreState.selectedSelection = [];
        scoreState.loopState.endMeasure = Math.min(scoreState.loopState.endMeasure, scoreState.measuresCount);
        scoreState.loopState.startMeasure = Math.min(scoreState.loopState.startMeasure, scoreState.loopState.endMeasure);
        // updateLoopBarVisuals (no renderScore) normaliza as subdivisões fora do intervalo

        // Reconecta o áudio: canais de instrumentos recriados e volumes restaurados
        if (window.audioEngine && audioEngine.isInitialized) {
            scoreState.instruments.forEach(inst => {
                audioEngine.initInstrumentChannel(inst);
                audioEngine.setInstrumentVolume(inst.id, inst.volume);
            });
        }

        renderScore();
    },

    updateButtonsState() {
        const btnUndo = document.getElementById("btn-undo");
        const btnRedo = document.getElementById("btn-redo");
        if (btnUndo) btnUndo.style.opacity = this.undoStack.length > 0 ? "1" : "0.4";
        if (btnRedo) btnRedo.style.opacity = this.redoStack.length > 0 ? "1" : "0.4";
    }
};