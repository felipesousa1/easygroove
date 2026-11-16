import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt

# Em produção (EASYGROOVE_ENV=production) a chave vem obrigatoriamente do ambiente
IS_PRODUCTION = os.getenv("EASYGROOVE_ENV") == "production"

# Configuração do Token JWT
SECRET_KEY = os.getenv("EASYGROOVE_SECRET_KEY") or ""
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError("Defina EASYGROOVE_SECRET_KEY: em produção o app não inicia sem uma chave secreta.")
    SECRET_KEY = "easygroove-dev-key-nao-usar-em-producao"  # apenas desenvolvimento local
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias


def get_password_hash(password: str) -> str:
    """Gera o hash seguro da senha usando bcrypt puro."""
    # bcrypt exige bytes e tem limite de 72 bytes por design
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha enviada corresponde ao hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """Gera um token JWT assinado."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodifica e valida o token JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None