export const STROKE_DEFINITIONS = {
    "empty": {
        label: "Pausa / Apagar Nota",
iconHTML: `<span style="font-size: 1.1rem; line-height: 1; font-weight: bold; color: currentColor;">✕</span>`,        className: "stroke-empty",
        renderHTML: ""
    },
    "pele-aberto": {
        label: "Toque Centro",
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
    "rimshot-forte": {
        label: "Rimshot Forte",
        iconHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot Forte" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Rimshot Forte">`
    },
    "rimshot-fraco": {
        label: "Rimshot Fraco",
        iconHTML: `<img src="assets/icons/stroke-rimshot-fraco.svg" alt="Rimshot Fraco" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rimshot-fraco.svg" alt="Rimshot Fraco">`
    },
    "mao": {
        label: "Mão",
        iconHTML: `<img src="assets/icons/stroke-slap.svg" alt="Mão" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-slap.svg" alt="Mão">`
    },
    "borda": {
        label: "Borda",
        iconHTML: `<img src="assets/icons/stroke-borda.svg" alt="Borda" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-borda.svg" alt="Borda">`
    },
    "corpo": {
        label: "Corpo",
        iconHTML: `<img src="assets/icons/stroke-corpo.svg" alt="Corpo" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-corpo.svg" alt="Corpo">`
    },
    "volta": {
        label: "Vira / Volta",
        iconHTML: `<img src="assets/icons/stroke-borda.svg" alt="Vira / Volta" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-borda.svg" alt="Vira / Volta">`
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
    "chocalho-frente-acentuado": {
        label: "Chocalho (Frente acentuado)",
        iconHTML: `<span style="-webkit-text-stroke: 1.6px currentColor;">&gt;</span>`,
        className: "chevron-accent chevron-bold",
        renderHTML: `&gt;`
    },
    "chocalho-tras-acentuado": {
        label: "Chocalho (Trás acentuado)",
        iconHTML: `<span style="-webkit-text-stroke: 1.6px currentColor;">&lt;</span>`,
        className: "chevron-back chevron-bold",
        renderHTML: `&lt;`
    },
    "tamborim-chapado": {
        label: "Chapado",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#111827;"></span>`,
        className: "filled",
        renderHTML: ""
    },
    "tamborim-ponta": {
        label: "Ponta de baqueta",
        iconHTML: `<span class="stroke-ring" style="display:inline-block; width:12px; height:12px; border:2px solid #111827; border-radius:50%; box-sizing:border-box;"></span>`,
        className: "ring-empty",
        renderHTML: ""
    },
    "agogo-1": {
        label: "Agogô 1",
        iconHTML: `1`,
        className: "chevron-accent",
        renderHTML: `1`
    },
    "agogo-2": {
        label: "Agogô 2",
        iconHTML: `2`,
        className: "chevron-accent",
        renderHTML: `2`
    },
    "agogo-3": {
        label: "Agogô 3",
        iconHTML: `3`,
        className: "chevron-accent",
        renderHTML: `3`
    },
    "agogo-4": {
        label: "Agogô 4",
        iconHTML: `4`,
        className: "chevron-accent",
        renderHTML: `4`
    },
    "xequere-baixo": {
        label: "Xequerê (Baixo)",
        iconHTML: `<span style="display:inline-block; transform: rotate(90deg);">&gt;</span>`,
        className: "chevron-accent",
        renderHTML: `<span style="display:inline-block; transform: rotate(90deg);">&gt;</span>`
    },
    "xequere-cima": {
        label: "Xequerê (Cima)",
        iconHTML: `<span style="display:inline-block; transform: rotate(-90deg);">&gt;</span>`,
        className: "chevron-accent",
        renderHTML: `<span style="display:inline-block; transform: rotate(-90deg);">&gt;</span>`
    },
    "triangulo-fechado": {
        label: "Triângulo Fechado",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#111827;"></span>`,
        className: "small-dot",
        renderHTML: ""
    },
    "triangulo-aberto-longo": {
        label: "Triângulo Aberto (Longo)",
        iconHTML: `<span class="stroke-ring" style="display:inline-block; width:12px; height:12px; border:2px solid #111827; border-radius:50%; box-sizing:border-box;"></span>`,
        className: "ring-empty",
        renderHTML: ""
    },
    "triangulo-aberto-curto": {
        label: "Triângulo Aberto (Curto)",
        iconHTML: `<img src="assets/icons/stroke-triangulo-curto.svg" alt="Triângulo Aberto (Curto)" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-triangulo-curto.svg" alt="Triângulo Aberto (Curto)">`
    },
    "timbal-open": {
        label: "Timbal Open",
        iconHTML: `<span class="stroke-ring" style="display:inline-block; width:12px; height:12px; border:2px solid #111827; border-radius:50%; box-sizing:border-box;"></span>`,
        className: "ring-empty",
        renderHTML: ""
    },
    "timbal-slap": {
        label: "Timbal Slap",
        iconHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Timbal Slap" class="ui-icon-stroke">`,
        className: "custom-svg",
        renderHTML: `<img src="assets/icons/stroke-rimshot.svg" alt="Timbal Slap">`
    },
    "timbal-bass": {
        label: "Timbal Bass",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#111827;"></span>`,
        className: "filled",
        renderHTML: ""
    },
    "timbal-fantasma": {
        label: "Timbal Fantasma",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#111827;"></span>`,
        className: "small-dot",
        renderHTML: ""
    },
};

export const INSTRUMENT_PRESETS = {
    surdo1: { name: "Surdo 1ª", iconSvg: "assets/icons/inst-surdo1.svg", availableStrokes: ["pele-aberto", "abafado"] },
    surdo2: { name: "Surdo 2ª", iconSvg: "assets/icons/inst-surdo2.svg", availableStrokes: ["pele-aberto", "abafado"] },
    surdo3: { name: "Surdo 3ª", iconSvg: "assets/icons/inst-surdo3.svg", availableStrokes: ["pele-aberto", "abafado", "mao", "aro", "corpo"] },
    caixa: { name: "Caixa", iconSvg: "assets/icons/inst-caixa.svg", availableStrokes: ["pele-aberto", "fantasma", "rimshot-fraco", "rimshot-forte", "rufo", "aro"] },
    repique: { name: "Repique", iconSvg: "assets/icons/inst-repique.svg", availableStrokes: ["pele-aberto", "borda", "rimshot", "slap", "rufo", "aro", "corpo"] },
    chocalho: { name: "Chocalho", iconSvg: "assets/icons/inst-chocalho.svg", availableStrokes: ["chocalho-frente", "chocalho-tras", "chocalho-frente-acentuado", "chocalho-tras-acentuado"] },
    tamborim: { name: "Tamborim", iconSvg: "assets/icons/inst-tamborim.svg", availableStrokes: ["tamborim-chapado", "tamborim-ponta", "volta", "abafado"] },
    agogo: { name: "Agogô", iconSvg: "assets/icons/inst-agogo.svg", availableStrokes: ["agogo-1", "agogo-2", "agogo-3", "agogo-4"] },
    xequere: { name: "Xequerê", iconSvg: "assets/icons/inst-xequere.svg", availableStrokes: ["xequere-baixo", "xequere-cima"] },
    triangulo: { name: "Triângulo", iconSvg: "assets/icons/inst-triangulo.svg", availableStrokes: ["triangulo-aberto-longo", "triangulo-fechado", "triangulo-aberto-curto"] },
    timbal: { name: "Timbal", iconSvg: "assets/icons/inst-timbal.svg", availableStrokes: ["timbal-open", "timbal-slap", "timbal-bass", "timbal-fantasma"] }
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