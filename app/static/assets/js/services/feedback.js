// Envio de feedback por e-mail (sem backend): abre o aplicativo de e-mail com a mensagem pronta.
// Script clássico, usado pela biblioteca e pelo editor. O destinatário vem de window.SITE_EMAIL.
window.openFeedbackMail = function (subject, message) {
    const email = window.SITE_EMAIL || "";
    const query = `subject=${encodeURIComponent(`[EasyGroove] ${subject}`)}&body=${encodeURIComponent(message)}`;
    window.location.href = `mailto:${email}?${query}`;
};
