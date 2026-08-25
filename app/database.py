from sqlmodel import SQLModel, create_engine, Session

sqlite_file_name = "easygroove.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread=False é necessário para SQLite assíncrono/FastAPI
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def get_session():
    with Session(engine) as session:
        yield session