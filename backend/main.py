from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
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
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176",
        "http://localhost:5177", "http://127.0.0.1:5177",
        "http://localhost:5178", "http://127.0.0.1:5178",
        "http://localhost:5179", "http://127.0.0.1:5179",
    ],
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
    try:
        await db.commit()
        await db.refresh(db_chapter)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Project not found")
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
    try:
        await db.commit()
        await db.refresh(db_lore)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Project not found")
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

# --- Lore Relationships ---

class BulkLoreRelationshipRequest(BaseModel):
    project_id: int
    relationships: list[dict] # {"source": str, "target": str, "type": str}

@app.get("/api/lore-relationships", response_model=list[schemas.LoreRelationship])
async def get_lore_relationships(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreRelationship).where(models.LoreRelationship.project_id == project_id))
    return result.scalars().all()

@app.post("/api/lore-relationships/bulk")
async def bulk_create_lore_relationships(payload: BulkLoreRelationshipRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Fetch all lore entities for the project to map names to IDs
        result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == payload.project_id))
        entities = result.scalars().all()
        name_to_id = {e.name.lower(): e.id for e in entities}
        # Fetch existing relationships to prevent duplicates
        existing_rels = await db.execute(
            select(models.LoreRelationship).where(models.LoreRelationship.project_id == payload.project_id)
        )
        existing_set = {(r.source_id, r.target_id, r.relationship_type.strip().lower()) for r in existing_rels.scalars().all()}
        
        created_count = 0
        for rel in payload.relationships:
            source_name = rel.get('source')
            target_name = rel.get('target')
            rel_type = rel.get('type')
            
            if not isinstance(source_name, str) or not isinstance(target_name, str) or not isinstance(rel_type, str):
                continue
                
            source_id = name_to_id.get(source_name.lower())
            if not source_id:
                new_source = models.LoreEntity(project_id=payload.project_id, name=source_name, category='Concept')
                db.add(new_source)
                await db.flush()
                source_id = new_source.id
                name_to_id[source_name.lower()] = source_id
                
            target_id = name_to_id.get(target_name.lower())
            if not target_id:
                new_target = models.LoreEntity(project_id=payload.project_id, name=target_name, category='Concept')
                db.add(new_target)
                await db.flush()
                target_id = new_target.id
                name_to_id[target_name.lower()] = target_id
                
            if source_id and target_id:
                rel_tuple = (source_id, target_id, rel_type.strip().lower())
                if rel_tuple in existing_set:
                    continue
                existing_set.add(rel_tuple)
                
                # Create relationship
                db_rel = models.LoreRelationship(
                    project_id=payload.project_id,
                    source_id=source_id,
                    target_id=target_id,
                    relationship_type=rel_type
                )
                db.add(db_rel)
                created_count += 1
                
        await db.commit()
        return {"status": "ok", "created": created_count}
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Project not found")


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
    try:
        await db.commit()
        await db.refresh(db_character)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Project not found")
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
    try:
        await db.commit()
        await db.refresh(db_ledger)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Character or Chapter not found")
    return db_ledger

@app.post("/api/characters/{character_id}/accept-draft")
async def accept_action_draft(character_id: int, payload: schemas.AcceptDraftRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Run in a single transaction
        async with db.begin():
            # Update Character
            result = await db.execute(select(models.Character).where(models.Character.id == character_id))
            db_character = result.scalars().first()
            if not db_character:
                raise HTTPException(status_code=404, detail="Character not found")
            
            db_character.stats = payload.character_stats
            if payload.character_formulas is not None:
                db_character.formulas = payload.character_formulas
            
            # Insert Ledger
            db_ledger = models.Ledger(character_id=character_id, **payload.ledger.model_dump())
            db.add(db_ledger)
            
        # Transaction auto-commits upon exit of `async with db.begin()` block
        await db.refresh(db_ledger)
        return {"status": "ok", "ledger_id": db_ledger.id}
    except IntegrityError:
        raise HTTPException(status_code=404, detail="Character or Chapter not found")

# --- AI Engine Endpoints ---
from app.ai import extract_tactical_drafts, extract_ambient_lore
import json

import anyio

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
        
    drafts = await anyio.to_thread.run_sync(
        extract_tactical_drafts,
        request.system_box_text,
        request.surrounding_text,
        db_char.stats
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
    
    drafts = await anyio.to_thread.run_sync(
        extract_ambient_lore,
        request.narrative_text,
        wiki_index
    )
    return {"status": "ok", "drafts": drafts}
