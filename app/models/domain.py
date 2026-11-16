from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from datetime import datetime, timezone

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    
    collections: List["Collection"] = Relationship(back_populates="user")
    arrangements: List["Arrangement"] = Relationship(back_populates="user")

class ArrangementCollectionLink(SQLModel, table=True):
    arrangement_id: Optional[int] = Field(default=None, foreign_key="arrangement.id", primary_key=True)
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id", primary_key=True)


class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    user_id: int = Field(foreign_key="user.id")
    
    user: Optional["User"] = Relationship()
    
    arrangements: List["Arrangement"] = Relationship(
        back_populates="collections",
        link_model=ArrangementCollectionLink
    )


class Arrangement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    score_data: Any = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: int = Field(foreign_key="user.id")
    
    user: Optional["User"] = Relationship()
    
    collections: List[Collection] = Relationship(
        back_populates="arrangements",
        link_model=ArrangementCollectionLink
    )

class AttemptLog(SQLModel, table=True):
    """Registro de tentativas (login falho, cadastro, recuperação de senha) para o limite de frequência.
    Fica no banco porque na Vercel cada requisição pode cair numa instância diferente."""
    id: Optional[int] = Field(default=None, primary_key=True)
    kind: str = Field(index=True)
    key: str = Field(index=True)
    created_at: datetime = Field(index=True)  # UTC, sem fuso
