// Ícone da pasta assets/icons (arquivos ui-<nome>.svg) que herda a cor do texto (currentColor).
// O .svg vira máscara de um <span class="icon">; o tamanho é definido no CSS de cada contexto.
export const icon = (name) => `<span class="icon" style="--icon:url('/assets/icons/ui-${name}.svg')" aria-hidden="true"></span>`;
