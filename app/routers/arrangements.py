import copy
import re
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status, UploadFile, File
from sqlmodel import Session, select, func, text

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.domain import Arrangement, User, ArrangementCollectionLink, Collection
from app.models.schemas import (
    ArrangementCreate,
    ArrangementRead,
    ArrangementUpdate,
)
from pydantic import BaseModel

import os
import shutil
import uuid

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
COVERS_DIR = os.path.join("app", "static", "uploads", "covers")
os.makedirs(COVERS_DIR, exist_ok=True)


router = APIRouter(prefix="/api/arrangements", tags=["arrangements"])


def normalize_name(name: str) -> str:
    """Remove múltiplos espaços internos e nas extremidades."""
    return re.sub(r"\s+", " ", name).strip()


@router.post(
    "", 
    response_model=ArrangementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_arrangement(
    arrangement_in: ArrangementCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    clean_name = normalize_name(arrangement_in.name)
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do arranjo não pode ser vazio.",
        )

    # Checa duplicidade case-insensitive para o mesmo usuário
    existing = session.exec(
        select(Arrangement).where(
            Arrangement.user_id == current_user.id,
            func.lower(Arrangement.name) == clean_name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Você já possui um arranjo chamado "{clean_name}".',
        )

    db_arrangement = Arrangement(
        name=clean_name,
        score_data=arrangement_in.score_data,
        # collection_id=arrangement_in.collection_id,
        user_id=current_user.id,
    )
    session.add(db_arrangement)
    session.commit()
    session.refresh(db_arrangement)
    return db_arrangement


def unique_name(session: Session, user: User, base: str, suffix: str = "") -> str:
    """Gera um nome livre para o usuário: "Base", "Base (2)"... ou, com suffix, "Base (Cópia)", "Base (Cópia 2)"."""
    base = normalize_name(base) or "Novo arranjo"
    taken = {
        name.lower()
        for name in session.exec(select(Arrangement.name).where(Arrangement.user_id == user.id)).all()
    }

    first = f"{base} ({suffix})" if suffix else base
    if first.lower() not in taken:
        return first

    counter = 2
    while True:
        candidate = f"{base} ({suffix} {counter})" if suffix else f"{base} ({counter})"
        if candidate.lower() not in taken:
            return candidate
        counter += 1


@router.post(
    "/import",
    response_model=ArrangementRead,
    status_code=status.HTTP_201_CREATED,
)
def import_arrangement(
    arrangement_in: ArrangementCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cria um arranjo a partir de um JSON importado; nome repetido ganha um número em vez de erro."""
    instruments = arrangement_in.score_data.get("instruments")
    if not isinstance(instruments, list) or not instruments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estrutura do arquivo JSON inválida.",
        )

    name = unique_name(session, current_user, arrangement_in.name)
    score_data = {**arrangement_in.score_data, "title": name}

    db_arrangement = Arrangement(name=name, score_data=score_data, user_id=current_user.id)
    session.add(db_arrangement)
    session.commit()
    session.refresh(db_arrangement)
    return db_arrangement


@router.post(
    "/{arrangement_id}/duplicate",
    response_model=ArrangementRead,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_arrangement(
    arrangement_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    original = session.get(Arrangement, arrangement_id)
    if not original or original.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    name = unique_name(session, current_user, original.name, suffix="Cópia")
    score_data = copy.deepcopy(original.score_data) if isinstance(original.score_data, dict) else {}
    score_data["title"] = name

    # A capa não é copiada: cada arranjo gerencia o próprio arquivo de imagem
    duplicate = Arrangement(name=name, score_data=score_data, user_id=current_user.id)
    duplicate.collections = list(original.collections)
    session.add(duplicate)
    session.commit()
    session.refresh(duplicate)
    return duplicate


@router.get("/{arrangement_id}", response_model=ArrangementRead)
def get_arrangement(
    arrangement_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement or arrangement.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )
    return arrangement


@router.get("", response_model=List[ArrangementRead])
def list_arrangements(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(Arrangement)
        .where(Arrangement.user_id == current_user.id)
        .order_by(Arrangement.created_at.desc())
    )
    arrangements = session.exec(statement).all()
    return arrangements


@router.put("/{arrangement_id}", response_model=ArrangementRead)
def update_arrangement(
    arrangement_id: int,
    arrangement_in: ArrangementUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement or arrangement.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    update_data = arrangement_in.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        clean_name = normalize_name(update_data["name"])
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome do arranjo não pode ser vazio.",
            )

        # Checa duplicidade ignorando o próprio ID do registro
        existing = session.exec(
            select(Arrangement).where(
                Arrangement.user_id == current_user.id,
                Arrangement.id != arrangement_id,
                func.lower(Arrangement.name) == clean_name.lower(),
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Você já possui um arranjo chamado "{clean_name}".',
            )
        update_data["name"] = clean_name

    for key, value in update_data.items():
        setattr(arrangement, key, value)
        
    arrangement.updated_at = datetime.now(timezone.utc)

    session.add(arrangement)
    session.commit()
    session.refresh(arrangement)
    return arrangement


@router.delete("/{arrangement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_arrangement(
    arrangement_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement or arrangement.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    session.delete(arrangement)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{arrangement_id}/cover", response_model=ArrangementRead)
def upload_arrangement_cover(
    arrangement_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement or arrangement.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagem inválido. Use PNG, JPG, JPEG ou WEBP.",
        )

    filename = f"cover_{arrangement_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(COVERS_DIR, filename)

    # Salva o arquivo em disco
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Remove imagem antiga se existir
    if arrangement.cover_url:
        old_path = os.path.join("app", arrangement.cover_url.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    arrangement.cover_url = f"/static/uploads/covers/{filename}"
    arrangement.updated_at = datetime.now(timezone.utc)
    session.add(arrangement)
    session.commit()
    session.refresh(arrangement)
    return arrangement

class CollectionSyncRequest(BaseModel):
    collection_ids: List[int]

@router.put("/{arrangement_id}/collections", status_code=status.HTTP_200_OK)
def sync_arrangement_collections(
    arrangement_id: int,
    req: CollectionSyncRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Sincroniza as coleções de um arranjo (Modal de checkboxes)"""
    arr = session.get(Arrangement, arrangement_id)
    if not arr or arr.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Arranjo não encontrado.")

    # Remove vínculos atuais
    session.exec(
        text("DELETE FROM arrangementcollectionlink WHERE arrangement_id = :arr_id"),
        params={"arr_id": arrangement_id}
    )
    
    # Adiciona novos vínculos
    for col_id in req.collection_ids:
        # Verifica se a coleção pertence ao usuário
        col = session.get(Collection, col_id)
        if col and col.user_id == current_user.id:
            link = ArrangementCollectionLink(arrangement_id=arrangement_id, collection_id=col_id)
            session.add(link)
            
    session.commit()
    return {"status": "ok"}


@router.post("/{arrangement_id}/collections/{collection_id}", status_code=status.HTTP_201_CREATED)
def link_arrangement_to_collection(
    arrangement_id: int,
    collection_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Adiciona um arranjo a uma coleção específica (Drag & Drop)"""
    arr = session.get(Arrangement, arrangement_id)
    col = session.get(Collection, collection_id)
    
    if not arr or arr.user_id != current_user.id or not col or col.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Recurso não encontrado.")
        
    existing = session.get(ArrangementCollectionLink, (arrangement_id, collection_id))
    if not existing:
        link = ArrangementCollectionLink(arrangement_id=arrangement_id, collection_id=collection_id)
        session.add(link)
        session.commit()
        
    return {"status": "ok"}

@router.delete("/{arrangement_id}/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_arrangement_collection(
    arrangement_id: int,
    collection_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Remove um arranjo de uma coleção específica (Desvincular)"""
    link = session.get(ArrangementCollectionLink, (arrangement_id, collection_id))
    if link:
        # Verifica posse do arranjo
        arr = session.get(Arrangement, arrangement_id)
        if arr and arr.user_id == current_user.id:
            session.delete(link)
            session.commit()
            
    return Response(status_code=status.HTTP_204_NO_CONTENT)