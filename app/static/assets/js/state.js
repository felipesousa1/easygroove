export let currentArrangementId = null;
export function setCurrentArrangementId(id) { currentArrangementId = id; }

export let copiedMeasureData = null;
export function setCopiedMeasureData(data) { copiedMeasureData = data; }

export let selectionClipboard = null;
export function setSelectionClipboard(data) {
    selectionClipboard = data;
    window.selectionClipboard = data;
}

export const scoreState = {
    title: "Novo arranjo",
    bpm: 90,
    measuresCount: 1,
    beatsPerMeasure: 4,
    subdivisions: 4,
    repeats: [],
    selectedSelection: [],
    loopState: {
        active: false,
        startMeasure: 0,
        endMeasure: 1
    },
    activeTool: {
        instrumentId: "surdo1",
        strokeType: "pele-aberto"
    },
    instruments: [
        {
            id: "surdo1",
            name: "Surdo 1ª",
            iconSvg: "assets/icons/inst-surdo1.svg",
            volume: 50,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "surdo2",
            name: "Surdo 2ª",
            iconSvg: "assets/icons/inst-surdo2.svg",
            volume: 50,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "surdo3",
            name: "Surdo 3ª",
            iconSvg: "assets/icons/inst-surdo3.svg",
            volume: 50,
            availableStrokes: ["pele-aberto", "surdo-abafado"],
            pattern: []
        },
        {
            id: "caixa",
            name: "Caixa",
            iconSvg: "assets/icons/inst-caixa.svg",
            volume: 50,
            availableStrokes: ["pele-aberto", "fantasma", "aro", "rimshot", "rufo"],
            pattern: []
        },
        {
            id: "repique",
            name: "Repique",
            iconSvg: "assets/icons/inst-repique.svg",
            volume: 50,
            availableStrokes: ["pele-aberto", "rimshot", "aro", "slap", "rufo"],
            pattern: []
        },
        {
            id: "chocalho",
            name: "Chocalho",
            iconSvg: "assets/icons/inst-chocalho.svg",
            volume: 50,
            availableStrokes: ["chocalho-frente", "chocalho-tras"],
            pattern: []
        },
        {
            id: "tamborim",
            name: "Tamborim",
            iconSvg: "assets/icons/inst-tamborim.svg",
            volume: 50,
            availableStrokes: ["tamborim-cima", "tamborim-baixo"],
            pattern: []
        }
    ]
};

export function createEmptyMeasure() {
    return new Array(scoreState.beatsPerMeasure * scoreState.subdivisions).fill(null);
}