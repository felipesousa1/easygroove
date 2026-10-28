import { scoreState } from '../core/state.js';
import { TIME_SIGNATURES } from '../core/constants.js';
import { showToast } from './toast.js';

const BEAT_WIDTH = 112;

function getMeasureConfig(m) {
    const sig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
    return TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
}

function getMeasureWidth(m) {
    return getMeasureConfig(m).beats * BEAT_WIDTH;
}

// Largura de uma subdivisão (menor unidade do modo livre) no compasso m
function getUnitWidth(m) {
    return BEAT_WIDTH / getMeasureConfig(m).subdivisions;
}

function getUnitsInMeasure(m) {
    const cfg = getMeasureConfig(m);
    return cfg.beats * cfg.subdivisions;
}

function measureX(m) {
    let x = 0;
    for (let i = 0; i < m; i++) x += getMeasureWidth(i);
    return x;
}

function positionToX(measure, unit) {
    if (measure >= scoreState.measuresCount) return measureX(scoreState.measuresCount);
    return measureX(measure) + unit * getUnitWidth(measure);
}

// Converte uma posição em px na pista de compassos para {measure, unit}.
// Livre: encaixa na subdivisão mais próxima. Travado: encaixa na fronteira de compasso mais próxima.
function xToPosition(x, free) {
    // Arrastar além das bordas da partitura trava no início/fim
    x = Math.max(0, Math.min(x, measureX(scoreState.measuresCount)));

    let accumulatedX = 0;
    for (let m = 0; m < scoreState.measuresCount; m++) {
        const w = getMeasureWidth(m);

        if (x < accumulatedX + w) {
            if (!free) {
                return { measure: x >= accumulatedX + (w / 2) ? m + 1 : m, unit: 0 };
            }
            const unitWidth = getUnitWidth(m);
            const unit = Math.round((x - accumulatedX) / unitWidth);
            return unit >= getUnitsInMeasure(m) ? { measure: m + 1, unit: 0 } : { measure: m, unit };
        }
        accumulatedX += w;
    }
    return { measure: scoreState.measuresCount, unit: 0 };
}

// Posição absoluta em subdivisões "virtuais" para comparar início/fim (qualquer métrica)
function comparablePosition(measure, unit) {
    return measure * 1000 + unit;
}

// Mantém o loop consistente após mudanças de estrutura (remover compasso, trocar métrica...)
function normalizeLoop() {
    const loop = scoreState.loopState;
    loop.endMeasure = Math.min(loop.endMeasure, scoreState.measuresCount);

    if (loop.mode !== "free") {
        loop.startUnit = 0;
        loop.endUnit = 0;
    } else {
        if (loop.startMeasure >= scoreState.measuresCount) loop.startMeasure = scoreState.measuresCount - 1;
        loop.startUnit = Math.min(loop.startUnit || 0, getUnitsInMeasure(loop.startMeasure) - 1);
        loop.endUnit = loop.endMeasure >= scoreState.measuresCount
            ? 0
            : Math.min(loop.endUnit || 0, getUnitsInMeasure(loop.endMeasure) - 1);
    }

    if (comparablePosition(loop.startMeasure, loop.startUnit) >= comparablePosition(loop.endMeasure, loop.endUnit)) {
        loop.startUnit = 0;
        loop.startMeasure = Math.max(0, loop.endMeasure - 1);
        if (loop.endMeasure <= loop.startMeasure) loop.endMeasure = loop.startMeasure + 1;
        loop.endUnit = 0;
    }
}

export function updateLoopBarVisuals() {
    const loopBar = document.getElementById("loop-bar");
    const btnLoop = document.getElementById("btn-loop");
    const loop = scoreState.loopState;

    if (btnLoop) btnLoop.classList.toggle("active", loop.active);
    syncLoopPopover();

    if (!loopBar) return;

    if (loop.empty) {
        loopBar.classList.remove("active");
        return;
    }

    normalizeLoop();

    const startX = positionToX(loop.startMeasure, loop.startUnit);
    const endX = positionToX(loop.endMeasure, loop.endUnit);

    loopBar.style.left = `${startX}px`;
    loopBar.style.width = `${endX - startX}px`;
    loopBar.classList.toggle("active", loop.active);
}

function applyLoopToAudio() {
    if (!window.audioEngine) return;
    audioEngine.updateTransportSettings();
    audioEngine.syncWithScore();
}

function setPickingMode(enabled) {
    document.body.classList.toggle("loop-picking", enabled);
}

export function isLoopPicking() {
    return document.body.classList.contains("loop-picking");
}

export function cancelLoopPicking() {
    if (!isLoopPicking()) return false;
    setPickingMode(false);
    scoreState.loopState.active = false;
    updateLoopBarVisuals();
    applyLoopToAudio();
    return true;
}

// Liga/desliga o loop. Se o loop foi zerado, pede para escolher um compasso
export function toggleLoop() {
    const loop = scoreState.loopState;

    if (loop.active) {
        loop.active = false;
        setPickingMode(false);
    } else {
        loop.active = true;
        if (loop.empty) {
            setPickingMode(true);
            showToast("Clique em um compasso para definir o loop");
        }
    }

    updateLoopBarVisuals();
    applyLoopToAudio();
}

// Remove o loop dos compassos atuais e o desativa
export function resetLoop() {
    const loop = scoreState.loopState;
    loop.empty = true;
    loop.active = false;
    loop.startMeasure = 0;
    loop.endMeasure = Math.min(1, scoreState.measuresCount);
    loop.startUnit = 0;
    loop.endUnit = 0;

    setPickingMode(false);
    updateLoopBarVisuals();
    applyLoopToAudio();
    showToast("Loop zerado");
}

export function setLoopMode(mode) {
    const loop = scoreState.loopState;
    if (loop.mode === mode) return;
    loop.mode = mode;

    // Livre -> travado: encaixa "para fora", cobrindo os compassos tocados pelo trecho
    if (mode === "measures") {
        if (loop.endUnit > 0) loop.endMeasure = Math.min(loop.endMeasure + 1, scoreState.measuresCount);
        loop.startUnit = 0;
        loop.endUnit = 0;
    }

    updateLoopBarVisuals();
    applyLoopToAudio();
}

function syncLoopPopover() {
    const loop = scoreState.loopState;
    const toggle = document.getElementById("popover-loop-toggle");
    if (toggle) toggle.checked = loop.active;

    document.querySelectorAll(".loop-mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === loop.mode);
    });

    const btnReset = document.getElementById("btn-loop-reset");
    if (btnReset) btnReset.disabled = loop.empty;
}

export function setupLoopEvents() {
    const btnLoop = document.getElementById("btn-loop");
    const btnOptions = document.getElementById("btn-loop-options");
    const popover = document.getElementById("loop-popover");
    const measuresTrack = document.getElementById("measures-track");
    let draggingMode = null;
    let dragStartX = 0;
    let initialStartX = 0;
    let initialEndX = 0;

    if (btnLoop) {
        btnLoop.addEventListener("click", toggleLoop);
    }

    if (btnOptions && popover) {
        btnOptions.addEventListener("click", (e) => {
            e.stopPropagation();
            document.getElementById("metronome-popover")?.classList.remove("active");
            popover.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!popover.contains(e.target) && !btnOptions.contains(e.target)) {
                popover.classList.remove("active");
            }
        });

        document.getElementById("popover-loop-toggle")?.addEventListener("change", (e) => {
            if (e.target.checked !== scoreState.loopState.active) toggleLoop();
        });

        popover.querySelectorAll(".loop-mode-btn").forEach(btn => {
            btn.addEventListener("click", () => setLoopMode(btn.dataset.mode));
        });

        document.getElementById("btn-loop-reset")?.addEventListener("click", () => {
            resetLoop();
            popover.classList.remove("active");
        });
    }

    // Modo de escolha: clique no cabeçalho de um compasso define o loop nele
    measuresTrack?.addEventListener("click", (e) => {
        if (!isLoopPicking()) return;
        if (e.target.closest("button")) return;

        const header = e.target.closest(".measure-header");
        if (!header) return;

        const index = Array.from(measuresTrack.querySelectorAll(".measure-header")).indexOf(header);
        if (index === -1) return;

        const loop = scoreState.loopState;
        loop.empty = false;
        loop.startMeasure = index;
        loop.endMeasure = index + 1;
        loop.startUnit = 0;
        loop.endUnit = 0;

        setPickingMode(false);
        updateLoopBarVisuals();
        applyLoopToAudio();
    });

    document.addEventListener("mousedown", (e) => {
        const loopBar = document.getElementById("loop-bar");
        if (!loopBar || !scoreState.loopState.active || scoreState.loopState.empty) return;

        const loop = scoreState.loopState;

        if (e.target.classList.contains("loop-handle")) {
            draggingMode = e.target.dataset.handle;
            document.body.style.cursor = "ew-resize";
        } else if (e.target.classList.contains("loop-grab")) {
            draggingMode = "body";
            dragStartX = e.clientX;
            initialStartX = positionToX(loop.startMeasure, loop.startUnit);
            initialEndX = positionToX(loop.endMeasure, loop.endUnit);
            loopBar.classList.add("dragging-body");
            document.body.style.cursor = "grabbing";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!draggingMode || !measuresTrack) return;

        const loop = scoreState.loopState;
        const free = loop.mode === "free";
        const rect = measuresTrack.getBoundingClientRect();

        if (draggingMode === "body") {
            // Mantém a duração (em px) e encaixa o novo início
            const length = initialEndX - initialStartX;
            const totalWidth = measureX(scoreState.measuresCount);
            const targetX = Math.max(0, Math.min(initialStartX + (e.clientX - dragStartX), totalWidth - length));

            const newStart = xToPosition(targetX, free);
            const newEnd = xToPosition(positionToX(newStart.measure, newStart.unit) + length, free);

            if (newEnd.measure > scoreState.measuresCount) return;

            loop.startMeasure = newStart.measure;
            loop.startUnit = newStart.unit;
            loop.endMeasure = newEnd.measure;
            loop.endUnit = newEnd.unit;
            updateLoopBarVisuals();
            return;
        }

        // Alças das bordas
        const target = xToPosition(e.clientX - rect.left, free);

        if (draggingMode === "left") {
            if (comparablePosition(target.measure, target.unit) < comparablePosition(loop.endMeasure, loop.endUnit)) {
                loop.startMeasure = target.measure;
                loop.startUnit = target.unit;
            }
        } else if (draggingMode === "right") {
            if (comparablePosition(target.measure, target.unit) > comparablePosition(loop.startMeasure, loop.startUnit)) {
                loop.endMeasure = target.measure;
                loop.endUnit = target.unit;
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
            applyLoopToAudio();
        }
    });
}
