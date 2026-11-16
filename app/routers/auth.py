import hashlib
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, func, select
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.auth import ratelimit
from app.auth.dependencies import get_current_user
from app.auth.email import email_configured, reset_link, send_reset_email
import jwt

from app.auth.security import (
    ALGORITHM,
    IS_PRODUCTION,
    SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.database import get_session
from app.models.domain import User
from app.models.schemas import UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = logging.getLogger("easygroove.auth")

SENHA_MIN = 8
SENHA_MAX_BYTES = 72  # limite do bcrypt: acima disso o restante seria ignorado em silêncio

# Limites de frequência (tipo, tentativas, janela)
LOGIN_POR_USUARIO = (5, timedelta(minutes=15))
LOGIN_POR_IP = (20, timedelta(minutes=15))
CADASTRO_POR_IP = (10, timedelta(hours=1))
RECUPERAR_POR_IP = (5, timedelta(hours=1))
RECUPERAR_POR_EMAIL = (3, timedelta(hours=1))
MSG_MUITAS = "Muitas tentativas. Aguarde alguns minutos e tente novamente."


def validar_senha(senha: str) -> None:
    if len(senha) < SENHA_MIN:
        raise HTTPException(status_code=400, detail=f"A senha deve ter pelo menos {SENHA_MIN} caracteres.")
    if len(senha.encode("utf-8")) > SENHA_MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"A senha pode ter no máximo {SENHA_MAX_BYTES} bytes (cerca de 70 caracteres).")


def _fingerprint(hashed_password: str) -> str:
    """Impressão digital da senha atual: o link de recuperação deixa de valer assim que ela muda (uso único)."""
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:16]


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, session: Session = Depends(get_session)):
    ip = ratelimit.client_ip(request)
    ratelimit.enforce(session, "register", ip, *CADASTRO_POR_IP, MSG_MUITAS)
    validar_senha(user_in.password)
    # Verifica se username ou email já existem
    existing_user = session.exec(
        select(User).where(
            (User.username == user_in.username) | (User.email == user_in.email)
        )
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário ou e-mail já cadastrado.",
        )

    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    ratelimit.record(session, "register", ip)
    return db_user


@router.post("/login")
def login(
    user_in: UserLogin,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    ip = ratelimit.client_ip(request)
    ratelimit.enforce(session, "login_ip", ip, *LOGIN_POR_IP, MSG_MUITAS)
    ratelimit.enforce(session, "login_user", user_in.username.lower(), *LOGIN_POR_USUARIO, MSG_MUITAS)
    user = session.exec(
        select(User).where(User.username == user_in.username)
    ).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        ratelimit.record(session, "login_ip", ip)
        ratelimit.record(session, "login_user", user_in.username.lower())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        )

    ratelimit.clear(session, "login_user", user_in.username.lower())

    # Gera o JWT com o ID e Username do usuário
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username}
    )

    # Injeta o cookie HTTP-Only na resposta
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=IS_PRODUCTION,  # HTTPS na Vercel
    )

    return {"message": "Login realizado com sucesso", "username": user.username}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logout realizado com sucesso"}

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(
    request: Request,
    email: str = Body(..., embed=True),
    session: Session = Depends(get_session),
):
    resposta = {"message": "Se o email estiver cadastrado, um link de recuperação será enviado."}
    email = email.strip().lower()
    ip = ratelimit.client_ip(request)
    ratelimit.enforce(session, "forgot_ip", ip, *RECUPERAR_POR_IP, MSG_MUITAS)
    ratelimit.enforce(session, "forgot_email", email, *RECUPERAR_POR_EMAIL, MSG_MUITAS)
    ratelimit.record(session, "forgot_ip", ip)
    ratelimit.record(session, "forgot_email", email)

    user = session.exec(select(User).where(func.lower(User.email) == email)).first()
    # Resposta igual exista o e-mail ou não, para não revelar quem tem conta
    if not user:
        return resposta

    # Token de 15 minutos, preso à senha atual (some quando ela muda)
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = jwt.encode(
        {"sub": user.email, "type": "password_reset", "fp": _fingerprint(user.hashed_password), "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    if email_configured():
        try:
            send_reset_email(user.email, token)
        except Exception:
            log.exception("Falha ao enviar o e-mail de recuperação")  # sem token nem endereço no log
    elif not IS_PRODUCTION:
        # Desenvolvimento sem SMTP: mostra o link no terminal
        print(f"\n[EMAIL SIMULADO] Recuperação de senha para {user.email}\nLink: {reset_link(token)}\n")
    else:
        log.warning("Recuperação de senha pedida, mas o envio de e-mail não está configurado (veja .env.example)")

    return resposta


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, request: Request, session: Session = Depends(get_session)):
    ip = ratelimit.client_ip(request)
    ratelimit.enforce(session, "reset_ip", ip, 10, timedelta(hours=1), MSG_MUITAS)
    validar_senha(payload.new_password)
    try:
        decoded_token = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded_token.get("type") != "password_reset":
            raise ValueError("Invalid token type")
        email = decoded_token.get("sub")
    except Exception:  # expirado, assinatura inválida etc.
        ratelimit.record(session, "reset_ip", ip)
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Peça um novo.")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or decoded_token.get("fp") != _fingerprint(user.hashed_password):
        ratelimit.record(session, "reset_ip", ip)
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Peça um novo.")

    user.hashed_password = get_password_hash(payload.new_password)
    session.add(user)
    session.commit()
    ratelimit.clear(session, "login_user", user.username.lower())

    return {"message": "Senha redefinida com sucesso."}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
