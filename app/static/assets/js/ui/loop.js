import { scoreState } from '../state.js';

export function updateLoopBarVisuals() {
    const loopBar = document.getElementById("loop-bar");
    if (!loopBar) return;

    if (scoreState.loopState.endMeasure > scoreState.measuresCount) {
        scoreState.loopState.endMeasure = scoreState.measuresCount;
    }
    if (scoreState.loopState.startMeasure >= scoreState.loopState.endMeasure) {
        scoreState.loopState.startMeasure = Math.max(0, scoreState.loopState.endMeasure - 1);
    }

    const measureWidth = 448;
    loopBar.style.left = `${scoreState.loopState.startMeasure * measureWidth}px`;
    loopBar.style.width = `${(scoreState.loopState.endMeasure - scoreState.loopState.startMeasure) * measureWidth}px`;

    if (scoreState.loopState.active) {
        loopBar.classList.add("active");
    } else {
        loopBar.classList.remove("active");
    }
}

export function setupLoopEvents() {
    const btnLoop = document.getElementById("btn-loop");
    const measuresTrack = document.getElementById("measures-track");
    let draggingMode = null;
    let dragStartX = 0;
    let initialStart = 0;
    let initialEnd = 0;

    if (btnLoop) {
        btnLoop.addEventListener("click", () => {
            scoreState.loopState.active = !scoreState.loopState.active;
            btnLoop.classList.toggle("active", scoreState.loopState.active);
            updateLoopBarVisuals();
            if (window.audioEngine) audioEngine.updateTransportSettings();
        });
    }

    document.addEventListener("mousedown", (e) => {
        if (e.target.closest(".measure-menu-btn") || e.target.closest(".measure-dropdown-menu")) {
            return;
        }

        const loopBar = document.getElementById("loop-bar");
        if (!loopBar || !scoreState.loopState.active) return;

        if (e.target.classList.contains("loop-handle")) {
            draggingMode = e.target.dataset.handle;
            document.body.style.cursor = "ew-resize";
        } else if (e.target === loopBar) {
            draggingMode = "body";
            dragStartX = e.clientX;
            initialStart = scoreState.loopState.startMeasure;
            initialEnd = scoreState.loopState.endMeasure;
            loopBar.classList.add("dragging-body");
            document.body.style.cursor = "grabbing";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!draggingMode || !measuresTrack) return;

        const rect = measuresTrack.getBoundingClientRect();
        const measureWidth = 448;

        if (draggingMode === "body") {
            const deltaX = e.clientX - dragStartX;
            const measureShift = Math.round(deltaX / measureWidth);
            const loopLength = initialEnd - initialStart;

            let newStart = initialStart + measureShift;
            let newEnd = initialEnd + measureShift;

            if (newStart < 0) {
                newStart = 0;
                newEnd = Math.min(scoreState.measuresCount, loopLength);
            } else if (newEnd > scoreState.measuresCount) {
                newEnd = scoreState.measuresCount;
                newStart = Math.max(0, scoreState.measuresCount - loopLength);
            }

            scoreState.loopState.startMeasure = newStart;
            scoreState.loopState.endMeasure = newEnd;
            updateLoopBarVisuals();
            return;
        }

        const x = e.clientX - rect.left;
        let targetMeasure = Math.round(x / measureWidth);
        targetMeasure = Math.max(0, Math.min(scoreState.measuresCount, targetMeasure));

        if (draggingMode === "left") {
            if (targetMeasure < scoreState.loopState.endMeasure) {
                scoreState.loopState.startMeasure = targetMeasure;
            }
        } else if (draggingMode === "right") {
            if (targetMeasure > scoreState.loopState.startMeasure) {
                scoreState.loopState.endMeasure = targetMeasure;
            }
        }

        updateLoopBarVisuals();
    });

    document.addEventListener("mouseup", () => {
        if (draggingMode) {
            const loopBar = document.getElementById("loop-bar");
            if (loopBar) loopBar.classList.remove("dragging-body");

            draggingMode = null;
            document.body.style.cursor = "default";
            if (window.audioEngine) audioEngine.updateTransportSettings();
        }
    });
}