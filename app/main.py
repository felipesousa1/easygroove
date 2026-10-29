from contextlib import asynccontextmanager
from typing import Optional
from fastapi import Cookie, Depends, FastAPI, Request, status
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, SQLModel, select

from app.database import engine, get_session
from app.models.domain import User, Collection, Arrangement, ArrangementCollectionLink  # noqa: F401
from app.routers import arrangements, auth, collections
from app.auth.security import decode_access_token
from app.config import SITE
from app.score_meta import get_arrangement_meta, render_score_preview

from typing import Optional
from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlmodel import col, desc, func, select
from datetime import datetime, timezone

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria as tabelas do banco no startup se não existirem
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="EasyGroove", lifespan=lifespan)

app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
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
async def get_index(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
):
    # Se o usuário já estiver logado, redireciona para a biblioteca
    if current_user:
        return RedirectResponse(url="/biblioteca", status_code=status.HTTP_303_SEE_OTHER)
    # Se não estiver logado, exibe a página de login por padrão
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/app")
async def get_editor(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
):
    # Rota dedicada para o Editor de Arranjos (acessível também como convidado, sem salvar/biblioteca)
    return templates.TemplateResponse(
        request=request,
        name="app.html",
        context={"is_guest": current_user is None},
    )

def format_relative_time(dt: datetime) -> str:
    """Formata data relativa baseada no horário UTC atual."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 0:
        return "editado agora há pouco"
    
    # Mesmo dia
    if now.date() == dt.date():
        minutes = seconds // 60
        if minutes < 1:
            return "editado agora há pouco"
        if minutes < 60:
            return f"editado há {minutes} min"
        hours = minutes // 60
        return f"editado há {hours}h"
    
    # Dia anterior
    days = (now.date() - dt.date()).days
    if days == 1:
        return "editado ontem"
    
    # Mais de 1 dia
    return "editado em " + dt.strftime('%d/%m/%Y')

# Injeta a função nos templates Jinja2
templates.env.filters["relative_time"] = format_relative_time
templates.env.filters["arr_meta"] = get_arrangement_meta
templates.env.filters["score_preview"] = render_score_preview
templates.env.globals["site"] = SITE
templates.env.globals["current_year"] = lambda: datetime.now().year

def query_user_arrangements(
    session: Session,
    user: User,
    q: str = "",
    sort_by: str = "edited_desc",
    collection_id: Optional[int] = None,
):
    """Arranjos do usuário com busca, coleção e ordenação."""
    statement = select(Arrangement).where(Arrangement.user_id == user.id)

    # Filtro por texto na busca
    if q and q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(col(Arrangement.name).ilike(term))

    # Filtro por coleção (N:M)
    if collection_id is not None:
        statement = statement.join(ArrangementCollectionLink).where(
            ArrangementCollectionLink.collection_id == collection_id
        )

    # Ordenação
    if sort_by == "az":
        statement = statement.order_by(func.lower(Arrangement.name).asc())
    elif sort_by == "za":
        statement = statement.order_by(func.lower(Arrangement.name).desc())
    elif sort_by == "edited_asc":
        statement = statement.order_by(Arrangement.updated_at.asc())
    elif sort_by == "created_desc":
        statement = statement.order_by(desc(Arrangement.created_at))
    elif sort_by == "created_asc":
        statement = statement.order_by(Arrangement.created_at.asc())
    else:  # "edited_desc": edição mais recente primeiro
        statement = statement.order_by(desc(Arrangement.updated_at))

    return session.exec(statement).all()


@app.get("/biblioteca")
async def get_biblioteca(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
    session: Session = Depends(get_session),
):
    if not current_user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    # Busca arranjos (mais recentes primeiro, igual à opção inicial do filtro) e coleções do usuário
    user_arrangements = query_user_arrangements(session, current_user)
    user_collections = session.exec(
        select(Collection).where(Collection.user_id == current_user.id).order_by(func.lower(Collection.name))
    ).all()

    last_edited = max(user_arrangements, key=lambda a: a.updated_at, default=None)

    return templates.TemplateResponse(
        request=request,
        name="biblioteca.html",
        context={
            "user": current_user,
            "arrangements": user_arrangements,
            "collections": user_collections,
            "collection_counts": {c.id: len(c.arrangements) for c in user_collections},
            "has_any": bool(user_arrangements),
            "q": "",
            "stats": {
                "arranjos": len(user_arrangements),
                "colecoes": len(user_collections),
                "ultimo": last_edited,
            },
        },
    )

@app.get("/biblioteca/search", response_class=HTMLResponse)
async def search_arrangements(
    request: Request,
    q: Optional[str] = Query(default=""),
    sort_by: Optional[str] = Query(default="edited_desc"),
    collection_id: Optional[str] = Query(default=""),
    current_user: Optional[User] = Depends(get_user_from_cookie),
    session: Session = Depends(get_session),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    # Vem como texto: o campo oculto da página envia "" quando nenhuma coleção está ativa
    collection_id = int(collection_id) if collection_id and collection_id.isdigit() else None

    arrangements = query_user_arrangements(
        session, current_user, q or "", sort_by or "edited_desc", collection_id
    )
    total = session.exec(
        select(func.count()).select_from(Arrangement).where(Arrangement.user_id == current_user.id)
    ).one()

    return templates.TemplateResponse(
        request=request,
        name="partials/arrangements_grid.html",
        context={
            "arrangements": arrangements,
            "current_collection_id": collection_id,
            "has_any": total > 0,
            "q": (q or "").strip(),
        },
    )


@app.get("/biblioteca/collections", response_class=HTMLResponse)
async def list_collections_partial(
    request: Request,
    current_user: Optional[User] = Depends(get_user_from_cookie),
    session: Session = Depends(get_session),
):
    """Lista de coleções (com contadores) para atualizar a sidebar sem recarregar a página."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    user_collections = session.exec(
        select(Collection).where(Collection.user_id == current_user.id).order_by(func.lower(Collection.name))
    ).all()

    return templates.TemplateResponse(
        request=request,
        name="partials/collections_list.html",
        context={
            "collections": user_collections,
            "collection_counts": {c.id: len(c.arrangements) for c in user_collections},
        },
    )
