import './playhead.js';
import './audio.js';
import { renderScore, setupGridEvents, setupHeaderEvents, setupTransportEvents } from './ui/renderScore.js';
import { setupToolbarEvents } from './ui/toolbar.js';
import { setupMeasureMenuEvents } from './ui/menu.js';
import { setupMeasureLoopEvents, setupRepeatControlEvents, renderRepeats } from './ui/repeat.js';
import { setupSelectionEvents } from './selection.js';
import { setupInstrumentControlEvents } from './ui/instrument.js';
import { setupLoopEvents } from './ui/loop.js';
import { setupPersistenceEvents, loadArrangementFromURL } from './api.js';
import { setupKeyboardShortcuts } from './shortcuts.js';
import { setupSubdivisionEvents } from './ui/beams.js';
import { setupNewArrangementModal } from './ui/newArrangementModal.js';
import { isDirty } from './state.js';

window.addEventListener("resize", renderRepeats);

// Previne o fechamento/recarregamento acidental se houver alterações não salvas
window.addEventListener("beforeunload", (event) => {
    if (isDirty) {
        event.preventDefault();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    try {
        renderScore();
        setupToolbarEvents();
        setupGridEvents();
        setupHeaderEvents();
        setupTransportEvents();
        setupSubdivisionEvents();
        setupMeasureMenuEvents();
        setupMeasureLoopEvents();
        setupRepeatControlEvents();
        setupSelectionEvents();
        setupInstrumentControlEvents();
        setupLoopEvents();
        setupPersistenceEvents();

        if (window.location.search.includes("id=")) {
            loadArrangementFromURL();
        } else {
            // Abre o modal para configurar o novo arranjo
            setupNewArrangementModal();
        }

        setupKeyboardShortcuts();
    } catch (err) {
        console.error("Erro na inicialização:", err);
    }
});