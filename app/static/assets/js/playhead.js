import { scoreState } from './state.js';

let playheadAnimFrameId = null;

export function updatePlayheadPosition() {
    const playhead = document.getElementById("playhead");
    if (!playhead) return;

    const measureWidth = 448;
    const ticksPerMeasure = scoreState.beatsPerMeasure * Tone.Transport.PPQ;

    const sequence = (window.audioEngine && window.audioEngine.getPlaybackSequence)
        ? window.audioEngine.getPlaybackSequence()
        : [];

    if (sequence.length === 0) return;

    const ticks = Tone.Transport.ticks;
    const m_linear = Math.floor(ticks / ticksPerMeasure);
    const ticks_inside_measure = ticks % ticksPerMeasure;

    if (m_linear >= sequence.length) return;

    const visual_measure = sequence[m_linear];
    const currentX = (visual_measure * measureWidth) + ((ticks_inside_measure / ticksPerMeasure) * measureWidth);

    playhead.style.transform = `translateX(${currentX}px)`;
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