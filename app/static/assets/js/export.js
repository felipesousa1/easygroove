import { scoreState } from './state.js';
import { TIME_SIGNATURES } from './constants.js';
import { createBeamsSVG, getStrokeVisual } from './ui/beams.js';
import { showToast } from './ui/toast.js';

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

export function exportScoreToPDF() {
    // Checa diretamente no escopo global do navegador
    const pdfLib = window.html2pdf || (typeof html2pdf !== 'undefined' ? html2pdf : null);

    if (!pdfLib) {
        alert("A biblioteca html2pdf ainda está carregando ou foi bloqueada pelo navegador.");
        return;
    }

    try {
        const printArea = document.createElement("div");
        printArea.className = "pdf-print-container";
        printArea.style.cssText = `
            width: 750px;
            padding: 24px;
            background: #ffffff;
            font-family: sans-serif;
            color: #1e293b;
        `;

        const headerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #31006f; padding-bottom: 12px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="assets/icons/logo.svg" style="width: 28px; height: 28px;" alt="Logo">
                    <span style="font-weight: 800; font-size: 1.2rem; color: #31006f;">EasyGroove</span>
                </div>
                <span style="font-size: 0.85rem; color: #64748b;">Partitura de Ensaio</span>
            </div>
            <h1 style="text-align: center; font-size: 1.8rem; font-weight: 800; margin: 0 0 24px 0; color: #0f172a;">${scoreState.title || "Arranjo Rítmico"}</h1>
        `;

        let instrumentsHTML = "";

        scoreState.instruments.forEach(inst => {
            if (inst.hidden) return;

            let measuresHTML = "";

            for (let m = 0; m < scoreState.measuresCount; m++) {
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
                        slotsHTML += `<div class="note-slot ${visual.className}" style="flex: 1; height: 24px; display: flex; align-items: center; justify-content: center;">${visual.content}</div>`;
                    }

                    beatsHTML += `
                        <div class="beat-group" style="position: relative; flex: 1; display: flex; flex-direction: column;">
                            ${createBeamsSVG(beatSubdivs)}
                            <div class="slots-bar" style="display: flex; height: 28px; background: rgba(0,0,0,0.03); border-radius: 4px; padding: 2px;">
                                ${slotsHTML}
                            </div>
                        </div>
                    `;
                }

                measuresHTML += `
                    <div class="pdf-measure" style="
                        position: relative;
                        display: flex;
                        gap: 4px;
                        padding: 8px;
                        border-right: ${isRepeatEnd ? '4px double #31006f' : '1.5px solid #cbd5e1'};
                        border-left: ${isRepeatStart ? '4px double #31006f' : 'none'};
                        background: #ffffff;
                        break-inside: avoid;
                    ">
                        ${beatsHTML}
                    </div>
                `;
            }

            instrumentsHTML += `
                <div class="pdf-inst-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; break-inside: avoid;">
                    <div style="width: 110px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                        <img src="${inst.iconSvg}" style="width: 28px; height: 28px; margin-bottom: 4px;" alt="">
                        <span style="font-weight: 700; font-size: 0.85rem; text-align: center; color: #334155;">${inst.name}</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; flex: 1; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #ffffff;">
                        ${measuresHTML}
                    </div>
                </div>
            `;
        });

        printArea.innerHTML = headerHTML + instrumentsHTML;
        document.body.appendChild(printArea);

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `${(scoreState.title || "partitura").toLowerCase().replace(/\s+/g, '-')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        pdfLib().set(opt).from(printArea).save().then(() => {
            document.body.removeChild(printArea);
            if (typeof showToast === "function") showToast("PDF gerado com sucesso!");
        });

    } catch (err) {
        console.error("Erro ao gerar PDF:", err);
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
}