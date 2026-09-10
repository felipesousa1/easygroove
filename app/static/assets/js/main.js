import './audio/playhead.js';
import './audio/audio.js';
import { renderScore } from './ui/renderScore.js';
import { setupGridEvents, setupHeaderEvents, setupTransportEvents, setupMainMenuEvents } from './ui/events.js';
import { setupToolbarEvents } from './ui/toolbar.js';
import { setupMeasureMenuEvents } from './ui/menu.js';
import { setupMeasureLoopEvents, setupRepeatControlEvents, renderRepeats } from './ui/repeat.js';
import { setupSelectionEvents } from './interaction/selection.js';
import { setupInstrumentControlEvents } from './ui/instrument.js';
import { setupLoopEvents } from './ui/loop.js';
import { setupPersistenceEvents, loadArrangementFromURL } from './services/api.js';
import { setupKeyboardShortcuts } from './interaction/shortcuts.js';
import { setupSubdivisionEvents } from './ui/beams.js';
import { setupNewArrangementModal } from './ui/newArrangementModal.js';
import { isDirty } from './core/state.js';
import { setupExportEvents } from './services/export.js';
import { setupHelpEvents } from './ui/help.js';

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
        setupMainMenuEvents();
        setupTransportEvents();
        setupSubdivisionEvents();
        setupMeasureMenuEvents();
        setupMeasureLoopEvents();
        setupRepeatControlEvents();
        setupSelectionEvents();
        setupInstrumentControlEvents();
        setupLoopEvents();
        setupPersistenceEvents();
        setupNewArrangementModal();
        setupExportEvents();
        setupHelpEvents();

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