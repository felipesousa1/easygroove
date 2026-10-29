import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import Cookie, Depends, FastAPI, Request, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.gzip import GZipMiddleware
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
from sqlalchemy.orm import selectinload
from sqlmodel import col, desc, func, select
from datetime import datetime, timezone

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria as tabelas do banco no startup se não existirem
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="EasyGroove", lifespan=lifespan)

# Compressão gzip de HTML, JSON da API e estáticos (HTML 400 KB -> ~25 KB, JS 260 KB -> ~55 KB)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Em produção os estáticos podem ficar alguns minutos em cache (ETag continua valendo depois);
# em desenvolvimento sempre revalidam, para o navegador nunca mostrar JS/CSS desatualizado.
ASSET_CACHE_CONTROL = (
    "public, max-age=600"
    if os.getenv("EASYGROOVE_ENV") == "production"
    else "no-cache"
)


class CachedStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code in (200, 304):
            response.headers["Cache-Control"] = ASSET_CACHE_CONTROL
        return response


app.mount("/assets", CachedStaticFiles(directory="app/static/assets"), name="assets")
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


@app.get("/healthz", include_in_schema=False)
async def healthz():
    # Verificação de saúde leve para o provedor de hospedagem (sem tocar no banco)
    return {"status": "ok"}


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
    sort_by: str = "edited",
    collection_id: Optional[int] = None,
    reverse: bool = False,
):
    """Arranjos do usuário com busca, coleção e ordenação.

    Critérios: "edited" (edição, mais recente primeiro), "created" (criação, mais recente primeiro)
    e "az" (nome, A-Z). `reverse` inverte a ordem de qualquer um deles.
    """
    # selectinload: carrega as coleções de todos os arranjos em 1 consulta extra (evita N+1)
    statement = (
        select(Arrangement)
        .options(selectinload(Arrangement.collections))
        .where(Arrangement.user_id == user.id)
    )

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
        order = func.lower(Arrangement.name)
        descending = reverse
    elif sort_by == "created":
        order = Arrangement.created_at
        descending = not reverse
    else:  # "edited"
        order = Arrangement.updated_at
        descending = not reverse

    statement = statement.order_by(desc(order) if descending else order.asc())
    return session.exec(statement).all()


def collection_counts(session: Session, user: User) -> dict:
    """Quantidade de arranjos por coleção, em uma consulta agregada (sem carregar os arranjos)."""
    rows = session.exec(
        select(ArrangementCollectionLink.collection_id, func.count())
        .join(Collection, Collection.id == ArrangementCollectionLink.collection_id)
        .where(Collection.user_id == user.id)
        .group_by(ArrangementCollectionLink.collection_id)
    ).all()
    return {collection_id: total for collection_id, total in rows}


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
            "collection_counts": collection_counts(session, current_user),
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
    sort_by: Optional[str] = Query(default="edited"),
    sort_reverse: Optional[str] = Query(default="0"),
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
        session, current_user, q or "", sort_by or "edited", collection_id, sort_reverse == "1"
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
            "collection_counts": collection_counts(session, current_user),
        },
    )
