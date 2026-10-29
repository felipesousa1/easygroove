import { scoreState, setSelectionClipboard } from '../core/state.js';
import { resetLoop, cancelLoopPicking } from '../ui/loop.js';
import { copySelectedMeasures, cutSelectedMeasures, pasteClipboardToTarget, clearSelectedMeasures } from './clipboard.js';
import { addMeasureToEnd, renderScore } from '../ui/renderScore.js';
import { showToast } from '../ui/toast.js';

export function setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();

            if (key === "s") {
                e.preventDefault();
                const saveBtn = document.getElementById("btn-save-project");
                if (saveBtn?.disabled) showToast("Faça login para salvar o arranjo.", true);
                else saveBtn?.click();
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

        // Atalho para apagar o conteúdo dos compassos selecionados
        if (e.key === "Delete" || e.key === "Backspace") {
            if (scoreState.selectedSelection && scoreState.selectedSelection.length > 0) {
                e.preventDefault();
                clearSelectedMeasures();
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
                needsRender = true;
            }

            // Cancela a escolha de compasso do loop (após "zerar loop")
            cancelLoopPicking();

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
                case "l":
                    e.preventDefault();
                    resetLoop();
                    break;
                case "r":
                    e.preventDefault();
                    document.getElementById("title-display")?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
                    break;
                case "a":
                    e.preventDefault();
                    document.getElementById("menu-opt-new")?.click();
                    break;
                case "m":
                    e.preventDefault();
                    // Oculto para convidados: o atalho também não deve funcionar
                    if (!document.getElementById("menu-opt-library")?.hidden) {
                        document.getElementById("menu-opt-library")?.click();
                    }
                    break;
                case "w":
                    e.preventDefault();
                    document.getElementById("menu-opt-export-wav")?.click();
                    break;
                case "j":
                    e.preventDefault();
                    document.getElementById("menu-opt-export-json")?.click();
                    break;
                case "i":
                    e.preventDefault();
                    document.getElementById("menu-opt-import-json")?.click();
                    break;
                case "s":
                    e.preventDefault();
                    document.getElementById("menu-opt-autoscroll")?.click();
                    break;
                case "t":
                    e.preventDefault();
                    document.getElementById("menu-opt-toolbar")?.click();
                    break;
                case "q":
                    e.preventDefault();
                    document.getElementById("menu-opt-exit")?.click();
                    break;
                case "e":
                    e.preventDefault();
                    document.getElementById("btn-export-popover")?.click();
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
            case "0":
                e.preventDefault();
                const paletteContainer = document.getElementById("strokes-palette-container");
                if (paletteContainer) {
                    const emptyBtn = paletteContainer.querySelector('.tool-stroke[data-stroke-key="empty"]');
                    if (emptyBtn) emptyBtn.click();
                }
                break;
            default:
                const num = parseInt(e.key, 10);
                if (!isNaN(num) && num >= 1 && num <= 9) {
                    const paletteContainer = document.getElementById("strokes-palette-container");
                    if (paletteContainer) {
                        // Busca apenas os botões de toques reais, ignorando a borracha (empty)
                        const strokeButtons = paletteContainer.querySelectorAll('.tool-stroke:not([data-stroke-key="empty"])');
                        if (strokeButtons[num - 1]) strokeButtons[num - 1].click();
                    }
                }
                break;
        }
    });
}