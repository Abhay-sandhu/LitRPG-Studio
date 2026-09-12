from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from app import models, schemas
from app.database import engine, Base, get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="ChronicleRPG Studio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy.orm import noload

@app.get("/api/projects", response_model=list[schemas.ProjectListItem])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).options(noload('*')))
    return result.scalars().all()

@app.post("/api/projects", response_model=schemas.Project)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = models.Project(title=project.title)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@app.get("/api/chapters", response_model=list[schemas.Chapter])
async def get_chapters(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chapter).where(models.Chapter.project_id == project_id).order_by(models.Chapter.order))
    return result.scalars().all()

@app.get("/api/chapters/{chapter_id}", response_model=schemas.Chapter)
async def get_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chapter).where(models.Chapter.id == chapter_id))
    db_chapter = result.scalars().first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter

@app.post("/api/chapters", response_model=schemas.Chapter)
async def create_chapter(chapter: schemas.ChapterCreate, db: AsyncSession = Depends(get_db)):
    db_chapter = models.Chapter(**chapter.model_dump())
    db.add(db_chapter)
    await db.commit()
    await db.refresh(db_chapter)
    return db_chapter

@app.put("/api/chapters/{chapter_id}", response_model=schemas.Chapter)
async def update_chapter(chapter_id: int, chapter_update: schemas.ChapterUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chapter).where(models.Chapter.id == chapter_id))
    db_chapter = result.scalars().first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = chapter_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_chapter, key, value)
        
    await db.commit()
    await db.refresh(db_chapter)
    return db_chapter

@app.delete("/api/chapters/{chapter_id}")
async def delete_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Chapter).where(models.Chapter.id == chapter_id))
    db_chapter = result.scalars().first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    await db.delete(db_chapter)
    await db.commit()
    return {"status": "ok"}

@app.get("/api/lore", response_model=list[schemas.LoreEntity])
async def get_lore(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == project_id))
    return result.scalars().all()

@app.post("/api/lore", response_model=schemas.LoreEntity)
async def create_lore(lore: schemas.LoreEntityCreate, db: AsyncSession = Depends(get_db)):
    db_lore = models.LoreEntity(**lore.model_dump())
    db.add(db_lore)
    await db.commit()
    await db.refresh(db_lore)
    return db_lore

@app.put("/api/lore/{lore_id}", response_model=schemas.LoreEntity)
async def update_lore(lore_id: int, lore_update: schemas.LoreEntityUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.id == lore_id))
    db_lore = result.scalars().first()
    if not db_lore:
        raise HTTPException(status_code=404, detail="Lore entity not found")
    
    update_data = lore_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lore, key, value)
        
    await db.commit()
    await db.refresh(db_lore)
    return db_lore

@app.delete("/api/lore/{lore_id}")
async def delete_lore(lore_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.id == lore_id))
    db_lore = result.scalars().first()
    if not db_lore:
        raise HTTPException(status_code=404, detail="Lore entity not found")
    await db.delete(db_lore)
    await db.commit()
    return {"status": "ok"}

# --- Characters ---

@app.get("/api/characters", response_model=list[schemas.Character])
async def get_characters(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.project_id == project_id))
    return result.scalars().all()

@app.get("/api/characters/{character_id}", response_model=schemas.Character)
async def get_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character

@app.post("/api/characters", response_model=schemas.Character)
async def create_character(character: schemas.CharacterCreate, db: AsyncSession = Depends(get_db)):
    db_character = models.Character(**character.model_dump())
    db.add(db_character)
    await db.commit()
    await db.refresh(db_character)
    return db_character

@app.put("/api/characters/{character_id}", response_model=schemas.Character)
async def update_character(character_id: int, character_update: schemas.CharacterUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    update_data = character_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_character, key, value)
        
    await db.commit()
    await db.refresh(db_character)
    return db_character

@app.delete("/api/characters/{character_id}")
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    await db.delete(db_character)
    await db.commit()
    return {"status": "ok"}

# --- Ledgers ---

@app.get("/api/characters/{character_id}/ledger", response_model=list[schemas.Ledger])
async def get_character_ledger(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Ledger).where(models.Ledger.character_id == character_id).order_by(models.Ledger.timestamp.desc())
    )
    return result.scalars().all()

@app.post("/api/characters/{character_id}/ledger", response_model=schemas.Ledger)
async def create_ledger_entry(character_id: int, ledger: schemas.LedgerCreate, db: AsyncSession = Depends(get_db)):
    db_ledger = models.Ledger(character_id=character_id, **ledger.model_dump())
    db.add(db_ledger)
    await db.commit()
    await db.refresh(db_ledger)
    return db_ledger

@app.post("/api/characters/{character_id}/accept-draft")
async def accept_action_draft(character_id: int, payload: schemas.AcceptDraftRequest, db: AsyncSession = Depends(get_db)):
    # Run in a single transaction
    async with db.begin():
        # Update Character
        result = await db.execute(select(models.Character).where(models.Character.id == character_id))
        db_character = result.scalars().first()
        if not db_character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        db_character.stats = payload.character_stats
        
        # Insert Ledger
        db_ledger = models.Ledger(character_id=character_id, **payload.ledger.model_dump())
        db.add(db_ledger)
        
    # Transaction auto-commits upon exit of `async with db.begin()` block
    await db.refresh(db_ledger)
    return {"status": "ok", "ledger_id": db_ledger.id}

# --- AI Engine Endpoints ---
from app.ai import extract_tactical_drafts, extract_ambient_lore
import json
from pydantic import BaseModel

from typing import Optional

class TacticalAIRequest(BaseModel):
    system_box_text: str
    surrounding_text: str
    project_id: int
    character_id: Optional[int] = None

@app.post("/api/ai/tactical")
async def trigger_tactical_ai(request: TacticalAIRequest, db: AsyncSession = Depends(get_db)):
    db_char = None
    if request.character_id:
        result = await db.execute(select(models.Character).where(models.Character.id == request.character_id))
        db_char = result.scalars().first()
    else:
        # Primary Fallback: Protagonist
        result = await db.execute(select(models.Character).where(
            models.Character.project_id == request.project_id, 
            models.Character.is_protagonist == True
        ))
        db_char = result.scalars().first()
        
        # Secondary Fallback: Any character in project
        if not db_char:
            result = await db.execute(select(models.Character).where(
                models.Character.project_id == request.project_id
            ))
            db_char = result.scalars().first()
            
    if not db_char:
        raise HTTPException(status_code=404, detail="Character not found")
        
    drafts = extract_tactical_drafts(
        system_box_text=request.system_box_text,
        context_text=request.surrounding_text,
        current_stats=db_char.stats
    )
    return {"status": "ok", "drafts": drafts}

class AmbientAIRequest(BaseModel):
    narrative_text: str
    project_id: int

@app.post("/api/ai/ambient")
async def trigger_ambient_ai(request: AmbientAIRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == request.project_id))
    lore_entities = result.scalars().all()
    wiki_index = [{"name": l.name, "category": l.category} for l in lore_entities]
    
    drafts = extract_ambient_lore(
        narrative_text=request.narrative_text,
        wiki_index=wiki_index
    )
    return {"status": "ok", "drafts": drafts}
