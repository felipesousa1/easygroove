import { scoreState } from '../core/state.js';
import { historyManager } from '../core/history.js';
import { exportScoreToAudio } from '../services/export.js';
import { openNewArrangementModal } from './newArrangementModal.js';
import { saveCurrentArrangement } from '../services/api.js';
import { setColumnTimeSignature } from './menu.js';
import { selectActiveInstrument } from './toolbar.js';
import { getStrokeVisual } from './beams.js';
import { TIME_SIGNATURES } from '../core/constants.js';

export function setupGridEvents() {
    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    let isDragging = false;
    let dragMode = "paint";
    let hasPushedHistory = false;

    function applySlotAction(slot) {
        if (!slot) return;

        const instIndex = parseInt(slot.dataset.instIndex, 10);
        const measure = parseInt(slot.dataset.measure, 10);
        const beat = parseInt(slot.dataset.beat, 10);
        const step = parseInt(slot.dataset.step, 10);

        const instrument = scoreState.instruments[instIndex];
        if (!instrument || !instrument.pattern[measure] || !instrument.pattern[measure][beat]) return;

        if (scoreState.activeTool.instrumentId !== instrument.id) {
            selectActiveInstrument(instrument.id);
        }

        const currentStroke = instrument.pattern[measure][beat].notes[step];
        const activeStroke = scoreState.activeTool.strokeType;
        const targetStroke = (dragMode === "erase" || activeStroke === "empty") ? null : activeStroke;

        if (currentStroke !== targetStroke) {
            if (!hasPushedHistory) {
                historyManager.pushState();
                hasPushedHistory = true;
            }

            instrument.pattern[measure][beat].notes[step] = targetStroke;

            const visual = getStrokeVisual(targetStroke);
            slot.className = `note-slot ${visual.className}`;
            slot.innerHTML = visual.content;

            if (targetStroke && window.audioEngine) {
                audioEngine.previewStroke(instrument.id, targetStroke);
            }
        }
    }

    scoreGrid.addEventListener("mousedown", (e) => {
        const slot = e.target.closest(".note-slot");
        if (!slot) return;

        const instIndex = parseInt(slot.dataset.instIndex, 10);
        const measure = parseInt(slot.dataset.measure, 10);
        const beat = parseInt(slot.dataset.beat, 10);
        const step = parseInt(slot.dataset.step, 10);

        const instrument = scoreState.instruments[instIndex];
        const currentStroke = instrument?.pattern[measure]?.[beat]?.notes[step];
        const activeStroke = scoreState.activeTool.strokeType;

        isDragging = true;
        hasPushedHistory = false;

        dragMode = (currentStroke === activeStroke && activeStroke !== "empty") ? "erase" : "paint";
        applySlotAction(slot);
    });

    scoreGrid.addEventListener("mouseover", (e) => {
        if (!isDragging) return;
        const slot = e.target.closest(".note-slot");
        if (slot) applySlotAction(slot);
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
        hasPushedHistory = false;
    });
}

export function setupHeaderEvents() {
    const bpmInput = document.getElementById("bpm-input");
    const popoverBpmDisplay = document.getElementById("popover-bpm-display");

    if (bpmInput) {
        bpmInput.addEventListener("change", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
                if (popoverBpmDisplay) popoverBpmDisplay.textContent = val;
            } else {
                e.target.value = scoreState.bpm;
            }
        });
    }

    const titleDisplay = document.getElementById("title-display");
    const titleInput = document.getElementById("title-input");
    const btnEditTitle = document.getElementById("btn-edit-title");

    if (titleDisplay && titleInput && btnEditTitle) {
        function startEditingTitle() {
            titleInput.value = scoreState.title;
            titleDisplay.style.display = "none";
            btnEditTitle.style.display = "none";
            titleInput.style.display = "inline-block";
            titleInput.focus();
            titleInput.select();
        }

        function saveTitle() {
            const newTitle = titleInput.value.trim() || "Sem Título";
            scoreState.title = newTitle;
            titleDisplay.textContent = newTitle;
            titleDisplay.style.display = "inline-block";
            btnEditTitle.style.display = "inline-flex";
            titleInput.style.display = "none";
        }

        function cancelTitleEdit() {
            titleDisplay.style.display = "inline-block";
            btnEditTitle.style.display = "inline-flex";
            titleInput.style.display = "none";
        }

        btnEditTitle.addEventListener("click", startEditingTitle);
        titleDisplay.addEventListener("dblclick", startEditingTitle);

        titleInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveTitle();
            else if (e.key === "Escape") cancelTitleEdit();
        });

        titleInput.addEventListener("blur", saveTitle);
    }

    document.getElementById("measures-track")?.addEventListener("click", (e) => {
        const badgeBtn = e.target.closest(".time-sig-badge-btn");
        if (!badgeBtn) return;

        e.stopPropagation();
        const measureIndex = parseInt(badgeBtn.dataset.measureIndex, 10);

        document.querySelector(".time-sig-popover")?.remove();

        const popover = document.createElement("div");
        popover.className = "time-sig-popover";

        const currentSig = scoreState.measuresConfig?.[measureIndex]?.timeSignature || scoreState.timeSignature || "4/4";

        Object.keys(TIME_SIGNATURES).forEach(sig => {
            const [num, den] = sig.split("/");
            const itemBtn = document.createElement("button");
            itemBtn.type = "button";
            itemBtn.className = `time-sig-option ${sig === currentSig ? 'active' : ''}`;
            itemBtn.innerHTML = `
            <span class="sig-num">${num}</span>
            <span class="sig-den">${den}</span>
        `;
            itemBtn.title = `Alterar para ${sig}`;

            itemBtn.addEventListener("click", () => {
                popover.remove();
                setColumnTimeSignature(measureIndex, sig);
            });

            popover.appendChild(itemBtn);
        });

        document.body.appendChild(popover);

        const rect = badgeBtn.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;

        const closeHandler = (evt) => {
            if (!popover.contains(evt.target) && !badgeBtn.contains(evt.target)) {
                popover.remove();
                document.removeEventListener("click", closeHandler);
            }
        };
        setTimeout(() => document.addEventListener("click", closeHandler), 0);
    });
}

export function setupTransportEvents() {
    const btnPlay = document.getElementById("btn-play");
    const btnStop = document.getElementById("btn-stop");
    const bpmInput = document.getElementById("bpm-input");
    const playIconImg = document.getElementById("play-icon-img");

    if (!btnPlay || !btnStop) return;

    btnPlay.addEventListener("click", async () => {
        if (!audioEngine.isPlaying) {
            await audioEngine.start();
            btnPlay.classList.add("active");
            if (playIconImg) playIconImg.src = "assets/icons/pause.svg";
        } else {
            audioEngine.pause();
            btnPlay.classList.remove("active");
            if (playIconImg) playIconImg.src = "assets/icons/play.svg";
        }
    });

    btnStop.addEventListener("click", () => {
        audioEngine.stop();
        btnPlay.classList.remove("active");
        if (playIconImg) playIconImg.src = "assets/icons/play.svg";
    });

    const btnMetronome = document.getElementById("btn-metronome");
    const popover = document.getElementById("metronome-popover");
    const toggleInput = document.getElementById("popover-metronome-toggle");
    const popoverBpmDisplay = document.getElementById("popover-bpm-display");
    const volSlider = document.getElementById("metronome-vol-slider");
    const volDisplay = document.getElementById("metronome-vol-display");

    if (btnMetronome && popover) {
        btnMetronome.addEventListener("click", (e) => {
            e.stopPropagation();
            popover.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!popover.contains(e.target) && !btnMetronome.contains(e.target)) {
                popover.classList.remove("active");
            }
        });

        toggleInput?.addEventListener("change", (e) => {
            audioEngine.metronomeEnabled = e.target.checked;
            btnMetronome.classList.toggle("active", e.target.checked);
        });

        volSlider?.addEventListener("input", (e) => {
            const vol = parseInt(e.target.value, 10);
            if (volDisplay) volDisplay.textContent = `${vol}%`;
            audioEngine.setMetronomeVolume(vol);
        });
    }

    document.querySelectorAll(".bpm-stepper-control .btn-bpm-step").forEach(btn => {
        btn.addEventListener("click", () => {
            const step = parseInt(btn.dataset.step, 10);
            let currentBpm = scoreState.bpm || 120;
            let newBpm = Math.min(Math.max(currentBpm + step, 40), 260);

            scoreState.bpm = newBpm;
            if (bpmInput) bpmInput.value = newBpm;
            if (popoverBpmDisplay) popoverBpmDisplay.textContent = newBpm;

            if (window.audioEngine) window.audioEngine.updateTransportSettings();
        });
    });

    if (bpmInput) {
        bpmInput.addEventListener("input", (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 40 && val <= 260) {
                scoreState.bpm = val;
                if (popoverBpmDisplay) popoverBpmDisplay.textContent = val;
                if (Tone.Transport) {
                    Tone.Transport.bpm.value = val;
                }
            }
        });
    }
}

export function setupMainMenuEvents() {
    const btnMenu = document.getElementById("btn-main-menu");
    const menuDropdown = document.getElementById("main-app-menu");
    const importFileInput = document.getElementById("import-file-input");

    if (!btnMenu || !menuDropdown) return;

    btnMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!menuDropdown.contains(e.target) && e.target !== btnMenu) {
            menuDropdown.classList.remove("active");
        }
    });

    document.getElementById("menu-opt-new")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        openNewArrangementModal();
    });

    document.getElementById("menu-opt-library")?.addEventListener("click", () => {
        window.location.href = "/biblioteca";
    });

    document.getElementById("menu-opt-save")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuDropdown.classList.remove("active");
        saveCurrentArrangement();
    });

    document.getElementById("menu-opt-export-wav")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        exportScoreToAudio();
    });

    document.getElementById("menu-opt-export-json")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const exportBtn = document.querySelector('.header-right button[title="Exportar Arranjo"]');
        if (exportBtn) exportBtn.click();
    });

    document.getElementById("menu-opt-import-json")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        if (importFileInput) importFileInput.click();
    });

    const btnAutoScroll = document.getElementById("menu-opt-autoscroll");
    const autoScrollIcon = document.getElementById("autoscroll-status-icon");

    if (autoScrollIcon) {
        autoScrollIcon.textContent = scoreState.autoScrollEnabled ? "✓" : "";
    }

    if (btnAutoScroll) {
        btnAutoScroll.addEventListener("click", () => {
            scoreState.autoScrollEnabled = !scoreState.autoScrollEnabled;
            localStorage.setItem("easygroove_autoscroll", JSON.stringify(scoreState.autoScrollEnabled));

            if (autoScrollIcon) {
                autoScrollIcon.textContent = scoreState.autoScrollEnabled ? "✓" : "";
            }
            if (typeof showToast === "function") {
                showToast(`Auto-Scroll ${scoreState.autoScrollEnabled ? 'ativado' : 'desativado'}`);
            }
        });
    }

    const btnToggleToolbar = document.getElementById("menu-opt-toolbar");
    const toolbarStatusIcon = document.getElementById("toolbar-status-icon");
    const floatingBar = document.querySelector(".floating-editor-bar");

    if (btnToggleToolbar && floatingBar) {
        let isToolbarVisible = true;

        btnToggleToolbar.addEventListener("click", () => {
            isToolbarVisible = !isToolbarVisible;
            localStorage.setItem("easygroove_toolbar", JSON.stringify(scoreState.toolbarVisible));

            floatingBar.classList.toggle("hidden-bar", !isToolbarVisible);
            if (toolbarStatusIcon) {
                toolbarStatusIcon.textContent = isToolbarVisible ? "✓" : "";
            }

            if (typeof showToast === "function") {
                showToast(`Barra de ferramentas ${isToolbarVisible ? 'exibida' : 'ocultada'}`);
            }
        });
    }

    document.getElementById("menu-opt-tour")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        if (window.startInteractiveTour) window.startInteractiveTour();
    });

    document.getElementById("menu-opt-shortcuts")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const helpModal = document.getElementById("help-modal");
        if (helpModal) {
            helpModal.classList.add("active");
            helpModal.querySelectorAll(".help-tab-btn").forEach(b => b.classList.remove("active"));
            helpModal.querySelectorAll(".help-tab-panel").forEach(p => p.classList.remove("active"));

            const shortcutTab = helpModal.querySelector('[data-tab="shortcuts"]');
            const shortcutPanel = document.getElementById("help-tab-shortcuts");
            if (shortcutTab && shortcutPanel) {
                shortcutTab.classList.add("active");
                shortcutPanel.classList.add("active");
            }
        }
    });

    document.getElementById("menu-opt-help")?.addEventListener("click", () => {
        menuDropdown.classList.remove("active");
        const helpModal = document.getElementById("help-modal");
        if (helpModal) helpModal.classList.add("active");
    });

    document.getElementById("menu-opt-exit")?.addEventListener("click", () => {
        window.location.href = "/";
    });
}