from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select

from app.database import get_session
from app.models.domain import Arrangement, User
from app.models.schemas import ArrangementCreate, ArrangementRead, ArrangementUpdate

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
    # Mock provisório enquanto não integramos auth
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

@router.put("/{arrangement_id}", response_model=ArrangementRead)
def update_arrangement(
    arrangement_id: int,
    arrangement_in: ArrangementUpdate,
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    # Atualiza apenas os campos enviados no payload
    update_data = arrangement_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(arrangement, key, value)

    session.add(arrangement)
    session.commit()
    session.refresh(arrangement)
    return arrangement

@router.delete("/{arrangement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_arrangement(
    arrangement_id: int,
    session: Session = Depends(get_session),
):
    arrangement = session.get(Arrangement, arrangement_id)
    if not arrangement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arranjo não encontrado.",
        )

    session.delete(arrangement)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)