import { scoreState } from './state.js';
import { TIME_SIGNATURES } from './constants.js';

let playheadAnimFrameId = null;

export function updatePlayheadPosition() {
    const playhead = document.getElementById("playhead");
    if (!playhead || !window.Tone || !Tone.Transport) return;

    const sequence = (window.audioEngine && window.audioEngine.getPlaybackSequence)
        ? window.audioEngine.getPlaybackSequence()
        : [];

    if (sequence.length === 0) return;

    const ppq = Tone.Transport.PPQ;
    let currentTicks = Tone.Transport.ticks;

    // Normaliza os ticks visuais para o ciclo do loop
    if (scoreState.loopState.active && window.audioEngine?.getLoopTickLimits) {
        const { startTicks, endTicks } = window.audioEngine.getLoopTickLimits();
        const loopDuration = endTicks - startTicks;
        if (loopDuration > 0 && currentTicks >= startTicks) {
            currentTicks = startTicks + ((currentTicks - startTicks) % loopDuration);
        }
    }

    let accumulatedTicks = 0;
    let targetSequenceIndex = 0;
    let ticksIntoBeat = 0;
    let targetBeatInMeasure = 0;

    for (let i = 0; i < sequence.length; i++) {
        const mIdx = sequence[i];
        const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
        const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
        const measureTicks = cfg.beats * ppq;

        if (currentTicks < accumulatedTicks + measureTicks) {
            targetSequenceIndex = i;
            const ticksInMeasure = currentTicks - accumulatedTicks;
            targetBeatInMeasure = Math.floor(ticksInMeasure / ppq);
            ticksIntoBeat = ticksInMeasure % ppq;
            break;
        }

        accumulatedTicks += measureTicks;

        if (i === sequence.length - 1) {
            targetSequenceIndex = sequence.length - 1;
            targetBeatInMeasure = cfg.beats - 1;
            ticksIntoBeat = ppq;
        }
    }

    const actualMeasureIndex = sequence[targetSequenceIndex];

    let accumulatedX = 0;
    for (let m = 0; m < actualMeasureIndex; m++) {
        const sig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
        const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
        accumulatedX += cfg.beats * 112;
    }

    const beatWidth = 112;
    const beatX = (targetBeatInMeasure * beatWidth) + ((ticksIntoBeat / ppq) * beatWidth);
    const totalX = accumulatedX + beatX;

    playhead.style.transform = `translateX(${totalX}px)`;

    // Lógica de auto-scroll da viewport
    if (scoreState.autoScrollEnabled && window.audioEngine?.isPlaying) {
        const viewport = document.querySelector(".score-viewport");
        if (viewport) {
            const viewportWidth = viewport.clientWidth;
            const currentScrollLeft = viewport.scrollLeft;

            // Mantém a margem de conforto (300px antes da borda direita da tela)
            const rightMarginThreshold = currentScrollLeft + viewportWidth - 300;

            if (totalX > rightMarginThreshold) {
                viewport.scrollLeft = totalX - 150; // Centraliza ligeiramente à frente
            } else if (totalX < currentScrollLeft) {
                viewport.scrollLeft = Math.max(0, totalX - 50); // Se voltar pelo loop
            }
        }
    }
}
export function animatePlayhead() {
    if (!window.audioEngine || !window.audioEngine.isPlaying) return;
    updatePlayheadPosition();
    playheadAnimFrameId = requestAnimationFrame(animatePlayhead);
}

export function startPlayheadAnimation() {
    if (playheadAnimFrameId) cancelAnimationFrame(playheadAnimFrameId);
    playheadAnimFrameId = requestAnimationFrame(animatePlayhead);
}

export function pausePlayheadAnimation() {
    if (playheadAnimFrameId) cancelAnimationFrame(playheadAnimFrameId);
    playheadAnimFrameId = null;
    updatePlayheadPosition();
}

export function stopPlayheadAnimation() {
    if (playheadAnimFrameId) cancelAnimationFrame(playheadAnimFrameId);
    playheadAnimFrameId = null;
    updatePlayheadPosition();
}

window.updatePlayheadPosition = updatePlayheadPosition;
window.startPlayheadAnimation = startPlayheadAnimation;
window.pausePlayheadAnimation = pausePlayheadAnimation;
window.stopPlayheadAnimation = stopPlayheadAnimation;