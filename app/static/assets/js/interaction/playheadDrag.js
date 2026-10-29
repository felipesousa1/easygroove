import { scoreState } from '../core/state.js';
import { xToPosition, measureX } from '../ui/loop.js';

// Move o playhead manualmente: clique na régua acima dos compassos ou arraste da cabeça
export function setupPlayheadDragEvents() {
    const measuresTrack = document.getElementById("measures-track");
    const viewport = document.querySelector(".score-viewport");
    if (!measuresTrack) return;

    let dragging = false;
    let resumeAfterDrag = false;

    function getTargetTicks(clientX) {
        const rect = measuresTrack.getBoundingClientRect();
        const pos = xToPosition(clientX - rect.left, true);

        // Fim do arranjo: usa o último tick permitido
        const tick = pos.measure >= scoreState.measuresCount
            ? Infinity
            : audioEngine.getTickForPosition(pos.measure, pos.unit);

        return tick === null ? null : tick;
    }

    function isWithinLimits(tick) {
        const { min, max } = audioEngine.getSeekLimits();
        return tick >= min && tick <= max;
    }

    function togglePlayButton() {
        document.getElementById("btn-play")?.click();
    }

    function autoScrollNearEdges(clientX) {
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        if (clientX > rect.right - 40) viewport.scrollLeft += 16;
        else if (clientX < rect.left + 40) viewport.scrollLeft -= 16;
    }

    measuresTrack.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || !window.audioEngine) return;

        const onGrip = e.target.closest(".playhead-grip");
        const onLane = e.target.closest(".playhead-lane");
        if (!onLane) return;

        e.preventDefault();
        const tick = getTargetTicks(e.clientX);
        if (tick === null) return;

        // Clique na régua só vale dentro do limite lógico (loop ativo ou arranjo); a cabeça é limitada ao arrastar
        if (!onGrip && !isWithinLimits(tick)) return;

        dragging = true;
        resumeAfterDrag = audioEngine.isPlaying;
        if (resumeAfterDrag) togglePlayButton(); // pausa durante o arraste para não ficar picotando

        document.body.classList.add("playhead-dragging");
        audioEngine.seekToTicks(tick);
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        const tick = getTargetTicks(e.clientX);
        if (tick !== null) audioEngine.seekToTicks(tick);
        autoScrollNearEdges(e.clientX);
    });

    document.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("playhead-dragging");

        if (resumeAfterDrag) {
            resumeAfterDrag = false;
            togglePlayButton();
        }
    });
}
