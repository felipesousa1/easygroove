from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlmodel import Session, delete, func, select

from app.models.domain import AttemptLog


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def client_ip(request: Request) -> str:
    """IP do visitante. Na Vercel o x-forwarded-for é definido pela própria plataforma."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def count_recent(session: Session, kind: str, key: str, window: timedelta) -> int:
    since = _now() - window
    return session.exec(
        select(func.count()).select_from(AttemptLog).where(
            AttemptLog.kind == kind, AttemptLog.key == key, AttemptLog.created_at >= since
        )
    ).one()


def enforce(session: Session, kind: str, key: str, limit: int, window: timedelta, message: str) -> None:
    """Levanta 429 se já houve `limit` ou mais registros desse tipo/chave dentro da janela."""
    if count_recent(session, kind, key, window) >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=message)


def record(session: Session, kind: str, key: str) -> None:
    session.add(AttemptLog(kind=kind, key=key, created_at=_now()))
    # Limpeza oportunista: nada guardado por mais de 1 dia
    session.exec(delete(AttemptLog).where(AttemptLog.created_at < _now() - timedelta(days=1)))
    session.commit()


def clear(session: Session, kind: str, key: str) -> None:
    session.exec(delete(AttemptLog).where(AttemptLog.kind == kind, AttemptLog.key == key))
    session.commit()
