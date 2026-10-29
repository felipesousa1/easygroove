import { showToast } from './toast.js';

const TOUR_SLIDES = [
    // SLIDE 1: CABEÇALHO PRINCIPAL
    {
        title: "1. Cabeçalho Principal",
        navPosition: "bottom",
        targets: [
            {
                selector: "#btn-main-menu",
                title: "Menu Principal",
                text: "Crie um novo arranjo, abra sua biblioteca, importe e exporte arquivos e ajuste as opções do editor.",
                tip: "Cada opção do menu mostra o seu atalho ao lado do nome."
            },
            {
                selector: "#title-display",
                title: "Título do Arranjo",
                text: "Dê um nome ao seu arranjo. Dê um duplo clique no título para renomear.",
                tip: "Atalho: Shift + R."
            },
            {
                selector: ".header-center",
                title: "Reprodução e Metrônomo",
                text: "Toque, pause e pare o arranjo, ative o loop e ajuste o metrônomo. A setinha ao lado do loop abre as opções do trecho repetido: modo livre e zerar loop.",
                tip: "Atalhos: P (play), S (stop), L (loop) e Shift + L (zerar loop)."
            },
            {
                selector: "#btn-save-project, #btn-export-popover",
                title: "Salvar e Exportar",
                text: "Salve o arranjo na sua conta ou exporte em áudio (.wav) ou arquivo (.json).",
                tip: "Atalhos: Ctrl + S (salvar) e Shift + E (exportar)."
            }
        ]
    },

    // SLIDE 2: TOOLBAR
    {
        title: "2. Barra de Ferramentas",
        navPosition: "top", // Move a barra de navegação para o topo, já que a toolbar fica embaixo
        targets: [
            {
                selector: ".floating-editor-bar",
                title: "Instrumento, Toques e Histórico",
                text: "Escolha o instrumento ativo e o tipo de toque (pele, abafado, aro, rimshot...). Use desfazer e refazer para voltar atrás em qualquer edição.",
                tip: "Teclas 1 a 9 trocam o toque, 0 apaga a nota. Ctrl + Z desfaz e Ctrl + Y refaz."
            }
        ]
    },

    // SLIDE 3: ESTRUTURA EXTERNA DA GRADE
    {
        title: "3. Instrumentos e Compassos",
        navPosition: "bottom",
        targets: [
            {
                selector: "#instruments-sidebar-list",
                title: "Instrumentos",
                text: "Cada card controla uma linha: volume, mudo, ocultar, duplicar e renomear. Arraste um card para reordenar as linhas.",
                tip: "Clique no valor do volume para digitar a porcentagem."
            },
            {
                selector: "#measures-track, .playhead-lane",
                title: "Compassos e Playhead",
                text: "Veja a numeração e a métrica de cada compasso, crie ritornelos e abra o menu do compasso. Clique ou arraste a cabeça do playhead abaixo deles para mover o ponto de reprodução.",
                tip: "Shift + N adiciona um compasso ao final."
            }
        ]
    },

    // SLIDE 4: GRADE INTERNA DE EDIÇÃO
    {
        title: "4. Edição das Notas",
        navPosition: "bottom",
        targets: [
            {
                selector: "#score-grid",
                title: "Escrevendo e Selecionando",
                text: "Clique ou arraste sobre as notas para desenhar com o toque escolhido. Arraste em uma área vazia para selecionar vários compassos.",
                tip: "Ctrl + C copia, Ctrl + X recorta, Ctrl + V cola e Del limpa a seleção."
            },
            {
                selector: ".beat-group",
                first: true,
                title: "Subdivisão do Tempo",
                text: "Clique nas traves acima de um tempo para mudar a sua subdivisão (2, 3, 4, 6 ou 8 notas).",
                tip: "A métrica de cada compasso pode ser alterada no seu menu."
            }
        ]
    }
];

const TOUR_MARGIN = 16; // distância mínima das bordas da tela
const TOUR_GAP = 18; // distância mínima entre o destaque e o balão
const TOUR_SAMPLE_STEP = 30; // passo da busca de posições para os balões

let currentSlideIndex = 0;

export function setupHelpEvents() {
    const helpModal = document.getElementById("help-modal");
    const btnHelpFloating = document.querySelector(".floating-help-btn");
    const btnCloseModal = document.getElementById("btn-close-help-modal");

    if (!helpModal) return;

    btnHelpFloating?.addEventListener("click", () => helpModal.classList.add("active"));
    btnCloseModal?.addEventListener("click", () => helpModal.classList.remove("active"));

    document.querySelectorAll(".help-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabTarget = btn.dataset.tab;
            document.querySelectorAll(".help-tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".help-tab-panel").forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(`help-tab-${tabTarget}`)?.classList.add("active");
        });
    });

    document.getElementById("btn-start-interactive-tour")?.addEventListener("click", () => {
        helpModal.classList.remove("active");
        startTour();
    });

    // Reposiciona os balões se a janela mudar de tamanho durante o tour
    window.addEventListener("resize", () => {
        if (document.getElementById("tour-overlay")?.classList.contains("active")) renderSlide();
    });

    document.getElementById("btn-tour-next")?.addEventListener("click", nextSlide);
    document.getElementById("btn-tour-prev")?.addEventListener("click", prevSlide);
    document.getElementById("btn-tour-skip")?.addEventListener("click", endTour);

    document.getElementById("contact-feedback-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (typeof showToast === "function") showToast("Obrigado pelo feedback!");
        document.getElementById("feedback-message-input").value = "";
        helpModal.classList.remove("active");
    });
}

function startTour() {
    currentSlideIndex = 0;
    const tourOverlay = document.getElementById("tour-overlay");
    if (tourOverlay) {
        tourOverlay.classList.add("active");
        renderSlide();
    }
}

function renderSlide() {
    const slide = TOUR_SLIDES[currentSlideIndex];
    const maskHoles = document.getElementById("tour-mask-holes");
    const strokeBoxes = document.getElementById("tour-stroke-boxes");
    const tooltipsContainer = document.getElementById("tour-tooltips-container");
    const navBar = document.querySelector(".tour-navigation-bar");

    if (!maskHoles || !strokeBoxes || !tooltipsContainer) return;

    maskHoles.innerHTML = "";
    strokeBoxes.innerHTML = "";
    tooltipsContainer.innerHTML = "";

    document.getElementById("tour-slide-title").textContent = slide.title;
    document.getElementById("tour-slide-badge").textContent = `${currentSlideIndex + 1} / ${TOUR_SLIDES.length}`;

    const btnPrev = document.getElementById("btn-tour-prev");
    const btnNext = document.getElementById("btn-tour-next");

    btnPrev.style.display = currentSlideIndex === 0 ? "none" : "inline-block";
    btnNext.textContent = currentSlideIndex === TOUR_SLIDES.length - 1 ? "Concluir" : "Próximo";

    if (navBar) {
        if (slide.navPosition === "top") {
            navBar.style.bottom = "auto";
            navBar.style.top = "20px";
        } else {
            navBar.style.top = "auto";
            navBar.style.bottom = "20px";
        }
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // 1) Calcula e desenha os destaques de todos os alvos do slide
    const entries = [];
    slide.targets.forEach(target => {
        let els = Array.from(document.querySelectorAll(target.selector)).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        });
        if (target.first) els = els.slice(0, 1);
        if (els.length === 0) return;

        // Caixa que engloba todos os elementos do alvo, recortada para caber na tela
        let box = els.map(el => el.getBoundingClientRect()).reduce((acc, r) => ({
            left: Math.min(acc.left, r.left),
            top: Math.min(acc.top, r.top),
            right: Math.max(acc.right, r.right),
            bottom: Math.max(acc.bottom, r.bottom)
        }));

        const padding = 6;
        const highlight = makeRect(
            Math.max(0, box.left - padding),
            Math.max(0, box.top - padding),
            Math.min(viewW, box.right + padding),
            Math.min(viewH, box.bottom + padding)
        );

        const hole = document.createElementNS(svgNS, "rect");
        hole.setAttribute("x", highlight.left);
        hole.setAttribute("y", highlight.top);
        hole.setAttribute("width", highlight.width);
        hole.setAttribute("height", highlight.height);
        hole.setAttribute("fill", "black");
        hole.setAttribute("rx", "8");
        maskHoles.appendChild(hole);

        const stroke = hole.cloneNode();
        stroke.setAttribute("fill", "none");
        stroke.setAttribute("stroke", "#ffffff");
        stroke.setAttribute("stroke-width", "2");
        strokeBoxes.appendChild(stroke);

        entries.push({ target, highlight });
    });

    // 2) Posiciona os balões sem sobrepor destaques, barra de navegação ou outros balões
    const obstacles = entries.map(e => e.highlight);
    if (navBar) {
        const nav = navBar.getBoundingClientRect();
        obstacles.push(makeRect(nav.left - 12, nav.top - 12, nav.right + 12, nav.bottom + 12));
    }
    const placedCards = [];

    entries.forEach(({ target, highlight }) => {
        const card = document.createElement("div");
        card.className = "tour-tooltip-card";
        card.innerHTML = `
            <span class="tour-tooltip-title">${target.title}</span>
            <div class="tour-tooltip-text">${target.text}</div>
            ${target.tip ? `<div class="tour-tooltip-tip"><strong>💡 Dica:</strong> ${target.tip}</div>` : ''}
        `;
        card.style.visibility = "hidden";
        tooltipsContainer.appendChild(card);

        const placement = findCardPlacement(card.offsetWidth, card.offsetHeight, highlight, obstacles, placedCards, viewW, viewH);
        card.style.left = `${placement.rect.left}px`;
        card.style.top = `${placement.rect.top}px`;
        card.style.visibility = "visible";

        placedCards.push(placement.rect);
        drawConnector(svgNS, strokeBoxes, placement.rect, highlight);
    });
}

function makeRect(left, top, right, bottom) {
    return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function overlapArea(a, b) {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

// Escolhe a melhor posição para o balão: ao redor do destaque (ou dentro dele, se for enorme),
// sem sobreposição e o mais próximo possível do centro da tela
function findCardPlacement(w, h, target, obstacles, placedCards, viewW, viewH) {
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const minOverlap = Math.min(60, target.width, target.height);
    const bounds = makeRect(TOUR_MARGIN, TOUR_MARGIN, viewW - TOUR_MARGIN, viewH - TOUR_MARGIN);
    const candidates = [];

    const addCandidate = (left, top, kind, gap) => {
        candidates.push({ rect: makeRect(left, top, left + w, top + h), kind, gap });
    };

    // Valores de 0 a max em passos fixos, mais o valor mais próximo do alvo ideal
    const sample = (min, max, ideal) => {
        if (min > max) return [];
        const values = [clamp(ideal, min, max)];
        for (let v = min; v <= max; v += TOUR_SAMPLE_STEP) values.push(v);
        return values;
    };

    // Ao redor do destaque, em várias distâncias e deslocamentos ao longo da borda
    const xs = sample(
        Math.max(bounds.left, target.left - w + minOverlap),
        Math.min(bounds.right - w, target.right - minOverlap),
        centerX - w / 2
    );
    const ys = sample(
        Math.max(bounds.top, target.top - h + minOverlap),
        Math.min(bounds.bottom - h, target.bottom - minOverlap),
        centerY - h / 2
    );

    for (let gap = TOUR_GAP; gap <= Math.max(viewW, viewH); gap += TOUR_SAMPLE_STEP) {
        const below = target.bottom + gap;
        const above = target.top - gap - h;
        const right = target.right + gap;
        const left = target.left - gap - w;

        if (below + h <= bounds.bottom) xs.forEach(x => addCandidate(x, below, "below", gap));
        if (above >= bounds.top) xs.forEach(x => addCandidate(x, above, "above", gap));
        if (right + w <= bounds.right) ys.forEach(y => addCandidate(right, y, "right", gap));
        if (left >= bounds.left) ys.forEach(y => addCandidate(left, y, "left", gap));
    }

    // Destaques muito grandes: balão dentro deles, na parte visível
    if (target.width > w + 40 && target.height > h + 40) {
        const insideXs = sample(target.left + 20, target.right - w - 20, target.left + target.width / 2 - w / 2);
        const insideYs = sample(target.top + 20, target.bottom - h - 20, target.top + target.height / 2 - h / 2);
        insideXs.forEach(x => insideYs.forEach(y => {
            if (x >= bounds.left && x + w <= bounds.right && y >= bounds.top && y + h <= bounds.bottom) {
                addCandidate(x, y, "inside", 0);
            }
        }));
    }

    const others = obstacles.filter(o => o !== target);
    const taken = [...others, ...placedCards];

    let best = null;
    candidates.forEach(c => {
        // Fora dos limites após o ajuste, ou ainda encostado no próprio destaque (exceto "inside")
        const overlapsTarget = c.kind !== "inside" && rectsOverlap(c.rect, target);
        const overlap = taken.reduce((sum, o) => sum + overlapArea(c.rect, o), 0) + (overlapsTarget ? w * h : 0);

        const cx = c.rect.left + w / 2;
        const cy = c.rect.top + h / 2;
        const distanceToCenter = Math.hypot(cx - centerX, cy - centerY);
        let penalty = (c.kind === "inside" ? 80 : 0) + c.gap * 0.25;

        // Evita que a linha de ligação atravesse outro balão já posicionado
        const connector = c.kind === "inside" ? null : getConnector(c.rect, target);
        if (connector) {
            const [x1, y1] = connector.from;
            const [x2, y2] = connector.to;
            const line = makeRect(Math.min(x1, x2) - 1, Math.min(y1, y2) - 1, Math.max(x1, x2) + 1, Math.max(y1, y2) + 1);
            if (placedCards.some(card => rectsOverlap(line, card))) penalty += 400;
        }

        // Qualquer sobreposição pesa muito mais que a distância ao centro
        c.score = overlap * 1000 + distanceToCenter + penalty;
        if (!best || c.score < best.score) best = c;
    });

    return best;
}

// Pontos da linha que liga o balão ao destaque (null quando estão encostados ou na diagonal)
function getConnector(card, target) {
    const overlapX = [Math.max(card.left, target.left), Math.min(card.right, target.right)];
    const overlapY = [Math.max(card.top, target.top), Math.min(card.bottom, target.bottom)];
    let from = null;
    let to = null;

    if (overlapX[0] < overlapX[1]) {
        const x = (overlapX[0] + overlapX[1]) / 2;
        if (card.top >= target.bottom) { from = [x, target.bottom]; to = [x, card.top]; }
        else if (card.bottom <= target.top) { from = [x, target.top]; to = [x, card.bottom]; }
    } else if (overlapY[0] < overlapY[1]) {
        const y = (overlapY[0] + overlapY[1]) / 2;
        if (card.left >= target.right) { from = [target.right, y]; to = [card.left, y]; }
        else if (card.right <= target.left) { from = [target.left, y]; to = [card.right, y]; }
    }

    if (!from || Math.hypot(to[0] - from[0], to[1] - from[1]) < TOUR_GAP + 8) return null;
    return { from, to };
}

// Linha ligando o balão ao destaque quando há distância entre eles
function drawConnector(svgNS, container, card, target) {
    const connector = getConnector(card, target);
    if (!connector) return;
    const { from, to } = connector;

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", from[0]);
    line.setAttribute("y1", from[1]);
    line.setAttribute("x2", to[0]);
    line.setAttribute("y2", to[1]);
    line.setAttribute("stroke", "#ffffff");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "4 4");
    container.appendChild(line);

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", from[0]);
    dot.setAttribute("cy", from[1]);
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", "#ffffff");
    container.appendChild(dot);
}

function nextSlide() {
    if (currentSlideIndex < TOUR_SLIDES.length - 1) {
        currentSlideIndex++;
        renderSlide();
    } else {
        endTour();
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlide();
    }
}

function endTour() {
    document.getElementById("tour-overlay")?.classList.remove("active");
}