import os
import smtplib
from email.message import EmailMessage

# Envio por SMTP (ex.: Gmail com "senha de app"). Tudo vem do ambiente; sem isso o e-mail não é enviado.
SMTP_HOST = os.getenv("EASYGROOVE_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("EASYGROOVE_SMTP_PORT", "587"))
SMTP_USER = os.getenv("EASYGROOVE_SMTP_USER", "")
SMTP_PASSWORD = os.getenv("EASYGROOVE_SMTP_PASSWORD", "")
# Endereço público do site, usado no link do e-mail (nunca derivado do cabeçalho Host, que o visitante controla)
BASE_URL = os.getenv("EASYGROOVE_BASE_URL", "").rstrip("/")


def email_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD and BASE_URL)


def reset_link(token: str) -> str:
    return f"{BASE_URL or 'http://localhost:8000'}/login?reset_token={token}"


def send_reset_email(to: str, token: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "EasyGroove: redefinição de senha"
    msg["From"] = f"EasyGroove <{SMTP_USER}>"
    msg["To"] = to
    msg.set_content(
        "Recebemos um pedido para redefinir a senha da sua conta no EasyGroove.\n\n"
        f"Clique no link abaixo (vale por 15 minutos e só funciona uma vez):\n{reset_link(token)}\n\n"
        "Se não foi você, ignore este e-mail: sua senha continua a mesma."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)
