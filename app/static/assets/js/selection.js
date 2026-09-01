import { scoreState } from './state.js';
import { renderScore } from './ui/renderScore.js';

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

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    let initialContainer = null;
    let autoScrollInterval = null;

    function updateMarqueeAndSelection() {
        const rectLeft = Math.min(startX, currentX);
        const rectTop = Math.min(startY, currentY);
        const rectWidth = Math.abs(currentX - startX);
        const rectHeight = Math.abs(currentY - startY);

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
    }

    function checkAndScroll() {
        if (!isDraggingMarquee || !scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const threshold = 60;
        const speed = 15;

        if (currentX > containerRect.right - threshold) {
            scrollContainer.scrollLeft += speed;
            updateMarqueeAndSelection();
        } else if (currentX < containerRect.left + threshold) {
            scrollContainer.scrollLeft -= speed;
            updateMarqueeAndSelection();
        }
    }

    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;

        if (
            e.target.closest(".note-slot") ||
            e.target.closest(".beat-beams") ||
            e.target.closest("button") ||
            e.target.closest("input") ||
            e.target.closest("select") ||
            e.target.closest(".dropdown-menu") ||
            e.target.closest(".repeat-control-pill") ||
            e.target.closest("#loop-bar")
        ) {
            return;
        }

        const measureContainer = e.target.closest(".measure-container");

        if (!measureContainer) {
            if (scoreState.selectedSelection && scoreState.selectedSelection.length > 0) {
                scoreState.selectedSelection = [];
                renderScore();
            }
            return;
        }

        isMouseDown = true;
        isDraggingMarquee = false;

        startX = e.pageX;
        startY = e.pageY;
        currentX = e.clientX;
        currentY = e.clientY;

        initialContainer = measureContainer;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isMouseDown) return;

        currentX = e.clientX;
        currentY = e.clientY;

        const deltaX = Math.abs(e.pageX - startX);
        const deltaY = Math.abs(e.clientY - startY);

        if (!isDraggingMarquee && (deltaX > 5 || deltaY > 5)) {
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
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }

        if (!isMouseDown) return;

        if (!isDraggingMarquee && initialContainer) {
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
        }

        isMouseDown = false;
        isDraggingMarquee = false;
        initialContainer = null;
        marquee.style.display = "none";
    });
}