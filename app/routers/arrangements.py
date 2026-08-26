from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.domain import Arrangement, User
from app.models.schemas import ArrangementCreate, ArrangementRead

router = APIRouter(prefix="/api/arrangements", tags=["arrangements"])


@router.post(
    "",
    response_model=ArrangementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_arrangement(
    arrangement_in: ArrangementCreate,
    session: Session = Depends(get_session),
):
    # Mock provisório enquanto não integramos auth (Bloco 11)
    user = session.exec(select(User)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum usuário encontrado no banco para associar o arranjo.",
        )

    db_arrangement = Arrangement(
        name=arrangement_in.name,
        score_data=arrangement_in.score_data,
        collection_id=arrangement_in.collection_id,
        user_id=user.id,
    )
    session.add(db_arrangement)
    session.commit()
    session.refresh(db_arrangement)
    return db_arrangement


@router.get("/{arrangement_id}", response_model=ArrangementRead)
def get_arrangement(
    arrangement_id: int,
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )
    return arrangement


@router.get("", response_model=List[ArrangementRead])
def list_arrangements(session: Session = Depends(get_session)):
    arrangements = session.exec(select(Arrangement)).all()
    return arrangements