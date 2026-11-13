// Mantém menus/popovers dentro da janela (em telas pequenas eles saíam pela borda)
const MARGIN = 8;

export function keepInViewport(el, margin = MARGIN) {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (rect.right > window.innerWidth - margin) dx = window.innerWidth - margin - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;

    if (rect.bottom > window.innerHeight - margin) dy = window.innerHeight - margin - rect.bottom;
    if (rect.top + dy < margin) dy = margin - rect.top;

    // O elemento usa top/left (absolute ou fixed): deslocar esses valores move o elemento na tela
    if (dx) el.style.left = `${(parseFloat(el.style.left) || 0) + dx}px`;
    if (dy) el.style.top = `${(parseFloat(el.style.top) || 0) + dy}px`;
}
