document.addEventListener("DOMContentLoaded", () => {
    // Logout
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
        });
    }

    let navTimer = null;
    let activeArrangementForModal = null;
    const modalCols = document.getElementById("manage-cols-modal");
    const modalColList = document.getElementById("modal-col-list");

    // Função para edição inline do título do card
    function startInlineRename(card) {
        const titleSpan = card.querySelector(".lib-card-title");
        if (!titleSpan || card.querySelector(".lib-card-title-input")) return;

        const currentName = titleSpan.textContent.trim();
        const arrId = card.dataset.cardId;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "lib-card-title-input";
        input.value = currentName;

        titleSpan.style.display = "none";
        titleSpan.parentNode.insertBefore(input, titleSpan.nextSibling);
        input.focus();
        input.select();

        let isSaving = false;

        const saveCardRename = async () => {
            if (isSaving) return;
            isSaving = true;
            const newName = input.value.trim();

            if (!newName || newName === currentName) {
                input.remove();
                titleSpan.style.display = "";
                return;
            }

            try {
                const res = await fetch(`/api/arrangements/${arrId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newName })
                });
                if (res.ok) {
                    titleSpan.textContent = newName;
                    input.remove();
                    titleSpan.style.display = "";
                    htmx.trigger("#lib-search-input", "search");
                } else {
                    input.remove();
                    titleSpan.style.display = "";
                }
            } catch (e) {
                input.remove();
                titleSpan.style.display = "";
            }
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); saveCardRename(); }
            else if (e.key === "Escape") { input.remove(); titleSpan.style.display = ""; }
        });
        input.addEventListener("blur", saveCardRename);
    }

    // ==========================================
    // DELEGAÇÃO GLOBAL DE CLIQUES
    // ==========================================
    document.addEventListener("click", async (e) => {

        // 1. Alternar Dropdown do Card
        const toggleBtn = e.target.closest(".btn-toggle-card-menu");
        if (toggleBtn) {
            e.stopPropagation();
            const dropdown = toggleBtn.closest(".lib-card-menu-wrapper").querySelector(".lib-card-dropdown");
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => {
                if (d !== dropdown) d.classList.remove("active");
            });
            dropdown.classList.toggle("active");
            return;
        }

        // Fechar dropdown ao clicar fora
        if (!e.target.closest(".lib-card-dropdown")) {
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));
        }

        // 2. Ações do Menu do Card
        const renameOpt = e.target.closest(".btn-action-rename-card");
        if (renameOpt) {
            e.stopPropagation();
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));
            startInlineRename(renameOpt.closest(".lib-card"));
            return;
        }

        const editBtn = e.target.closest(".btn-action-edit");
        if (editBtn) {
            e.stopPropagation();
            window.location.href = `/app?id=${editBtn.dataset.id}`;
            return;
        }

        // Exclusão de arranjo: tratada em biblioteca-actions.js (com opção de desfazer)

        // 3. Ações de Coleções
        // Exclusão de coleção: tratada em biblioteca-actions.js (com opção de desfazer)

        const removeColBtn = e.target.closest(".btn-action-remove-col");
        if (removeColBtn) {
            e.stopPropagation();
            const res = await fetch(`/api/arrangements/${removeColBtn.dataset.id}/collections/${removeColBtn.dataset.colId}`, { method: "DELETE" });
            if (res.ok) {
                htmx.trigger("#lib-search-input", "search");
                window.libActions?.refreshCollections();
            }
            return;
        }

        const manageColsBtn = e.target.closest(".btn-action-manage-cols");
        if (manageColsBtn) {
            e.stopPropagation();
            document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));
            activeArrangementForModal = manageColsBtn.dataset.id;
            const card = manageColsBtn.closest(".lib-card");
            const currentCols = JSON.parse(card.dataset.collections || "[]");

            const subtitle = document.getElementById("manage-cols-subtitle");
            if (subtitle) subtitle.textContent = card.querySelector(".lib-card-title")?.textContent.trim() || "";

            modalColList.innerHTML = "";
            const sideCols = document.querySelectorAll(".lib-btn-collection[data-collection-id]");
            if (sideCols.length === 0) {
                const empty = document.createElement("p");
                empty.className = "col-checkbox-empty";
                empty.textContent = "Nenhuma coleção criada ainda.";
                modalColList.appendChild(empty);
            } else {
                sideCols.forEach(sc => {
                    const id = parseInt(sc.dataset.collectionId);
                    const label = document.createElement("label");
                    label.className = "col-checkbox-item";

                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.value = id;
                    input.checked = currentCols.includes(id);

                    const name = document.createElement("span");
                    name.textContent = sc.querySelector(".col-name-text").textContent;

                    label.append(input, name);
                    modalColList.appendChild(label);
                });
            }
            modalCols.classList.add("active");
            return;
        }

        // Modal (Cancelar e Salvar)
        if (e.target.id === "btn-cancel-modal" || e.target === modalCols) {
            modalCols.classList.remove("active");
            return;
        }

        if (e.target.id === "btn-save-modal") {
            const selectedIds = Array.from(modalColList.querySelectorAll("input[type='checkbox']:checked")).map(cb => parseInt(cb.value));
            const res = await fetch(`/api/arrangements/${activeArrangementForModal}/collections`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collection_ids: selectedIds })
            });
            if (res.ok) {
                modalCols.classList.remove("active");
                htmx.trigger("#lib-search-input", "search");
                window.libActions?.refreshCollections();
            } else {
                alert("Erro ao salvar coleções.");
            }
            return;
        }

        // Barra Lateral (Ativar botões visualmente)
        const colBtn = e.target.closest(".lib-btn-collection, #btn-all-arrangements");
        if (colBtn && !e.target.closest(".btn-delete-collection") && !e.target.closest("input")) {
            document.querySelectorAll(".lib-btn-collection, #btn-all-arrangements").forEach(b => {
                b.classList.remove("active");
            });
            colBtn.classList.add("active");
        }

        // Clicar no corpo do card (abrir editor)
        const card = e.target.closest(".lib-card");
        if (card && !e.target.closest(".lib-card-menu-wrapper") && !e.target.closest(".lib-card-title-input")) {
            const url = `/app?id=${card.dataset.cardId}`;
            clearTimeout(navTimer);

            // No título, espera um instante: um duplo clique deve renomear em vez de abrir o editor
            if (e.target.closest(".lib-card-title")) {
                navTimer = setTimeout(() => { window.location.href = url; }, 280);
            } else {
                window.location.href = url;
            }
        }
    });

    // ==========================================
    // EVENTOS DE DRAG & DROP E DUPLO CLIQUE
    // ==========================================
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".lib-card");
        if (card) {
            // Arrastar um card selecionado leva todos os selecionados; senão, só o próprio card
            const selected = Array.from(document.querySelectorAll(".lib-card.is-selected"));
            const ids = card.classList.contains("is-selected") && selected.length > 0
                ? selected.map(c => c.dataset.cardId)
                : [card.dataset.cardId];

            e.dataTransfer.setData("text/plain", ids[0]);
            e.dataTransfer.setData("application/x-easygroove-ids", JSON.stringify(ids));
            e.dataTransfer.effectAllowed = "copy";

            // Em vez da imagem do card inteiro, arrasta só uma etiqueta com o nome do arranjo
            const name = card.querySelector(".lib-card-title")?.textContent.trim() || "Arranjo";
            const ghost = document.createElement("div");
            ghost.className = "lib-drag-ghost";
            ghost.textContent = ids.length > 1 ? `${ids.length} arranjos` : name;
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 12, 16);
            setTimeout(() => ghost.remove(), 0);
        }
    });

    document.addEventListener("dragover", (e) => {
        const colBtn = e.target.closest(".lib-btn-collection[data-collection-id]");
        if (colBtn) {
            e.preventDefault();
            colBtn.classList.add("drag-over");
        }
    });

    document.addEventListener("dragleave", (e) => {
        const colBtn = e.target.closest(".lib-btn-collection[data-collection-id]");
        if (colBtn) colBtn.classList.remove("drag-over");
    });

    document.addEventListener("drop", async (e) => {
        const colBtn = e.target.closest(".lib-btn-collection[data-collection-id]");
        if (colBtn) {
            e.preventDefault();
            colBtn.classList.remove("drag-over");
            let ids = [];
            try { ids = JSON.parse(e.dataTransfer.getData("application/x-easygroove-ids") || "[]"); } catch (err) { }
            if (ids.length === 0) {
                const single = e.dataTransfer.getData("text/plain");
                if (single) ids = [single];
            }
            const colId = colBtn.dataset.collectionId;

            if (ids.length > 0 && colId) {
                await Promise.all(ids.map(id =>
                    fetch(`/api/arrangements/${id}/collections/${colId}`, { method: "POST" }).catch(() => null)
                ));
                window.libActions?.clearSelection();
                htmx.trigger("#lib-search-input", "search");
                window.libActions?.refreshCollections();

                const colName = colBtn.querySelector(".col-name-text")?.textContent || "coleção";
                window.libActions?.showToast(
                    ids.length === 1 ? `Arranjo adicionado a “${colName}”.` : `${ids.length} arranjos adicionados a “${colName}”.`
                );
            }
        }
    });

    document.addEventListener("dblclick", (e) => {
        const titleSpan = e.target.closest(".lib-card-title");
        if (titleSpan) {
            e.stopPropagation();
            clearTimeout(navTimer);
            startInlineRename(titleSpan.closest(".lib-card"));
        }
    });

    // ==========================================
    // CRIAÇÃO E EDIÇÃO DE COLEÇÕES (SIDEBAR)
    // ==========================================
    const collectionListContainer = document.getElementById("collection-list-container");
    const btnAddCollection = document.getElementById("btn-add-collection");

    if (btnAddCollection && collectionListContainer) {
        btnAddCollection.addEventListener("click", () => {
            if (document.getElementById("new-collection-input")) {
                document.getElementById("new-collection-input").focus();
                return;
            }

            const emptyMsg = collectionListContainer.querySelector(".empty-col-msg");
            if (emptyMsg) emptyMsg.remove();

            const li = document.createElement("li");
            li.innerHTML = `
                <div class="lib-btn-collection active" style="cursor: default;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <input type="text" id="new-collection-input" value="Nova Coleção" style="background: transparent; border: 1px solid var(--color-primary, #6366f1); border-radius: 4px; padding: 2px 6px; font-size: 0.9rem; color: inherit; width: 100%; outline: none;">
                </div>
            `;
            collectionListContainer.appendChild(li);

            const input = document.getElementById("new-collection-input");
            input.focus();
            input.select();
            let isSaving = false;

            const saveNew = async () => {
                if (isSaving) return;
                isSaving = true;
                const name = input.value.trim();
                if (!name) return li.remove();

                try {
                    const res = await fetch("/api/collections", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name })
                    });
                    if (res.ok) {
                        li.remove();
                        window.libActions?.adjustStat("colecoes", 1);
                        await window.libActions?.refreshCollections();
                    } else { li.remove(); alert("Erro ao criar coleção."); }
                } catch (e) { li.remove(); }
            };

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") { e.preventDefault(); saveNew(); }
                else if (e.key === "Escape") li.remove();
            });
            input.addEventListener("blur", saveNew);
        });
    }

    // Renomear coleção: duplo clique no nome ou lápis ao lado dela
    function startCollectionRename(btn) {
        if (!btn || btn.querySelector("input")) return;

        const colId = btn.dataset.collectionId;
        const textSpan = btn.querySelector(".col-name-text");
        if (!textSpan || !colId) return;

        const currentName = textSpan.textContent.trim();
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentName;
        input.style.cssText = "background: transparent; border: 1px solid var(--color-primary, #6366f1); border-radius: 4px; padding: 2px 6px; font-size: 0.9rem; color: inherit; width: 100%; outline: none;";

        textSpan.style.display = "none";
        btn.insertBefore(input, textSpan.nextSibling);
        input.focus();
        input.select();
        let isSaving = false;

        const finish = () => {
            input.remove();
            textSpan.style.display = "";
        };

        const saveEdit = async () => {
            if (isSaving) return;
            isSaving = true;
            const newName = input.value.trim();

            if (!newName || newName === currentName) return finish();

            try {
                const res = await fetch(`/api/collections/${colId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newName })
                });
                if (res.ok) {
                    textSpan.textContent = newName;
                    window.libActions?.refreshCollections();
                } else {
                    const err = await res.json().catch(() => ({}));
                    window.libActions?.showToast(err.detail || "Não foi possível renomear a coleção.", { isError: true });
                }
            } catch (e) { /* mantém o nome atual */ }
            finish();
        };

        input.addEventListener("click", (evt) => evt.stopPropagation());
        input.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") { evt.preventDefault(); saveEdit(); }
            else if (evt.key === "Escape") { isSaving = true; finish(); }
        });
        input.addEventListener("blur", saveEdit);
    }

    window.startCollectionRename = startCollectionRename;

    if (collectionListContainer) {
        collectionListContainer.addEventListener("dblclick", (e) => {
            const btn = e.target.closest(".lib-btn-collection");
            if (!btn || e.target.closest(".btn-delete-collection") || e.target.closest(".btn-rename-collection")) return;
            startCollectionRename(btn);
        });
    }

});