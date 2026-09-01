import { STROKE_DEFINITIONS } from '../constants.js';

export function createBeamsSVG(subdivisionsCount = 4, width = 112) {
    let linesCount = 2;
    if (subdivisionsCount === 3) linesCount = 1;
    if (subdivisionsCount === 8) linesCount = 3;

    const yStart = 3;
    const lineSpacing = 5.5;

    let linesHTML = "";

    // Traves horizontais
    for (let i = 0; i < linesCount; i++) {
        const y = yStart + (i * lineSpacing);
        linesHTML += `<line x1="14" y1="${y}" x2="${width - 14}" y2="${y}" stroke="currentColor" stroke-width="2.5"/>`;
    }

    // Hastes verticais
    const stepWidth = (width - 28) / (subdivisionsCount - 1 || 1);
    for (let s = 0; s < subdivisionsCount; s++) {
        const x = 14 + (s * stepWidth);
        linesHTML += `<line x1="${x}" y1="${yStart}" x2="${x}" y2="28" stroke="currentColor" stroke-width="1.8"/>`;
    }

    return `
      <svg class="beat-beams" viewBox="0 0 ${width} 28" preserveAspectRatio="none">
        ${linesHTML}
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