import { STROKE_DEFINITIONS } from '../constants.js';

export function createBeamsSVG() {
    return `
    <svg class="beat-beams" viewBox="0 0 112 28" preserveAspectRatio="none">
      <line x1="14" y1="3" x2="98" y2="3" stroke="currentColor" stroke-width="2.5"/>
      <line x1="14" y1="8.5" x2="98" y2="8.5" stroke="currentColor" stroke-width="2.5"/>
      <line x1="14" y1="3" x2="14" y2="28" stroke="currentColor" stroke-width="1.8"/>
      <line x1="42" y1="3" x2="42" y2="28" stroke="currentColor" stroke-width="1.8"/>
      <line x1="70" y1="3" x2="70" y2="28" stroke="currentColor" stroke-width="1.8"/>
      <line x1="98" y1="3" x2="98" y2="28" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `;
}

export function getStrokeVisual(stroke) {
    if (!stroke || !STROKE_DEFINITIONS[stroke]) {
        return { className: "empty", content: "" };
    }
    const def = STROKE_DEFINITIONS[stroke];
    return { className: def.className, content: def.renderHTML };
}