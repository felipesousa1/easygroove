import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select, func

from app.auth.dependencies import get_current_user
from app.database import get_session
from app.models.domain import Collection, User
from app.models.schemas import CollectionCreate, CollectionRead

router = APIRouter(prefix="/api/collections", tags=["collections"])


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


@router.post("", response_model=CollectionRead, status_code=status.HTTP_201_CREATED)
def create_collection(
    collection_in: CollectionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    clean_name = normalize_name(collection_in.name)
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome da coleção não pode ser vazio.",
        )

    # Checa duplicidade de coleção para o usuário
    existing = session.exec(
        select(Collection).where(
            Collection.user_id == current_user.id,
            func.lower(Collection.name) == clean_name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Você já possui uma coleção chamada "{clean_name}".',
        )

    db_collection = Collection(name=clean_name, user_id=current_user.id)
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)
    return db_collection


@router.get("", response_model=List[CollectionRead])
def list_collections(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.name.asc())
    )
    return session.exec(statement).all()

@router.put("/{collection_id}", response_model=CollectionRead)
def update_collection(
    collection_id: int,
    collection_in: CollectionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    col = session.get(Collection, collection_id)
    if not col or col.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coleção não encontrada.",
        )

    clean_name = normalize_name(collection_in.name)
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome da coleção não pode ser vazio.",
        )

    # Checa duplicidade ignorando a própria coleção
    existing = session.exec(
        select(Collection).where(
            Collection.user_id == current_user.id,
            Collection.id != collection_id,
            func.lower(Collection.name) == clean_name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Você já possui uma coleção chamada "{clean_name}".',
        )

    col.name = clean_name
    session.add(col)
    session.commit()
    session.refresh(col)
    return col


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    col = session.get(Collection, collection_id)
    if not col or col.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coleção não encontrada.",
        )

    session.delete(col)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)