from pydantic import BaseModel
from typing import List, Optional

class ChapterBase(BaseModel):
    title: str
    content: Optional[str] = ''
    words: Optional[int] = 0
    order: Optional[int] = 0

class ChapterCreate(ChapterBase):
    project_id: int

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    words: Optional[int] = None
    order: Optional[int] = None

class Chapter(ChapterBase):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class LoreEntityBase(BaseModel):
    name: str
    type: str
    rank: str
    icon: str

class LoreEntityCreate(LoreEntityBase):
    project_id: int

class LoreEntity(LoreEntityBase):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    chapters: List[Chapter] = []
    lore_entities: List[LoreEntity] = []
    class Config:
        from_attributes = True
