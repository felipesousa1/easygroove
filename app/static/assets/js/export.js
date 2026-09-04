import { scoreState } from './state.js';
import { TIME_SIGNATURES } from './constants.js';
import { createBeamsSVG, getStrokeVisual } from './ui/beams.js';
import { showToast } from './ui/toast.js';
import { exportScoreToAudio } from './audioExport.js';

export function exportScoreToJSON() {
    try {
        const { loopState, selectedSelection, ...cleanScoreData } = scoreState;
        const jsonString = JSON.stringify(cleanScoreData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const fileName = (scoreState.title || "arranjos-easygroove")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${fileName}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        if (typeof showToast === "function") showToast("JSON exportado com sucesso!");
    } catch (err) {
        console.error("Erro ao exportar JSON:", err);
    }
}

let currentPdfLayout = "system"; // "system" (por compasso) ou "instrument" (por instrumento)

// Auxiliar para gerar o HTML de um compasso específico de um instrumento
function generateMeasureHTML(inst, m) {
    const currentSig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
    const config = TIME_SIGNATURES[currentSig] || TIME_SIGNATURES["4/4"];
    const pattern = inst.pattern[m] || [];

    const activeRepeat = scoreState.repeats?.find(r => m >= r.start && m <= r.end);
    const isRepeatEnd = activeRepeat && activeRepeat.end === m;
    const isRepeatStart = activeRepeat && activeRepeat.start === m;

    let beatsHTML = "";
    for (let b = 0; b < config.beats; b++) {
        const beatData = pattern[b] || { subdivisions: config.subdivisions, notes: new Array(config.subdivisions).fill(null) };
        const beatSubdivs = beatData.subdivisions;

        let slotsHTML = "";
        for (let s = 0; s < beatSubdivs; s++) {
            const stroke = beatData.notes[s] || null;
            const visual = getStrokeVisual(stroke);
            slotsHTML += `<div class="note-slot ${visual.className}" style="flex: 1; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">${visual.content}</div>`;
        }

        beatsHTML += `
            <div class="beat-group" style="position: relative; width: 68px; flex-shrink: 0; display: flex; flex-direction: column;">
                ${createBeamsSVG(beatSubdivs)}
                <div class="slots-bar" style="display: flex; height: 20px; background: rgba(0,0,0,0.03); border-radius: 3px; padding: 1px;">
                    ${slotsHTML}
                </div>
            </div>
        `;
    }

    // Elementos visuais dos pontos de ritornelo (:|| e ||:)
    const repeatStartSymbol = isRepeatStart ? `
        <div style="position: absolute; left: 2px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 3px; z-index: 2;">
            <div style="width: 3px; height: 3px; background-color: #31006f; border-radius: 50%;"></div>
            <div style="width: 3px; height: 3px; background-color: #31006f; border-radius: 50%;"></div>
        </div>
    ` : '';

    const repeatEndSymbol = isRepeatEnd ? `
        <div style="position: absolute; right: 2px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 3px; z-index: 2;">
            <div style="width: 3px; height: 3px; background-color: #31006f; border-radius: 50%;"></div>
            <div style="width: 3px; height: 3px; background-color: #31006f; border-radius: 50%;"></div>
        </div>
    ` : '';

    return `
        <div class="pdf-measure" style="
            position: relative;
            display: flex;
            gap: 2px;
            padding: 3px ${isRepeatEnd ? '8px' : '4px'} 3px ${isRepeatStart ? '8px' : '4px'};
            border-right: ${isRepeatEnd ? '4px double #31006f' : '1px solid #cbd5e1'};
            border-left: ${isRepeatStart ? '4px double #31006f' : 'none'};
            background: #ffffff;
            box-sizing: border-box;
        ">
            ${repeatStartSymbol}
            ${beatsHTML}
            ${repeatEndSymbol}
        </div>
    `;
}

// Auxiliar para gerar o card compacto do instrumento
function generateInstCardHTML(inst) {
    return `
        <div style="width: 65px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 2px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc;">
            <img src="${inst.iconSvg}" style="width: 18px; height: 18px; margin-bottom: 2px;" alt="">
            <span style="font-weight: 700; font-size: 0.7rem; text-align: center; color: #334155; line-height: 1.1;">${inst.name}</span>
        </div>
    `;
}

// MODO 1: Grade Geral por Compasso (Sistemas de 2 compassos)
function renderBySystem(measuresPerSystem = 2) {
    let html = "";
    const activeInstruments = scoreState.instruments.filter(inst => !inst.hidden);

    for (let m = 0; m < scoreState.measuresCount; m += measuresPerSystem) {
        const startMeasure = m;
        const endMeasure = Math.min(m + measuresPerSystem, scoreState.measuresCount);

        let systemRows = "";
        activeInstruments.forEach(inst => {
            let measuresHTML = "";
            for (let i = startMeasure; i < endMeasure; i++) {
                measuresHTML += generateMeasureHTML(inst, i);
            }

            systemRows += `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    ${generateInstCardHTML(inst)}
                    <div style="display: flex; gap: 4px; flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #ffffff;">
                        ${measuresHTML}
                    </div>
                </div>
            `;
        });

        html += `
            <div class="pdf-system-block" style="margin-bottom: 16px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; break-inside: avoid;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Compassos ${startMeasure + 1} - ${endMeasure}</div>
                ${systemRows}
            </div>
        `;
    }
    return html;
}

// MODO 2: Por Instrumento (Particella contínua)
function renderByInstrument() {
    let html = "";
    const activeInstruments = scoreState.instruments.filter(inst => !inst.hidden);

    activeInstruments.forEach(inst => {
        let measuresHTML = "";
        for (let m = 0; m < scoreState.measuresCount; m++) {
            measuresHTML += generateMeasureHTML(inst, m);
        }

        html += `
            <div class="pdf-inst-row" style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                ${generateInstCardHTML(inst)}
                <div style="display: flex; flex-wrap: wrap; gap: 4px; flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #ffffff;">
                    ${measuresHTML}
                </div>
            </div>
        `;
    });
    return html;
}

export function exportScoreToPDF() {
    try {
        const previewModal = document.getElementById("pdf-preview-modal");
        const previewBody = document.getElementById("pdf-preview-body");

        if (!previewModal || !previewBody) return;

        const printArea = document.createElement("div");
        printArea.className = "pdf-print-container";
        printArea.style.cssText = `
            width: 750px;
            padding: 12px;
            background: #ffffff;
            font-family: sans-serif;
            color: #1e293b;
            box-sizing: border-box;
        `;

        const headerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #31006f; padding-bottom: 6px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <img src="assets/icons/logo.svg" style="width: 20px; height: 20px;" alt="Logo">
                    <span style="font-weight: 800; font-size: 1rem; color: #31006f;">EasyGroove</span>
                </div>
                <span style="font-size: 0.75rem; color: #64748b;">Partitura de Ensaio</span>
            </div>
            <h1 style="text-align: center; font-size: 1.3rem; font-weight: 800; margin: 0 0 14px 0; color: #0f172a;">${scoreState.title || "Arranjo Rítmico"}</h1>
        `;

        const contentHTML = (currentPdfLayout === "system") ? renderBySystem(2) : renderByInstrument();

        printArea.innerHTML = headerHTML + contentHTML;

        previewBody.innerHTML = "";
        previewBody.appendChild(printArea);
        previewModal.classList.add("active");

        // Eventos dos Botões de Troca de Layout
        const btnSystem = document.getElementById("btn-layout-system");
        const btnInstrument = document.getElementById("btn-layout-instrument");

        if (btnSystem && btnInstrument) {
            btnSystem.onclick = () => {
                currentPdfLayout = "system";
                btnSystem.style.background = "#ffffff";
                btnSystem.style.color = "#31006f";
                btnInstrument.style.background = "transparent";
                btnInstrument.style.color = "#64748b";
                exportScoreToPDF();
            };

            btnInstrument.onclick = () => {
                currentPdfLayout = "instrument";
                btnInstrument.style.background = "#ffffff";
                btnInstrument.style.color = "#31006f";
                btnSystem.style.background = "transparent";
                btnSystem.style.color = "#64748b";
                exportScoreToPDF();
            };
        }

        const btnClosePreview = document.getElementById("btn-close-pdf-preview");
        if (btnClosePreview) {
            btnClosePreview.onclick = () => {
                previewModal.classList.remove("active");
            };
        }

    } catch (err) {
        console.error("Erro ao gerar Preview do PDF:", err);
    }
}

export function setupExportEvents() {
    const btnPopover = document.getElementById("btn-export-popover");
    const dropdown = document.getElementById("export-dropdown");

    if (!btnPopover || !dropdown) return;

    btnPopover.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== btnPopover) {
            dropdown.classList.remove("active");
        }
    });

    document.getElementById("btn-export-pdf")?.addEventListener("click", () => {
        dropdown.classList.remove("active");
        exportScoreToPDF();
    });

    document.getElementById("btn-export-json")?.addEventListener("click", () => {
        dropdown.classList.remove("active");
        exportScoreToJSON();

    });
    document.getElementById("btn-export-audio")?.addEventListener("click", () => {
        dropdown.classList.remove("active");
        exportScoreToAudio();
    });
}