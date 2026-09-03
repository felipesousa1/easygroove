import { scoreState, setIsDirty } from './state.js';
import { renderScore } from './ui/renderScore.js';

export const historyManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    getSnapshot() {
        return {
            measuresCount: scoreState.measuresCount,
            instruments: scoreState.instruments.map(inst => ({
                id: inst.id,
                pattern: JSON.parse(JSON.stringify(inst.pattern))
            }))
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
        snapshot.instruments.forEach(savedInst => {
            const targetInst = scoreState.instruments.find(i => i.id === savedInst.id);
            if (targetInst) {
                targetInst.pattern = JSON.parse(JSON.stringify(savedInst.pattern));
            }
        });
        renderScore();
    },

    updateButtonsState() {
        const btnUndo = document.getElementById("btn-undo");
        const btnRedo = document.getElementById("btn-redo");
        if (btnUndo) btnUndo.style.opacity = this.undoStack.length > 0 ? "1" : "0.4";
        if (btnRedo) btnRedo.style.opacity = this.redoStack.length > 0 ? "1" : "0.4";
    }
};