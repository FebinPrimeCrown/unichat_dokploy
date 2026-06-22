from typing import List
from pydantic import BaseModel
from datetime import datetime

class WidgetCreate(BaseModel):
    name: str
    allowed_domains: List[str]
    special_indexes: List[str] = []

class WidgetOut(BaseModel):
    id: int
    name: str
    token: str
    allowed_domains: List[str]
    created_at: datetime
    is_active: bool

    class Config:
        orm_mode = True
