from contextlib import asynccontextmanager
from typing import Optional
from fastapi import Cookie, Depends, FastAPI, Request, status
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, SQLModel, select

from app.database import engine, get_session
from app.models.domain import User, Collection, Arrangement  # noqa: F401
from app.routers import arrangements, auth, collections
from app.auth.security import decode_access_token

from typing import Optional
from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlmodel import col, desc, func, select


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria as tabelas do banco no startup se não existirem
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="EasyGroove", lifespan=lifespan)

app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")
templates = Jinja2Templates(directory="app/templates")

app.include_router(arrangements.router)
app.include_router(auth.router)
app.include_router(collections.router)

def get_user_from_cookie(
    access_token: Optional[str] = Cookie(default=None),
    session: Session = Depends(get_session),
) -> Optional[User]:
    if not access_token:
        return None
    token_str = access_token
    if access_token.startswith("Bearer "):
        token_str = access_token.split(" ")[1]
    payload = decode_access_token(token_str)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return session.get(User, int(user_id))

@app.get("/")
async def get_editor(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/login")
async def get_login(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
):
    # Se já estiver logado, manda direto para a biblioteca
    if current_user:
        return RedirectResponse(url="/biblioteca", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/biblioteca")
async def get_biblioteca(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
    session: Session = Depends(get_session),
):
    if not current_user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    # Busca arranjos e coleções do usuário
    user_arrangements = session.exec(
        select(Arrangement).where(Arrangement.user_id == current_user.id)
    ).all()
    user_collections = session.exec(
        select(Collection).where(Collection.user_id == current_user.id)
    ).all()

    return templates.TemplateResponse(
        request=request,
        name="biblioteca.html",
        context={
            "user": current_user,
            "arrangements": user_arrangements,
            "collections": user_collections,
        },
    )

@app.get("/biblioteca/search", response_class=HTMLResponse)
async def search_arrangements(
    request: Request,
    q: Optional[str] = Query(default=""),
    sort_by: Optional[str] = Query(default="az"),
    collection_id: Optional[int] = Query(default=None),
    current_user: Optional[User] = Depends(get_user_from_cookie),
    session: Session = Depends(get_session),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    statement = select(Arrangement).where(Arrangement.user_id == current_user.id)

    # Filtro por texto na busca
    if q and q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(col(Arrangement.name).ilike(term))

    # Filtro por coleção
    if collection_id is not None:
        statement = statement.where(Arrangement.collection_id == collection_id)

    # Ordenação
    if sort_by == "az":
        statement = statement.order_by(func.lower(Arrangement.name).asc())
    elif sort_by == "recent":
        statement = statement.order_by(desc(Arrangement.created_at))
    elif sort_by == "old":
        statement = statement.order_by(Arrangement.created_at.asc())

    arrangements = session.exec(statement).all()

    return templates.TemplateResponse(
        request=request,
        name="partials/arrangements_grid.html",
        context={"arrangements": arrangements},
    )