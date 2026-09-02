import { scoreState, setSelectionClipboard } from './state.js';
import { copySelectedMeasures, cutSelectedMeasures, pasteClipboardToTarget } from './clipboard.js';
import { addMeasureToEnd, renderScore } from './ui/renderScore.js';
import { showToast } from './ui/toast.js';

export function setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();

            if (key === "s") {
                e.preventDefault();
                document.querySelector('button[title="Salvar Projeto"]')?.click();
            } else if (key === "c") {
                e.preventDefault();
                copySelectedMeasures();
            } else if (key === "x") {
                e.preventDefault();
                cutSelectedMeasures();
            } else if (key === "v") {
                e.preventDefault();
                if (scoreState.selectedSelection && scoreState.selectedSelection.length > 0) {
                    const first = scoreState.selectedSelection[0];
                    pasteClipboardToTarget(first.instId, first.measureIndex);
                } else {
                    pasteClipboardToTarget(scoreState.activeTool.instrumentId, 0);
                }
            }
            return;
        }

        if (e.key === "Escape") {
            let needsRender = false;

            if (scoreState.selectedSelection && scoreState.selectedSelection.length > 0) {
                scoreState.selectedSelection = [];
                needsRender = true;
            }

            if (window.selectionClipboard) {
                setSelectionClipboard(null);
                // showToast("Área de transferência limpa.");
                needsRender = true;
            }

            if (needsRender) {
                renderScore();
            }
            return;
        }

        if (e.shiftKey) {
            switch (e.key.toLowerCase()) {
                case "n":
                    e.preventDefault();
                    addMeasureToEnd();
                    break;
                case "b":
                    e.preventDefault();
                    document.getElementById("bpm-input")?.focus();
                    break;
                case "r":
                    e.preventDefault();
                    document.getElementById("btn-edit-title")?.click();
                    break;
                case "e":
                    e.preventDefault();
                    document.querySelector('button[title="Exportar Arranjo"]')?.click();
                    break;
                case "h":
                case "?":
                    e.preventDefault();
                    document.querySelector('.floating-help-btn')?.click();
                    break;
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case "p":
                e.preventDefault();
                document.getElementById("btn-play")?.click();
                break;
            case "l":
                e.preventDefault();
                document.getElementById("btn-loop")?.click();
                break;
            case "s":
                e.preventDefault();
                document.getElementById("btn-stop")?.click();
                break;
            default:
                const num = parseInt(e.key, 10);
                if (!isNaN(num) && num >= 1 && num <= 9) {
                    const paletteContainer = document.getElementById("strokes-palette-container");
                    if (paletteContainer) {
                        const buttons = paletteContainer.querySelectorAll(".tool-stroke");
                        if (buttons[num - 1]) buttons[num - 1].click();
                    }
                }
                break;
        }
    });
}