import json
import os

from sqlalchemy import event
from sqlmodel import SQLModel, create_engine, Session

# JSON compacto no banco (sem espaços): ~10 % menor, útil em bancos gratuitos com pouco espaço
def _json_serializer(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


# Produção (Vercel): DATABASE_URL aponta para um Postgres (Neon, Supabase...).
# Sem ela, usa o SQLite local (EASYGROOVE_DB, padrão easygroove.db na raiz).
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    # Provedores entregam "postgres://" ou "postgresql://"; o driver instalado é o psycopg 3
    for prefixo in ("postgres://", "postgresql://"):
        if DATABASE_URL.startswith(prefixo):
            DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len(prefixo):]
            break
    # pool_pre_ping: reabre conexões que o banco serverless fechou por inatividade
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=3,
        json_serializer=_json_serializer,
    )
else:
    sqlite_file_name = os.getenv("EASYGROOVE_DB", "easygroove.db")
    # check_same_thread=False é necessário para SQLite com FastAPI
    engine = create_engine(
        f"sqlite:///{sqlite_file_name}",
        connect_args={"check_same_thread": False},
        json_serializer=_json_serializer,
    )

    @event.listens_for(engine, "connect")
    def _tune_sqlite(dbapi_connection, _connection_record):
        # WAL: leituras não bloqueiam escritas; synchronous=NORMAL é seguro com WAL e bem mais rápido
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


def get_session():
    with Session(engine) as session:
        yield session
