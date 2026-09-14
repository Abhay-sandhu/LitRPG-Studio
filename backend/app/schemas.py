from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

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
    category: str
    description: Optional[str] = ''
    attributes: Optional[Dict[str, Any]] = {}
    is_promoted: Optional[bool] = False

class LoreEntityCreate(LoreEntityBase):
    project_id: int

class LoreEntityUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    is_promoted: Optional[bool] = None

class LoreEntity(LoreEntityBase):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class LoreRelationshipBase(BaseModel):
    source_id: int
    target_id: int
    relationship_type: str

class LoreRelationshipCreate(LoreRelationshipBase):
    project_id: int

class LoreRelationship(LoreRelationshipBase):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class LedgerBase(BaseModel):
    event_name: str
    changes: Dict[str, Any] = {}
    source_type: Optional[str] = "System Box"

class LedgerCreate(LedgerBase):
    chapter_id: int

class Ledger(LedgerBase):
    id: int
    character_id: int
    chapter_id: int
    timestamp: datetime
    class Config:
        from_attributes = True

class AcceptDraftRequest(BaseModel):
    character_stats: Dict[str, Any]
    character_formulas: Optional[Dict[str, Any]] = None
    ledger: LedgerCreate

class CharacterBase(BaseModel):
    name: str
    is_protagonist: Optional[bool] = False
    stats: Optional[Dict[str, Any]] = {}
    formulas: Optional[Dict[str, Any]] = {}
    lore_entity_id: Optional[int] = None

class CharacterCreate(CharacterBase):
    project_id: int

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    is_protagonist: Optional[bool] = None
    stats: Optional[Dict[str, Any]] = None
    formulas: Optional[Dict[str, Any]] = None
    lore_entity_id: Optional[int] = None

class Character(CharacterBase):
    id: int
    project_id: int
    ledgers: List[Ledger] = []
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str

class ProjectCreate(ProjectBase):
    pass

class ProjectListItem(ProjectBase):
    id: int
    class Config:
        from_attributes = True

class Project(ProjectBase):
    id: int
    chapters: List[Chapter] = []
    lore_entities: List[LoreEntity] = []
    characters: List[Character] = []
    class Config:
        from_attributes = True
