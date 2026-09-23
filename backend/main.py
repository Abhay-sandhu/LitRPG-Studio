from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update
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
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy.orm import noload
from sqlalchemy.orm.attributes import flag_modified

@app.get("/api/projects", response_model=list[schemas.ProjectListItem])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).options(noload('*')).order_by(models.Project.id))
    return result.scalars().all()

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/api/projects", response_model=schemas.Project)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    trimmed_title = project.title.strip()
    if not trimmed_title:
        raise HTTPException(status_code=400, detail="Project title cannot be empty")
    db_project = models.Project(title=trimmed_title)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        await db.delete(project)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete project because it is in use")
    return {"status": "ok"}

@app.get("/api/chapters", response_model=list[schemas.Chapter])
async def get_chapters(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Chapter)
        .where(models.Chapter.project_id == project_id)
        .order_by(models.Chapter.order, models.Chapter.id)
    )
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
    trimmed_title = chapter.title.strip()
    if not trimmed_title:
        raise HTTPException(status_code=400, detail="Chapter title cannot be empty")
    chapter_dict = chapter.model_dump()
    chapter_dict['title'] = trimmed_title
    if chapter_dict.get('words') is not None and chapter_dict['words'] < 0:
        chapter_dict['words'] = 0
    db_chapter = models.Chapter(**chapter_dict)
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
    if 'title' in update_data:
        trimmed_title = (update_data['title'] or '').strip()
        if not trimmed_title:
            raise HTTPException(status_code=400, detail="Chapter title cannot be empty")
        update_data['title'] = trimmed_title

    if 'words' in update_data and update_data['words'] is not None and update_data['words'] < 0:
        update_data['words'] = 0

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
    try:
        await db.delete(db_chapter)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete chapter because it is in use")
    return {"status": "ok"}

@app.get("/api/lore", response_model=list[schemas.LoreEntity])
async def get_lore(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.LoreEntity)
        .where(models.LoreEntity.project_id == project_id)
        .order_by(models.LoreEntity.name)
    )
    return result.scalars().all()

@app.post("/api/lore", response_model=schemas.LoreEntity)
async def create_lore(lore: schemas.LoreEntityCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, lore.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    trimmed_name = lore.name.strip()
    if not trimmed_name:
        raise HTTPException(status_code=400, detail="Lore entity name cannot be empty")

    # Prevent duplicate lore entities within the same project (case-insensitive)
    existing_result = await db.execute(
        select(models.LoreEntity).where(
            models.LoreEntity.project_id == lore.project_id,
            func.lower(models.LoreEntity.name) == trimmed_name.lower()
        )
    )
    existing = existing_result.scalars().first()
    if existing:
        # Enrich the existing placeholder / entity with new data
        if lore.category and (existing.category == 'Concept' or lore.category != 'Concept'):
            existing.category = lore.category
        if lore.description:
            existing.description = lore.description
        if lore.attributes:
            merged_attrs = dict(existing.attributes or {})
            merged_attrs.update(lore.attributes)
            existing.attributes = merged_attrs
        if lore.is_promoted is not None:
            existing.is_promoted = lore.is_promoted
        await db.commit()
        await db.refresh(existing)
        return existing

    lore_data = lore.model_dump()
    lore_data['name'] = trimmed_name
    db_lore = models.LoreEntity(**lore_data)
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
    if 'name' in update_data:
        trimmed_name = (update_data['name'] or '').strip()
        if not trimmed_name:
            raise HTTPException(status_code=400, detail="Lore entity name cannot be empty")
        update_data['name'] = trimmed_name

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
    try:
        await db.delete(db_lore)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete lore because it is in use")
    return {"status": "ok"}

# --- Lore Relationships ---

class BulkLoreRelationshipRequest(BaseModel):
    project_id: int
    relationships: list[dict] # {"source": str, "target": str, "type": str}

@app.get("/api/lore-relationships", response_model=list[schemas.LoreRelationship])
async def get_lore_relationships(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.LoreRelationship)
        .where(models.LoreRelationship.project_id == project_id)
        .order_by(models.LoreRelationship.id)
    )
    return result.scalars().all()

@app.post("/api/lore-relationships", response_model=schemas.LoreRelationship)
async def create_lore_relationship(rel: schemas.LoreRelationshipCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, rel.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if rel.source_id == rel.target_id:
        raise HTTPException(status_code=400, detail="Source and target entity cannot be the same")
    trimmed_rel_type = rel.relationship_type.strip()
    if not trimmed_rel_type:
        raise HTTPException(status_code=400, detail="Relationship type cannot be empty")
    source = await db.get(models.LoreEntity, rel.source_id)
    target = await db.get(models.LoreEntity, rel.target_id)
    if not source or not target or source.project_id != rel.project_id or target.project_id != rel.project_id:
        raise HTTPException(status_code=400, detail="Invalid source or target lore entity")

    # Prevent duplicate relationships
    existing_rel = await db.execute(
        select(models.LoreRelationship).where(
            models.LoreRelationship.project_id == rel.project_id,
            models.LoreRelationship.source_id == rel.source_id,
            models.LoreRelationship.target_id == rel.target_id,
            func.lower(models.LoreRelationship.relationship_type) == rel.relationship_type.strip().lower()
        )
    )
    existing = existing_rel.scalars().first()
    if existing:
        return existing

    db_rel = models.LoreRelationship(
        project_id=rel.project_id,
        source_id=rel.source_id,
        target_id=rel.target_id,
        relationship_type=rel.relationship_type.strip()
    )
    db.add(db_rel)
    await db.commit()
    await db.refresh(db_rel)
    return db_rel

@app.delete("/api/lore-relationships/{rel_id}")
async def delete_lore_relationship(rel_id: int, db: AsyncSession = Depends(get_db)):
    rel = await db.get(models.LoreRelationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Lore relationship not found")
    await db.delete(rel)
    await db.commit()
    return {"status": "ok"}

@app.post("/api/lore-relationships/bulk")
async def bulk_create_lore_relationships(payload: BulkLoreRelationshipRequest, db: AsyncSession = Depends(get_db)):
    # 1. Verify that project exists up front
    project = await db.get(models.Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Fetch all lore entities for the project to map names to IDs
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
                
            source_name = source_name.strip()
            target_name = target_name.strip()
            rel_type = rel_type.strip()
            if not source_name or not target_name or not rel_type:
                continue
            if source_name.lower() == target_name.lower():
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
                rel_tuple = (source_id, target_id, rel_type.lower())
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
    project = await db.get(models.Project, character.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    trimmed_name = character.name.strip()
    if not trimmed_name:
        raise HTTPException(status_code=400, detail="Character name cannot be empty")

    if character.lore_entity_id:
        lore = await db.get(models.LoreEntity, character.lore_entity_id)
        if not lore or lore.project_id != character.project_id:
            raise HTTPException(status_code=400, detail="Invalid lore_entity_id")

    if character.is_protagonist:
        await db.execute(
            update(models.Character)
            .where(models.Character.project_id == character.project_id)
            .values(is_protagonist=False)
        )

    char_data = character.model_dump()
    char_data['name'] = trimmed_name
    db_character = models.Character(**char_data)
    db.add(db_character)
    try:
        await db.commit()
        await db.refresh(db_character)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Character creation constraint check failed")
    return db_character

@app.put("/api/characters/{character_id}", response_model=schemas.Character)
async def update_character(character_id: int, character_update: schemas.CharacterUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    update_data = character_update.model_dump(exclude_unset=True)
    if 'name' in update_data:
        trimmed_name = (update_data['name'] or '').strip()
        if not trimmed_name:
            raise HTTPException(status_code=400, detail="Character name cannot be empty")
        update_data['name'] = trimmed_name

    if 'lore_entity_id' in update_data and update_data['lore_entity_id'] is not None:
        lore = await db.get(models.LoreEntity, update_data['lore_entity_id'])
        if not lore or lore.project_id != db_character.project_id:
            raise HTTPException(status_code=400, detail="Invalid lore_entity_id")

    if update_data.get('is_protagonist'):
        await db.execute(
            update(models.Character)
            .where(models.Character.project_id == db_character.project_id, models.Character.id != db_character.id)
            .values(is_protagonist=False)
        )

    for key, value in update_data.items():
        setattr(db_character, key, value)
        if key in ("stats", "formulas"):
            flag_modified(db_character, key)
        
    try:
        await db.commit()
        await db.refresh(db_character)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Character update constraint check failed")
    return db_character

@app.delete("/api/characters/{character_id}")
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    try:
        await db.delete(db_character)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete character because it is in use")
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
    char = await db.get(models.Character, character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    chap = await db.get(models.Chapter, ledger.chapter_id)
    if not chap or chap.project_id != char.project_id:
        raise HTTPException(status_code=404, detail="Chapter not found in character project")

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
            
            chap = await db.get(models.Chapter, payload.ledger.chapter_id)
            if not chap or chap.project_id != db_character.project_id:
                raise HTTPException(status_code=404, detail="Chapter not found in character project")

            db_character.stats = payload.character_stats
            flag_modified(db_character, "stats")
            if payload.character_formulas is not None:
                db_character.formulas = payload.character_formulas
                flag_modified(db_character, "formulas")
            
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
    project = await db.get(models.Project, request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not request.system_box_text or not request.system_box_text.strip():
        return {"status": "ok", "drafts": []}

    db_char = None
    if request.character_id:
        result = await db.execute(select(models.Character).where(
            models.Character.id == request.character_id,
            models.Character.project_id == request.project_id
        ))
        db_char = result.scalars().first()
        if not db_char:
            raise HTTPException(status_code=404, detail="Character not found")
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

    char_stats = (db_char.stats or {}) if db_char else {}
        
    drafts = await anyio.to_thread.run_sync(
        extract_tactical_drafts,
        request.system_box_text,
        request.surrounding_text,
        char_stats
    )
    return {"status": "ok", "drafts": drafts}

class AmbientAIRequest(BaseModel):
    narrative_text: str
    project_id: int

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    project_id: int
    messages: list[ChatMessage]

@app.post("/api/ai/chat")
async def trigger_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")
        
    # Get all lore and characters for context
    lore_result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == request.project_id))
    lore = lore_result.scalars().all()
    
    char_result = await db.execute(select(models.Character).where(models.Character.project_id == request.project_id))
    characters = char_result.scalars().all()

    import anyio
    from app.ai import generate_chat_response
    
    # We can pass lore and characters as context strings
    lore_context = "\n".join([f"- {l.name} ({l.category}): {l.description}" for l in lore])
    char_context = "\n".join([f"- {c.name}: {c.stats}" for c in characters])
    
    system_prompt = f"""You are an expert AI co-writer and brainstorming assistant for a LitRPG web novel.
You must help the author brainstorm ideas, overcome writer's block, and keep track of story details.
Here is the Story Bible context:
--- LORE ---
{lore_context}

--- CHARACTERS ---
{char_context}

Keep your answers concise, creative, and focused on helping the author write the next scene or solve plot holes."""

    response_text = await anyio.to_thread.run_sync(
        generate_chat_response,
        system_prompt,
        request.messages
    )
    
    return {"status": "ok", "response": response_text}

@app.post("/api/ai/ambient")
async def trigger_ambient_ai(request: AmbientAIRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not request.narrative_text or not request.narrative_text.strip():
        return {"status": "ok", "drafts": []}

    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == request.project_id))
    lore_entities = result.scalars().all()
    wiki_index = [{"name": l.name, "category": l.category} for l in lore_entities]
    
    drafts = await anyio.to_thread.run_sync(
        extract_ambient_lore,
        request.narrative_text,
        wiki_index
    )
    return {"status": "ok", "drafts": drafts}
