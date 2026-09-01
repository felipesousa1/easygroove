export const STROKE_DEFINITIONS = {
    "pele-aberto": {
        label: "Toque Aberto / Pele",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#111827;"></span>`,
        className: "filled",
        renderHTML: ""
    },
    "abafado": {
        label: "Toque Abafado",
        iconHTML: `<img src="assets/icons/stroke-abafado.svg" alt="Toque Abafado" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-abafado.svg" alt="Toque Abafado">`
    },
    "fantasma": {
        label: "Nota Fantasma / Fraco",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#111827;"></span>`,
        className: "small-dot",
        renderHTML: ""
    },
    "aro": {
        label: "Toque no Aro",
        iconHTML: `<span class="stroke-ring" style="display:inline-block; width:12px; height:12px; border:2px solid #111827; border-radius:50%; box-sizing:border-box;"></span>`,
        className: "ring-empty",
        renderHTML: ""
    },
    "rimshot": {
        label: "Rimshot",
        iconHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot">`
    },
    "rufo": {
        label: "Rufo",
        iconHTML: `<img src="assets/icons/stroke-rufo.svg" alt="Rufo" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rufo.svg" alt="Rufo">`
    },
    "slap": {
        label: "Slap / Mão",
        iconHTML: `<img src="assets/icons/stroke-slap.svg" alt="Slap" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-slap.svg" alt="Slap">`
    },
    "chocalho-frente": {
        label: "Chocalho (Frente)",
        iconHTML: `&gt;`,
        className: "chevron-accent",
        renderHTML: `&gt;`
    },
    "chocalho-tras": {
        label: "Chocalho (Trás)",
        iconHTML: `&lt;`,
        className: "chevron-back",
        renderHTML: `&lt;`
    },
    "tamborim-chapado": {
        label: "Chapado",
        iconHTML: `▲`,
        className: "arrow-up",
        renderHTML: `▲`
    },
    "tamborim-ponta": {
        label: "Ponta de baqueta",
        iconHTML: `▼`,
        className: "arrow-down",
        renderHTML: `▼`
    },

};

export const INSTRUMENT_PRESETS = {
    surdo1: { name: "Surdo 1ª", iconSvg: "assets/icons/inst-surdo1.svg", availableStrokes: ["pele-aberto", "abafado"] },
    surdo2: { name: "Surdo 2ª", iconSvg: "assets/icons/inst-surdo2.svg", availableStrokes: ["pele-aberto", "abafado"] },
    surdo3: { name: "Surdo 3ª", iconSvg: "assets/icons/inst-surdo3.svg", availableStrokes: ["pele-aberto", "abafado"] },
    caixa: { name: "Caixa", iconSvg: "assets/icons/inst-caixa.svg", availableStrokes: ["pele-aberto", "fantasma", "rufo", "rimshot", "aro"] },
    repique: { name: "Repique", iconSvg: "assets/icons/inst-repique.svg", availableStrokes: ["pele-aberto", "rimshot", "aro", "slap", "rufo"] },
    chocalho: { name: "Chocalho", iconSvg: "assets/icons/inst-chocalho.svg", availableStrokes: ["chocalho-frente", "chocalho-tras"] },
    tamborim: { name: "Tamborim", iconSvg: "assets/icons/inst-tamborim.svg", availableStrokes: ["tamborim-chapado", "tamborim-ponta", "abafado", "aro"] }
};

export function getVolumeIcon(vol) {
    if (vol === 0) return "assets/icons/vol-off.svg";
    if (vol < 35) return "assets/icons/vol-baixo.svg";
    if (vol < 70) return "assets/icons/vol-med.svg";
    return "assets/icons/vol-alto.svg";
}

export const TIME_SIGNATURES = {
    "4/4": { beats: 4, subdivisions: 4, beamType: "double" },
    "2/4": { beats: 2, subdivisions: 4, beamType: "double" },
    "3/4": { beats: 3, subdivisions: 4, beamType: "double" },
    "5/4": { beats: 5, subdivisions: 4, beamType: "double" },
    "7/4": { beats: 7, subdivisions: 4, beamType: "double" },
    "6/8": { beats: 2, subdivisions: 3, beamType: "single" },
    "9/8": { beats: 3, subdivisions: 3, beamType: "single" },
    "12/8": { beats: 4, subdivisions: 3, beamType: "single" }
};

// Mapeamento de retrocompatibilidade para chaves antigas
const LEGACY_STROKE_MAP = {
    "surdo-abafado": "abafado",
    "tamborim-cima": "tamborim-chapado",
    "tamborim-baixo": "tamborim-ponta"
};

export function sanitizeStrokes(strokesArray) {
    if (!Array.isArray(strokesArray)) return [];
    return strokesArray.map(key => LEGACY_STROKE_MAP[key] || key);
}