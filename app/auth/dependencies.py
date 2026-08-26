from typing import Optional
from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.auth.security import decode_access_token
from app.database import get_session
from app.models.domain import User


def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
    session: Session = Depends(get_session),
) -> User:
    """Extrai e valida o usuário a partir do cookie HTTP-Only access_token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação não fornecidas ou inválidas.",
    )

    if not access_token:
        raise credentials_exception

    # Trata o prefixo 'Bearer ' caso exista no valor do cookie
    token_str = access_token
    if access_token.startswith("Bearer "):
        token_str = access_token.split(" ")[1]

    payload = decode_access_token(token_str)
    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = session.get(User, int(user_id))
    if user is None:
        raise credentials_exception

    return user