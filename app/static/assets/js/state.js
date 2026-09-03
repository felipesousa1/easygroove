import { TIME_SIGNATURES, INSTRUMENT_PRESETS } from './constants.js';

export let currentArrangementId = null;
export function setCurrentArrangementId(id) { currentArrangementId = id; }

export let copiedMeasureData = null;
export function setCopiedMeasureData(data) { copiedMeasureData = data; }

export let selectionClipboard = null;
export function setSelectionClipboard(data) {
    selectionClipboard = data;
    window.selectionClipboard = data;
}

// Controle de alterações não salvas
export let isDirty = false;
export function setIsDirty(value) {
    isDirty = value;
}

export const scoreState = {
    title: "Novo arranjo",
    bpm: 90,
    timeSignature: "4/4",
    measuresCount: 1,
    selectedSelection: [],
    measuresConfig: [
        { timeSignature: "4/4" }
    ],
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
            availableStrokes: [...INSTRUMENT_PRESETS.surdo1.availableStrokes],
            pattern: []
        },
        {
            id: "surdo2",
            name: "Surdo 2ª",
            iconSvg: "assets/icons/inst-surdo2.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.surdo2.availableStrokes],
            pattern: []
        },
        {
            id: "surdo3",
            name: "Surdo 3ª",
            iconSvg: "assets/icons/inst-surdo3.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.surdo3.availableStrokes],
            pattern: []
        },
        {
            id: "caixa",
            name: "Caixa",
            iconSvg: "assets/icons/inst-caixa.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.caixa.availableStrokes],
            pattern: []
        },
        {
            id: "repique",
            name: "Repique",
            iconSvg: "assets/icons/inst-repique.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.repique.availableStrokes],
            pattern: []
        },
        {
            id: "chocalho",
            name: "Chocalho",
            iconSvg: "assets/icons/inst-chocalho.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.chocalho.availableStrokes],
            pattern: []
        },
        {
            id: "tamborim",
            name: "Tamborim",
            iconSvg: "assets/icons/inst-tamborim.svg",
            volume: 50,
            availableStrokes: [...INSTRUMENT_PRESETS.tamborim.availableStrokes],
            pattern: []
        }
    ]
};

// Retorna a estrutura de compasso em Objetos de Tempo
export function createEmptyMeasureForSig(timeSigKey = scoreState.timeSignature) {
    const config = TIME_SIGNATURES[timeSigKey] || TIME_SIGNATURES["4/4"];
    const measureData = [];
    for (let b = 0; b < config.beats; b++) {
        measureData.push({
            subdivisions: config.subdivisions,
            notes: new Array(config.subdivisions).fill(null)
        });
    }
    return measureData;
}

// Manter essa função para retrocompatibilidade com o estado padrão "4/4"
export function createEmptyMeasure() {
    return createEmptyMeasureForSig(scoreState.timeSignature || "4/4");
}