from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel


class ArrangementCreate(BaseModel):
    name: str
    score_data: Dict[str, Any]
    collection_id: Optional[int] = None
    
class ArrangementUpdate(BaseModel):
    name: Optional[str] = None
    score_data: Optional[Dict[str, Any]] = None
    collection_id: Optional[int] = None

class ArrangementRead(BaseModel):
    id: int
    name: str
    score_data: Dict[str, Any]
    user_id: int
    collection_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
        
class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True
        
class CollectionCreate(BaseModel):
    name: str


class CollectionRead(BaseModel):
    id: int
    name: str
    user_id: int

    class Config:
        from_attributes = True