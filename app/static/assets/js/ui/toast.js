export function showToast(message, isError = false) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        document.body.appendChild(toast);
    }

    toast.className = isError ? "toast-error" : "toast-success";
    toast.textContent = message;

    const selectedEl = document.querySelector(".measure-container.selected") || document.querySelector(".measure-container.in-clipboard");

    if (selectedEl) {
        const rect = selectedEl.getBoundingClientRect();
        toast.style.top = `${rect.top - 40}px`;
        toast.style.left = `${rect.left + (rect.width / 2) - 60}px`;
    } else {
        toast.style.top = "80px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
    }

    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2000);
}