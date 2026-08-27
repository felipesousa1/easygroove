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

class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    user_id: int = Field(foreign_key="user.id")
    
    user: User = Relationship(back_populates="collections")
    arrangements: List["Arrangement"] = Relationship(back_populates="collection")

class Arrangement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
   
    # Armazena o JSON puro do editor
    score_data: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="arrangements")
    
    # FK opcional (pode ficar solto na biblioteca)
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id")
    collection: Optional[Collection] = Relationship(back_populates="arrangements")