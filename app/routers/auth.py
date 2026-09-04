from fastapi import APIRouter, Depends, HTTPException, Response, status, Body
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.auth.dependencies import get_current_user
import jwt

from app.auth.security import (
    ALGORITHM,
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


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
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
    return db_user


@router.post("/login")
def login(
    user_in: UserLogin,
    response: Response,
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == user_in.username)
    ).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        )

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
def forgot_password(email: str = Body(..., embed=True), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == email)).first()
    
    # Retorna sucesso sempre para evitar enumeração de e-mails válidos por invasores
    if not user:
        return {"message": "Se o email estiver cadastrado, um link de recuperação será enviado."}
    
    # Gera token JWT válido por 15 minutos
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode = {"sub": user.email, "type": "password_reset", "exp": expire}
    
    # ATENÇÃO: Use a mesma SECRET_KEY e ALGORITHM do seu login
    token = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256") 
    
    # Simula o envio de email imprimindo no terminal
    reset_link = f"http://localhost:8000/login?reset_token={token}"
    print(f"\n" + "="*60)
    print(f"[EMAIL SIMULADO] Redefinição de senha solicitada para: {email}")
    print(f"Link: {reset_link}")
    print("="*60 + "\n")
    
    return {"message": "Se o email estiver cadastrado, um link de recuperação será enviado."}

@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, session: Session = Depends(get_session)):
    try:
        # ATENÇÃO: Use a mesma SECRET_KEY e ALGORITHM do seu login
        decoded_token = jwt.decode(payload.token, SECRET_KEY, algorithms=["HS256"])
        if decoded_token.get("type") != "password_reset":
            raise ValueError("Invalid token type")
        email = decoded_token.get("sub")
    except Exception: # Captura erros genéricos de JWT (expirado, assinatura inválida)
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.hashed_password = get_password_hash(payload.new_password)
    session.add(user)
    session.commit()
    
    return {"message": "Senha redefinida com sucesso."}

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
