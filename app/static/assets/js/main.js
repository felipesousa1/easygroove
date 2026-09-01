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

window.addEventListener("resize", renderRepeats);

document.addEventListener("DOMContentLoaded", () => {
    try {
        renderScore();
        setupToolbarEvents();
        setupGridEvents();
        setupHeaderEvents();
        setupTransportEvents();
        setupMeasureMenuEvents();
        setupMeasureLoopEvents();
        setupRepeatControlEvents();
        setupSelectionEvents();
        setupInstrumentControlEvents();
        setupLoopEvents();
        setupPersistenceEvents();

        if (window.location.search.includes("id=")) {
            loadArrangementFromURL();
        }

        setupKeyboardShortcuts();
    } catch (err) {
        console.error("Erro na inicialização:", err);
    }
});