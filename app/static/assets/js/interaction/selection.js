import { scoreState } from '../core/state.js';
import { renderScore, renderSelectionToolbar } from '../ui/renderScore.js';

export function setupSelectionEvents() {
    const scoreGrid = document.getElementById("score-grid");
    if (!scoreGrid) return;

    const scrollContainer = scoreGrid.parentElement;

    let marquee = document.getElementById("selection-marquee");
    if (!marquee) {
        marquee = document.createElement("div");
        marquee.id = "selection-marquee";
        document.body.appendChild(marquee);
    }

    let isMouseDown = false;
    let isDraggingMarquee = false;

    // Coordenadas absolutas (para o retângulo) e relativas (para o scroll)
    let startPageX = 0;
    let startPageY = 0;
    let currentPageX = 0;
    let currentPageY = 0;
    let currentClientX = 0;

    let initialContainer = null;
    let autoScrollInterval = null;

    function updateMarqueeAndSelection() {
        const rectLeft = Math.min(startPageX, currentPageX);
        const rectTop = Math.min(startPageY, currentPageY);
        const rectWidth = Math.abs(currentPageX - startPageX);
        const rectHeight = Math.abs(currentPageY - startPageY);

        marquee.style.left = `${rectLeft}px`;
        marquee.style.top = `${rectTop}px`;
        marquee.style.width = `${rectWidth}px`;
        marquee.style.height = `${rectHeight}px`;

        const marqueeBox = marquee.getBoundingClientRect();
        const newSelection = [];
        const measureContainers = scoreGrid.querySelectorAll(".measure-container");

        measureContainers.forEach((container) => {
            const box = container.getBoundingClientRect();

            const intersects = !(
                box.right < marqueeBox.left ||
                box.left > marqueeBox.right ||
                box.bottom < marqueeBox.top ||
                box.top > marqueeBox.bottom
            );

            if (intersects) {
                const instId = container.dataset.instId;
                const measureIndex = parseInt(container.dataset.measureIndex, 10);
                if (instId && !isNaN(measureIndex)) {
                    newSelection.push({ instId, measureIndex });
                }
            }
        });

        scoreState.selectedSelection = newSelection;

        measureContainers.forEach((container) => {
            const instId = container.dataset.instId;
            const measureIndex = parseInt(container.dataset.measureIndex, 10);

            const isSelected = scoreState.selectedSelection.some(
                s => s.instId === instId && s.measureIndex === measureIndex
            );

            container.classList.toggle("selected", isSelected);
        });

        renderSelectionToolbar();
    }

    function checkAndScroll() {
        if (!isDraggingMarquee || !scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const threshold = 60;
        const speed = 15;

        if (currentClientX > containerRect.right - threshold) {
            scrollContainer.scrollLeft += speed;
            updateMarqueeAndSelection();
        } else if (currentClientX < containerRect.left + threshold) {
            scrollContainer.scrollLeft -= speed;
            updateMarqueeAndSelection();
        }
    }

    function cancelMarqueeDrag() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }

        isMouseDown = false;
        isDraggingMarquee = false;
        initialContainer = null;
        marquee.style.display = "none";
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isDraggingMarquee) {
            e.preventDefault();
            cancelMarqueeDrag();
            scoreState.selectedSelection = [];
            renderScore();
        }
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;

        if (
            e.target.closest("#selection-quick-toolbar") ||
            e.target.closest(".note-slot") ||
            e.target.closest(".beat-beams") ||
            e.target.closest("button") ||
            e.target.closest("input") ||
            e.target.closest("select") ||
            e.target.closest(".dropdown-menu") ||
            e.target.closest(".repeat-control-pill") ||
            e.target.closest("#loop-bar") ||
            e.target.closest(".playhead-lane") ||
            e.target.closest(".instruments-sidebar") ||
            e.target.closest(".instrument-card")
        ) {
            return;
        }

        const isTargetInWorkspace = e.target.closest("#score-grid") || e.target.closest(".score-content") || e.target.closest(".score-viewport");
        if (!isTargetInWorkspace) return;

        const measureContainer = e.target.closest(".measure-container");

        isMouseDown = true;
        isDraggingMarquee = false;

        startPageX = e.pageX;
        startPageY = e.pageY;
        currentPageX = e.pageX;
        currentPageY = e.pageY;
        currentClientX = e.clientX;

        initialContainer = measureContainer;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isMouseDown) return;

        currentPageX = e.pageX;
        currentPageY = e.pageY;
        currentClientX = e.clientX;

        const deltaX = Math.abs(currentPageX - startPageX);
        const deltaY = Math.abs(currentPageY - startPageY);

        if (!isDraggingMarquee && (deltaX > 15 || deltaY > 15)) {
            isDraggingMarquee = true;
            marquee.style.display = "block";

            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                scoreState.selectedSelection = [];
            }

            if (autoScrollInterval) clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(checkAndScroll, 20);
        }

        if (isDraggingMarquee) {
            updateMarqueeAndSelection();
        }
    });

    document.addEventListener("mouseup", (e) => {
        if (!isMouseDown) return;

        if (!isDraggingMarquee) {
            if (initialContainer) {
                const instId = initialContainer.dataset.instId;
                const measureIndex = parseInt(initialContainer.dataset.measureIndex, 10);

                if (instId && !isNaN(measureIndex)) {
                    if (!scoreState.selectedSelection) scoreState.selectedSelection = [];

                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        scoreState.selectedSelection = [{ instId, measureIndex }];
                    } else {
                        const existsIndex = scoreState.selectedSelection.findIndex(
                            s => s.instId === instId && s.measureIndex === measureIndex
                        );

                        if (existsIndex !== -1) {
                            scoreState.selectedSelection.splice(existsIndex, 1);
                        } else {
                            scoreState.selectedSelection.push({ instId, measureIndex });
                        }
                    }
                    renderScore();
                }
            } else {
                if (scoreState.selectedSelection && scoreState.selectedSelection.length > 0) {
                    scoreState.selectedSelection = [];
                    renderScore();
                }
            }
        }

        cancelMarqueeDrag();
    });
}