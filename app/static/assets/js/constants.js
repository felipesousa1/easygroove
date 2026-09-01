export const STROKE_DEFINITIONS = {
    "pele-aberto": {
        label: "Toque Aberto / Pele",
        iconHTML: `<span class="stroke-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#111827;"></span>`,
        className: "filled",
        renderHTML: ""
    },
    "surdo-abafado": {
        label: "Surdo Abafado",
        iconHTML: `<span class="stroke-ring-accent" style="display:inline-flex; align-items:center; justify-content:center; width:13px; height:13px; border:2px solid #111827; border-radius:50%; box-sizing:border-box; background:#111827; box-shadow: 0 0 0 1.5px #ffffff inset;"></span>`,
        className: "ring-accent",
        renderHTML: ""
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
    "tamborim-cima": {
        label: "Tamborim (Em Cima)",
        iconHTML: `▲`,
        className: "arrow-up",
        renderHTML: `▲`
    },
    "tamborim-baixo": {
        label: "Tamborim (Embaixo)",
        iconHTML: `▼`,
        className: "arrow-down",
        renderHTML: `▼`
    }
};

export const INSTRUMENT_PRESETS = {
    surdo1: { name: "Surdo 1ª", iconSvg: "assets/icons/inst-surdo1.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    surdo2: { name: "Surdo 2ª", iconSvg: "assets/icons/inst-surdo2.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    surdo3: { name: "Surdo 3ª", iconSvg: "assets/icons/inst-surdo3.svg", availableStrokes: ["pele-aberto", "surdo-abafado"] },
    caixa: { name: "Caixa", iconSvg: "assets/icons/inst-caixa.svg", availableStrokes: ["pele-aberto", "fantasma", "aro", "rimshot", "rufo"] },
    repique: { name: "Repique", iconSvg: "assets/icons/inst-repique.svg", availableStrokes: ["pele-aberto", "rimshot", "aro", "slap", "rufo"] },
    chocalho: { name: "Chocalho", iconSvg: "assets/icons/inst-chocalho.svg", availableStrokes: ["chocalho-frente", "chocalho-tras"] },
    tamborim: { name: "Tamborim", iconSvg: "assets/icons/inst-tamborim.svg", availableStrokes: ["tamborim-cima", "tamborim-baixo"] }
};

export function getVolumeIcon(vol) {
    if (vol === 0) return "assets/icons/vol-off.svg";
    if (vol < 35) return "assets/icons/vol-baixo.svg";
    if (vol < 70) return "assets/icons/vol-med.svg";
    return "assets/icons/vol-alto.svg";
}