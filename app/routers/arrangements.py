import re
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status, UploadFile, File
from sqlmodel import Session, select, func

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.domain import Arrangement, User
from app.models.schemas import (
    ArrangementCreate,
    ArrangementRead,
    ArrangementUpdate,
)

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
        collection_id=arrangement_in.collection_id,
        user_id=current_user.id,
    )
    session.add(db_arrangement)
    session.commit()
    session.refresh(db_arrangement)
    return db_arrangement


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