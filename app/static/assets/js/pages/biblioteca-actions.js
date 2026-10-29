// Funcionalidades extras da biblioteca: exibição, importar/exportar/duplicar, exclusão com desfazer,
// seleção em lote, contadores de coleções e fale conosco. Carregado depois de biblioteca.js.
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("arrangements-grid");
    const searchInput = document.getElementById("lib-search-input");
    const toastEl = document.getElementById("lib-toast");
    const collectionList = document.getElementById("collection-list-container");
    const collectionField = document.getElementById("lib-collection-id");

    const refreshGrid = () => window.htmx && htmx.trigger("#lib-search-input", "search");

    // ==========================================
    // TOAST (mensagem + ação opcional)
    // ==========================================
    let toastTimer = null;

    function showToast(message, { actionLabel, onAction, duration = 4000, isError = false } = {}) {
        if (!toastEl) return;
        clearTimeout(toastTimer);

        toastEl.hidden = false;
        toastEl.classList.toggle("is-error", isError);
        toastEl.innerHTML = "";

        const text = document.createElement("span");
        text.textContent = message;
        toastEl.appendChild(text);

        if (actionLabel && onAction) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = actionLabel;
            btn.addEventListener("click", () => {
                hideToast();
                onAction();
            });
            toastEl.appendChild(btn);
        }

        toastTimer = setTimeout(hideToast, duration);
    }

    function hideToast() {
        clearTimeout(toastTimer);
        if (toastEl) toastEl.hidden = true;
    }

    // Contadores do painel de boas-vindas
    function adjustStat(kind, delta) {
        const stat = document.querySelector(`[data-stat="${kind}"]`);
        if (!stat) return;
        const number = stat.querySelector("strong");
        const value = Math.max(0, (parseInt(number.textContent, 10) || 0) + delta);
        number.textContent = value;

        const labels = kind === "arranjos" ? ["arranjo", "arranjos"] : ["coleção", "coleções"];
        stat.querySelector(".lib-stat-label").textContent = value === 1 ? labels[0] : labels[1];
    }

    // ==========================================
    // COLEÇÕES: lista atualizada (contadores) sem recarregar
    // ==========================================
    async function refreshCollections() {
        if (!collectionList) return;
        try {
            const res = await fetch("/biblioteca/collections");
            if (!res.ok) return;
            collectionList.innerHTML = await res.text();
            if (window.htmx) htmx.process(collectionList);

            const activeId = collectionField ? collectionField.value : "";
            if (activeId) {
                collectionList.querySelector(`.lib-btn-collection[data-collection-id="${activeId}"]`)
                    ?.classList.add("active");
                document.getElementById("btn-all-arrangements")?.classList.remove("active");
            }
            hidePendingDeletes();
            populateBatchCollections();
        } catch (err) {
            console.error("Erro ao atualizar coleções:", err);
        }
    }

    window.libActions = { refreshCollections, refreshGrid, showToast, adjustStat };

    // Coleção ativa lembrada para buscas/filtros seguintes
    document.addEventListener("click", (e) => {
        const colBtn = e.target.closest(".lib-btn-collection[data-collection-id], #btn-all-arrangements");
        if (!colBtn || e.target.closest(".btn-delete-collection") || e.target.closest(".btn-rename-collection") || e.target.closest("input")) return;
        if (collectionField) collectionField.value = colBtn.dataset.collectionId || "";
    });

    // ==========================================
    // EXIBIÇÃO: grade / lista
    // ==========================================
    function applyView(view) {
        if (!grid) return;
        grid.classList.toggle("is-list", view === "list");
        document.querySelectorAll(".lib-view-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.view === view);
        });
    }

    let savedView = "grid";
    try { savedView = localStorage.getItem("easygroove_lib_view") || "grid"; } catch (e) { }
    applyView(savedView);

    document.querySelectorAll(".lib-view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            applyView(btn.dataset.view);
            try { localStorage.setItem("easygroove_lib_view", btn.dataset.view); } catch (e) { }
        });
    });

    // ==========================================
    // ORDENAÇÃO: critério no select e inversão no botão ao lado
    // ==========================================
    const sortSelect = document.getElementById("lib-sort-select");
    const sortReverse = document.getElementById("lib-sort-reverse");
    const sortDirBtn = document.getElementById("btn-sort-dir");

    const SORT_HINTS = {
        edited: ["Mais recentes primeiro", "Mais antigas primeiro"],
        created: ["Mais recentes primeiro", "Mais antigas primeiro"],
        az: ["De A a Z", "De Z a A"],
    };

    function updateSortDirHint() {
        if (!sortDirBtn || !sortSelect) return;
        const reversed = sortReverse.value === "1";
        sortDirBtn.classList.toggle("is-reversed", reversed);
        const hints = SORT_HINTS[sortSelect.value] || SORT_HINTS.edited;
        sortDirBtn.title = `${hints[reversed ? 1 : 0]} (clique para inverter)`;
    }

    sortDirBtn?.addEventListener("click", () => {
        sortReverse.value = sortReverse.value === "1" ? "0" : "1";
        updateSortDirHint();
        htmx.trigger(sortDirBtn, "sortdir");
    });

    sortSelect?.addEventListener("change", updateSortDirHint);
    updateSortDirHint();

    // ==========================================
    // LIMPAR BUSCA
    // ==========================================
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".btn-clear-filters")) return;
        if (searchInput) searchInput.value = "";
        refreshGrid();
    });

    // ==========================================
    // IMPORTAR / EXPORTAR / DUPLICAR
    // ==========================================
    const importInput = document.getElementById("lib-import-input");

    document.addEventListener("click", (e) => {
        if (e.target.closest(".btn-trigger-import") && importInput) importInput.click();
    });

    importInput?.addEventListener("change", async () => {
        const file = importInput.files[0];
        importInput.value = "";
        if (!file) return;

        try {
            const data = JSON.parse(await file.text());
            if (!data || !Array.isArray(data.instruments) || data.instruments.length === 0) {
                throw new Error("Estrutura inválida");
            }

            const name = (data.title || file.name.replace(/\.json$/i, "") || "Arranjo importado").trim();
            const res = await fetch("/api/arrangements/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, score_data: data })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Erro ao importar o arranjo.");
            }

            const created = await res.json();
            adjustStat("arranjos", 1);
            refreshGrid();
            showToast(`Arranjo “${created.name}” importado com sucesso!`);
        } catch (err) {
            showToast("Não foi possível importar. Use um arquivo .json de arranjo válido.", { isError: true, duration: 5000 });
        }
    });

    document.addEventListener("click", async (e) => {
        const exportBtn = e.target.closest(".btn-action-export");
        if (exportBtn) {
            e.stopPropagation();
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));

            try {
                const res = await fetch(`/api/arrangements/${exportBtn.dataset.id}`, { credentials: "same-origin" });
                if (!res.ok) throw new Error();
                const arrangement = await res.json();

                const blob = new Blob([JSON.stringify(arrangement.score_data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const fileName = (arrangement.name || "arranjo-easygroove")
                    .toLowerCase()
                    .normalize("NFD").replace(/[̀-ͯ]/g, "")
                    .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${fileName || "arranjo-easygroove"}.json`;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
                showToast("JSON exportado com sucesso!");
            } catch (err) {
                showToast("Não foi possível exportar o arranjo.", { isError: true });
            }
            return;
        }

        const duplicateBtn = e.target.closest(".btn-action-duplicate");
        if (duplicateBtn) {
            e.stopPropagation();
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));

            try {
                const res = await fetch(`/api/arrangements/${duplicateBtn.dataset.id}/duplicate`, { method: "POST" });
                if (!res.ok) throw new Error();
                const copy = await res.json();
                adjustStat("arranjos", 1);
                refreshGrid();
                refreshCollections();
                showToast(`Arranjo duplicado como “${copy.name}”.`);
            } catch (err) {
                showToast("Não foi possível duplicar o arranjo.", { isError: true });
            }
        }
    });

    // Remover a capa enviada pelo usuário
    document.addEventListener("click", async (e) => {
        const removeCoverBtn = e.target.closest(".btn-action-remove-cover");
        if (!removeCoverBtn) return;
        e.stopPropagation();
        document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));

        try {
            const res = await fetch(`/api/arrangements/${removeCoverBtn.dataset.id}/cover`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            refreshGrid();
            showToast("Capa removida.");
        } catch (err) {
            showToast("Não foi possível remover a capa.", { isError: true });
        }
    });

    // ==========================================
    // EXCLUSÃO COM DESFAZER (o DELETE só ocorre ao fim do prazo)
    // ==========================================
    const UNDO_MS = 6000;
    let pending = null; // { items: [{type, id, el}], timer }
    const hiddenIds = { arrangement: new Set(), collection: new Set() };

    function hidePendingDeletes() {
        hiddenIds.arrangement.forEach(id => {
            const card = document.querySelector(`.lib-card[data-card-id="${id}"]`);
            if (card) card.style.display = "none";
        });
        hiddenIds.collection.forEach(id => {
            const item = document.querySelector(`[data-collection-item-id="${id}"]`);
            if (item) item.style.display = "none";
        });
    }

    function endpointFor(item) {
        return item.type === "arrangement" ? `/api/arrangements/${item.id}` : `/api/collections/${item.id}`;
    }

    async function commitPending(keepalive = false) {
        if (!pending) return;
        const { items, timer } = pending;
        pending = null;
        clearTimeout(timer);

        const results = await Promise.all(items.map(async item => {
            try {
                const res = await fetch(endpointFor(item), { method: "DELETE", keepalive });
                return res.ok;
            } catch (err) {
                return false;
            }
        }));

        items.forEach((item, index) => {
            hiddenIds[item.type].delete(item.id);
            if (results[index]) {
                item.el?.remove();
            } else {
                if (item.el) item.el.style.display = "";
                showToast("Não foi possível excluir um dos itens.", { isError: true });
            }
        });

        if (items.some(i => i.type === "arrangement")) refreshCollections();
    }

    function scheduleDelete(items, message) {
        commitPending(); // só a última exclusão pode ser desfeita

        items.forEach(item => {
            hiddenIds[item.type].add(item.id);
            if (item.el) item.el.style.display = "none";
        });

        const arrangements = items.filter(i => i.type === "arrangement").length;
        const collections = items.filter(i => i.type === "collection").length;
        if (arrangements) adjustStat("arranjos", -arrangements);
        if (collections) adjustStat("colecoes", -collections);

        pending = { items, timer: setTimeout(() => commitPending(), UNDO_MS) };

        showToast(message, {
            actionLabel: "Desfazer",
            duration: UNDO_MS,
            onAction: () => {
                if (!pending) return;
                clearTimeout(pending.timer);
                pending.items.forEach(item => {
                    hiddenIds[item.type].delete(item.id);
                    if (item.el) item.el.style.display = "";
                });
                if (arrangements) adjustStat("arranjos", arrangements);
                if (collections) adjustStat("colecoes", collections);
                pending = null;
            }
        });
    }

    // Se a página for fechada durante o prazo, a exclusão é concluída
    window.addEventListener("pagehide", () => commitPending(true));

    window.libActions.scheduleDelete = scheduleDelete;

    // Mantém escondidos (até o fim do prazo) os itens que voltam em uma nova busca
    document.body.addEventListener("htmx:afterSwap", (e) => {
        if (e.target === grid) {
            hidePendingDeletes();
            updateBatchUI();
        }
    });

    // Exclusão de arranjo pelo menu do card (substitui o confirm())
    document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".btn-action-delete");
        if (!deleteBtn) return;
        e.stopPropagation();
        document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));

        const card = deleteBtn.closest(".lib-card");
        scheduleDelete(
            [{ type: "arrangement", id: deleteBtn.dataset.id, el: card }],
            "Arranjo excluído."
        );
    }, true);

    // Renomear coleção pelo lápis (capturado antes do botão da coleção disparar a busca)
    document.addEventListener("click", (e) => {
        const renameBtn = e.target.closest(".btn-rename-collection");
        if (!renameBtn) return;
        e.stopPropagation();
        e.preventDefault();
        window.startCollectionRename?.(renameBtn.closest(".lib-btn-collection"));
    }, true);

    // Exclusão de coleção
    document.addEventListener("click", (e) => {
        const deleteColBtn = e.target.closest(".btn-delete-collection");
        if (!deleteColBtn) return;
        e.stopPropagation();

        const colId = deleteColBtn.dataset.colId;
        const li = deleteColBtn.closest("[data-collection-item-id]");
        const wasActive = collectionField && collectionField.value === String(colId);

        scheduleDelete([{ type: "collection", id: colId, el: li }], "Coleção excluída. Os arranjos foram mantidos.");

        if (wasActive) document.getElementById("btn-all-arrangements")?.click();
    }, true);

    // ==========================================
    // SELEÇÃO EM LOTE
    // Caixa no canto de cada card (aparece no hover); depois da primeira seleção ela persiste em todos.
    // ==========================================
    const batchBar = document.getElementById("lib-batch-bar");
    const batchCount = document.getElementById("lib-batch-count");
    const batchSelect = document.getElementById("lib-batch-collection");
    const btnBatchDelete = document.getElementById("btn-batch-delete");

    const isSelecting = () => grid && grid.classList.contains("is-selecting");
    const selectedCards = () => (grid ? Array.from(grid.querySelectorAll(".lib-card.is-selected")) : []);

    function populateBatchCollections() {
        if (!batchSelect) return;
        const current = batchSelect.value;
        batchSelect.innerHTML = '<option value="">Adicionar à coleção...</option>';
        document.querySelectorAll(".lib-btn-collection[data-collection-id]").forEach(btn => {
            const option = document.createElement("option");
            option.value = btn.dataset.collectionId;
            option.textContent = btn.querySelector(".col-name-text").textContent;
            batchSelect.appendChild(option);
        });
        batchSelect.value = current;
        updateBatchUI();
    }

    // O modo de seleção existe enquanto houver ao menos um card marcado
    function updateBatchUI() {
        if (!batchBar || !grid) return;
        const count = selectedCards().length;
        grid.classList.toggle("is-selecting", count > 0);

        batchBar.hidden = count === 0;
        batchCount.textContent = `${count} ${count === 1 ? "selecionado" : "selecionados"}`;
        btnBatchDelete.disabled = count === 0;
    }

    function clearSelection() {
        if (!grid) return;
        grid.querySelectorAll(".lib-card.is-selected").forEach(card => {
            card.classList.remove("is-selected");
            const box = card.querySelector(".lib-card-checkbox");
            if (box) box.checked = false;
        });
        updateBatchUI();
    }

    function toggleCard(card) {
        const selected = !card.classList.contains("is-selected");
        card.classList.toggle("is-selected", selected);
        const box = card.querySelector(".lib-card-checkbox");
        if (box) box.checked = selected;
        updateBatchUI();
    }


    // Caixa de seleção do card
    document.addEventListener("click", (e) => {
        const check = e.target.closest(".lib-card-check");
        if (!check) return;
        e.stopImmediatePropagation(); // evita que o clique também seja tratado como clique no card
        e.preventDefault();
        toggleCard(check.closest(".lib-card"));
    }, true);

    // Com algo selecionado, clicar no card marca/desmarca em vez de abrir o editor
    document.addEventListener("click", (e) => {
        if (!isSelecting()) return;
        const card = e.target.closest(".lib-card");
        if (!card || e.target.closest(".lib-card-menu-wrapper") || e.target.closest(".lib-card-play") || e.target.closest(".lib-card-check")) return;

        e.stopPropagation();
        e.preventDefault();
        toggleCard(card);
    }, true);

    btnBatchDelete?.addEventListener("click", () => {
        const cards = selectedCards();
        if (cards.length === 0) return;
        const items = cards.map(card => ({ type: "arrangement", id: card.dataset.cardId, el: card }));
        clearSelection();
        scheduleDelete(items, `${items.length} ${items.length === 1 ? "arranjo excluído" : "arranjos excluídos"}.`);
    });

    // Escolher uma coleção no seletor adiciona os arranjos selecionados na hora
    batchSelect?.addEventListener("change", async () => {
        const collectionId = batchSelect.value;
        const cards = selectedCards();
        if (!collectionId || cards.length === 0) return;

        const results = await Promise.all(cards.map(card =>
            fetch(`/api/arrangements/${card.dataset.cardId}/collections/${collectionId}`, { method: "POST" })
                .then(res => res.ok || res.status === 400)
                .catch(() => false)
        ));

        const ok = results.filter(Boolean).length;
        batchSelect.value = "";
        clearSelection();
        refreshGrid();
        refreshCollections();
        showToast(ok === cards.length
            ? `${ok} ${ok === 1 ? "arranjo adicionado" : "arranjos adicionados"} à coleção.`
            : "Alguns arranjos não puderam ser adicionados.", { isError: ok !== cards.length });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isSelecting()) clearSelection();
    });

    // Clicar fora dos cards e da barra de ações também cancela a seleção
    document.addEventListener("click", (e) => {
        if (!isSelecting()) return;
        if (e.target.closest(".lib-card, .lib-batch-bar, .lib-modal-overlay, .lib-toast")) return;
        clearSelection();
    });

    window.libActions.clearSelection = clearSelection;

    populateBatchCollections();

    // ==========================================
    // BOTÃO "CRIAR": fixo na tela, mas sem invadir o rodapé
    // ==========================================
    const fab = document.querySelector(".lib-fab");
    const footer = document.querySelector(".lib-footer");

    function placeFab() {
        if (!fab || !footer) return;
        const overlap = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
        fab.style.bottom = `${overlap > 0 ? overlap + 16 : 28}px`;
    }

    window.addEventListener("scroll", placeFab, { passive: true });
    window.addEventListener("resize", placeFab);
    // A altura da página muda sem rolagem (busca, troca grade/lista): reposiciona também nesses casos
    if (window.ResizeObserver) new ResizeObserver(placeFab).observe(document.body);
    placeFab();

    // ==========================================
    // FALE CONOSCO
    // ==========================================
    const feedbackModal = document.getElementById("feedback-modal");
    const feedbackForm = document.getElementById("feedback-form");

    document.getElementById("btn-open-feedback")?.addEventListener("click", () => {
        feedbackModal?.classList.add("active");
        document.getElementById("feedback-message")?.focus();
    });

    document.getElementById("btn-cancel-feedback")?.addEventListener("click", () => {
        feedbackModal?.classList.remove("active");
    });

    feedbackModal?.addEventListener("click", (e) => {
        if (e.target === feedbackModal) feedbackModal.classList.remove("active");
    });

    feedbackForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = document.getElementById("feedback-subject").value;
        const message = document.getElementById("feedback-message").value.trim();
        if (!message) return;

        window.openFeedbackMail(subject, message);
        feedbackModal.classList.remove("active");
        document.getElementById("feedback-message").value = "";
    });
});
