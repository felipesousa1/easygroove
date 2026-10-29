import json
import os

from sqlalchemy import event
from sqlmodel import SQLModel, create_engine, Session

# Caminho do banco (em hospedagem com disco persistente, aponte EASYGROOVE_DB para ele)
sqlite_file_name = os.getenv("EASYGROOVE_DB", "easygroove.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread=False é necessário para SQLite assíncrono/FastAPI
connect_args = {"check_same_thread": False}

# JSON compacto no banco (sem espaços): ~10 % menor, útil em bancos gratuitos com pouco espaço
engine = create_engine(
    sqlite_url,
    connect_args=connect_args,
    json_serializer=lambda obj: json.dumps(obj, separators=(",", ":"), ensure_ascii=False),
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
