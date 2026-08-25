from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import SQLModel

from app.database import engine
from app.models.domain import User, Collection, Arrangement  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria as tabelas do banco no startup se não existirem
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="EasyGroove", lifespan=lifespan)

app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")
templates = Jinja2Templates(directory="app/templates")


@app.get("/")
async def get_editor(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/login")
async def get_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/biblioteca")
async def get_biblioteca(request: Request):
    return templates.TemplateResponse(request=request, name="biblioteca.html")