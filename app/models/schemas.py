from datetime import datetime
from typing import Any, Dict, Optional
import json

from pydantic import BaseModel, field_validator


MAX_SCORE_DATA_BYTES = 500_000  # um arranjo real tem ~6 KB; o limite só barra abuso em hospedagem gratuita


def _check_score_size(value):
    if value is not None and len(json.dumps(value, separators=(",", ":"))) > MAX_SCORE_DATA_BYTES:
        raise ValueError("O arranjo é grande demais.")
    return value


class ArrangementCreate(BaseModel):
    name: str
    score_data: Dict[str, Any]

    _validate_score = field_validator("score_data")(_check_score_size)
    
class ArrangementRead(BaseModel):
    id: int
    name: str
    score_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class ArrangementUpdate(BaseModel):
    name: Optional[str] = None
    score_data: Optional[Dict[str, Any]] = None

    _validate_score = field_validator("score_data")(_check_score_size)
       
 
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
        
class UserCreate(BaseModel):
    username: str
    email: str
    password: str