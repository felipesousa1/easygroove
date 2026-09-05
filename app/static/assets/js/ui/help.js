import { showToast } from './toast.js';

const TOUR_SLIDES = [
    // SLIDE 1: CABEÇALHO PRINCIPAL
    {
        title: "1. Cabeçalho Principal",
        navPosition: "bottom",
        targets: [
            {
                selector: "#btn-main-menu",
                title: "Menu",
                text: "Acesse gerenciamento de arquivos, biblioteca de arranjos, auto-scroll e opção de sair.",
                tip: "Clique para abrir opções rápidas."
            },
            {
                // Agrupa o texto do título e o botão de editar
                selector: "#title-display, #btn-edit-title",
                title: "Título do Arranjo",
                text: "Edite o nome da sua partitura. Para voltar à biblioteca ou sair, utilize o Menu.",
                tip: "Atalho: Shift + R para renomear."
            },
            {
                // Pega a área inteira do player + metrônomo
                selector: ".header-center",
                title: "Player, Metrônomo & BPM",
                text: "Controles de reprodução (Loop, Play/Pause, Stop) e ajuste de andamento. Clique no metrônomo para abrir o painel de volume.",
                tip: "Atalhos: P (Play), S (Stop), L (Loop) e Shift + B (focar BPM)."
            },
            {
                // Agrupa os botões de salvar e exportar
                selector: "button[title='Salvar Projeto'], button[title='Exportar Arranjo']",
                title: "Salvar & Exportar",
                text: "Salve o progresso na sua conta ou exporte o arranjo final em áudio WAV / arquivo JSON.",
                tip: "Atalhos: Ctrl + S (Salvar) e Shift + E (Exportar)."
            }
        ]
    },

    // SLIDE 2: TOOLBAR
    {
        title: "2. Barra de Ferramentas (Toolbar)",
        navPosition: "top", // <--- Move a barra de navegação para o TOPO da tela neste slide
        targets: [
            {
                selector: ".floating-editor-bar",
                title: "Paleta de Toques",
                text: "Selecione o instrumento ativo e escolha a variação de toque (pele, abafado, aro, rimshot, etc.).",
                tip: "Atalho: use as teclas numéricas de 1 a 9 para trocar o toque instantaneamente."
            }
        ]
    },

    // SLIDE 3: ESTRUTURA EXTERNA DA GRADE
    {
        title: "3. Estrutura Externa da Grade",
        navPosition: "bottom",
        targets: [
            {
                selector: "#instruments-sidebar-list",
                title: "Cards dos Instrumentos",
                text: "Gerencie cada linha: controle volume, botão Mute/Desmutar e reordenação vertical dos instrumentos.",
                tip: "Clique e arraste um card verticalmente para reorganizar as linhas."
            },
            {
                selector: "#measures-track",
                title: "Compassos e Ritornelos",
                text: "Acompanhe a numeração dos compassos, configure repetições (ritornelos) e abra o menu do compasso.",
                tip: "Atalho: Shift + N para adicionar um novo compasso ao final."
            }
        ]
    },

    // SLIDE 4: GRADE INTERNA DE EDIÇÃO
    {
        title: "4. Grade Interna de Edição",
        navPosition: "bottom",
        targets: [
            {
                selector: "#score-grid",
                title: "Inserção e Seleção",
                text: "Clique ou use Drag-to-Paint (clique e arraste) para desenhar notas sequencialmente. Clique nos compassos para selecionar.",
                tip: "Atalhos: Ctrl+C (copiar), Ctrl+V (colar) e Del (limpar seleção).",
                offsetX: 150 // Puxa o balão mais pro meio da tela
            },
            {
                selector: ".beat-group",
                title: "Subdivisão de Tempo",
                text: "Clique nas traves/hastes superiores de qualquer tempo para alterar sua subdivisão (2, 3, 4, 6 ou 8 notas).",
                tip: "Ajuste métricas individuais através do menu de cada compasso.",
                offsetX: 250,
                offsetY: 100
            }
        ]
    }
];

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

    slide.targets.forEach(target => {
        // Seleciona todos os elementos do seletor e filtra apenas os visíveis
        const els = Array.from(document.querySelectorAll(target.selector)).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        });

        if (els.length === 0) return;

        // Calcula uma única caixa delimitadora que engloba todos os elementos encontrados
        let top = els[0].getBoundingClientRect().top;
        let left = els[0].getBoundingClientRect().left;
        let bottom = els[0].getBoundingClientRect().bottom;
        let right = els[0].getBoundingClientRect().right;

        for (let i = 1; i < els.length; i++) {
            const r = els[i].getBoundingClientRect();
            top = Math.min(top, r.top);
            left = Math.min(left, r.left);
            bottom = Math.max(bottom, r.bottom);
            right = Math.max(right, r.right);
        }

        const rect = {
            top: top,
            left: left,
            bottom: bottom,
            right: right,
            width: right - left,
            height: bottom - top
        };
        
        const padding = 6;
        const x = rect.left - padding;
        const y = rect.top - padding;
        const w = rect.width + (padding * 2);
        const h = rect.height + (padding * 2);

        const hole = document.createElementNS(svgNS, "rect");
        hole.setAttribute("x", x);
        hole.setAttribute("y", y);
        hole.setAttribute("width", w);
        hole.setAttribute("height", h);
        hole.setAttribute("fill", "black");
        hole.setAttribute("rx", "8");
        maskHoles.appendChild(hole);

        const stroke = document.createElementNS(svgNS, "rect");
        stroke.setAttribute("x", x);
        stroke.setAttribute("y", y);
        stroke.setAttribute("width", w);
        stroke.setAttribute("height", h);
        stroke.setAttribute("fill", "none");
        stroke.setAttribute("stroke", "#360566");
        stroke.setAttribute("stroke-width", "2");
        stroke.setAttribute("rx", "8");
        strokeBoxes.appendChild(stroke);

        const card = document.createElement("div");
        card.className = "tour-tooltip-card";
        card.innerHTML = `
            <span class="tour-tooltip-title">${target.title}</span>
            <div>${target.text}</div>
            ${target.tip ? `<div class="tour-tooltip-tip"><strong>💡 Dica:</strong> ${target.tip}</div>` : ''}
        `;

        let cardTop = rect.bottom + 14;
        let cardLeft = rect.left;

        if (cardTop + 140 > window.innerHeight) {
            cardTop = Math.max(10, rect.top - 150);
        }
        
        if (cardLeft + 250 > window.innerWidth) {
            cardLeft = window.innerWidth - 260;
        }

        if (target.offsetX) cardLeft += target.offsetX;
        if (target.offsetY) cardTop += target.offsetY;

        card.style.top = `${cardTop}px`;
        card.style.left = `${Math.max(10, cardLeft)}px`;

        tooltipsContainer.appendChild(card);
    });
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