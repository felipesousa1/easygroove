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

    const ppq = Tone.Transport.PPQ; // 192 ticks por tempo
    const currentTicks = Tone.Transport.ticks;

    let accumulatedTicks = 0;
    let targetMeasureLinear = 0;
    let targetBeatInMeasure = 0;
    let ticksIntoBeat = 0;

    for (let i = 0; i < sequence.length; i++) {
        const mIdx = sequence[i];
        const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
        const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
        const measureTicks = cfg.beats * ppq;

        if (currentTicks < accumulatedTicks + measureTicks) {
            targetMeasureLinear = i;
            const ticksInMeasure = currentTicks - accumulatedTicks;
            targetBeatInMeasure = Math.floor(ticksInMeasure / ppq);
            ticksIntoBeat = ticksInMeasure % ppq;
            break;
        }

        accumulatedTicks += measureTicks;

        if (i === sequence.length - 1) {
            targetMeasureLinear = sequence.length - 1;
            targetBeatInMeasure = cfg.beats - 1;
            ticksIntoBeat = ppq;
        }
    }

    // Calcula a largura em pixels acumulada de todos os compassos anteriores
    let accumulatedX = 0;
    for (let i = 0; i < targetMeasureLinear; i++) {
        const mIdx = sequence[i];
        const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
        const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
        accumulatedX += cfg.beats * 112; // 112px por tempo
    }

    // Posição no tempo atual em pixels
    const beatWidth = 112;
    const beatX = (targetBeatInMeasure * beatWidth) + ((ticksIntoBeat / ppq) * beatWidth);
    const totalX = accumulatedX + beatX;

    playhead.style.transform = `translateX(${totalX}px)`;
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