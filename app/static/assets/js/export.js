import { scoreState } from './state.js';
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

    document.getElementById("btn-export-json")?.addEventListener("click", () => {
        dropdown.classList.remove("active");
        exportScoreToJSON();
    });

    document.getElementById("btn-export-audio")?.addEventListener("click", () => {
        dropdown.classList.remove("active");
        exportScoreToAudio();
    });
}