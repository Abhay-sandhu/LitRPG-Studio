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
from app import crud

@app.get("/api/projects", response_model=list[schemas.ProjectListItem])
async def get_projects(db: AsyncSession = Depends(get_db)):
    return await crud.get_projects(db)

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_project(db, project_id)

@app.post("/api/projects", response_model=schemas.Project)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_project(db, project)

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_project(db, project_id)

@app.get("/api/chapters", response_model=list[schemas.Chapter])
async def get_chapters(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_chapters(db, project_id)

@app.get("/api/chapters/{chapter_id}", response_model=schemas.Chapter)
async def get_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_chapter(db, chapter_id)

@app.post("/api/chapters", response_model=schemas.Chapter)
async def create_chapter(chapter: schemas.ChapterCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_chapter(db, chapter)

@app.put("/api/chapters/{chapter_id}", response_model=schemas.Chapter)
async def update_chapter(chapter_id: int, chapter_update: schemas.ChapterUpdate, db: AsyncSession = Depends(get_db)):
    return await crud.update_chapter(db, chapter_id, chapter_update)

@app.delete("/api/chapters/{chapter_id}")
async def delete_chapter(chapter_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_chapter(db, chapter_id)

@app.get("/api/lore", response_model=list[schemas.LoreEntity])
async def get_lore(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_lore(db, project_id)

@app.post("/api/lore", response_model=schemas.LoreEntity)
async def create_lore(lore: schemas.LoreEntityCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_lore(db, lore)

@app.put("/api/lore/{lore_id}", response_model=schemas.LoreEntity)
async def update_lore(lore_id: int, lore_update: schemas.LoreEntityUpdate, db: AsyncSession = Depends(get_db)):
    return await crud.update_lore(db, lore_id, lore_update)

@app.delete("/api/lore/{lore_id}")
async def delete_lore(lore_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_lore(db, lore_id)

# --- Lore Relationships ---

@app.get("/api/lore-relationships", response_model=list[schemas.LoreRelationship])
async def get_lore_relationships(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_lore_relationships(db, project_id)

@app.post("/api/lore-relationships", response_model=schemas.LoreRelationship)
async def create_lore_relationship(rel: schemas.LoreRelationshipCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_lore_relationship(db, rel)

@app.delete("/api/lore-relationships/{rel_id}")
async def delete_lore_relationship(rel_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_lore_relationship(db, rel_id)

@app.post("/api/lore-relationships/bulk")
async def bulk_create_lore_relationships(payload: BulkLoreRelationshipRequest, db: AsyncSession = Depends(get_db)):
    return await crud.bulk_create_lore_relationships(db, payload)

# --- Characters ---

@app.get("/api/characters", response_model=list[schemas.Character])
async def get_characters(project_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_characters(db, project_id)

@app.get("/api/characters/{character_id}", response_model=schemas.Character)
async def get_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Character).where(models.Character.id == character_id))
    db_character = result.scalars().first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character

@app.post("/api/characters", response_model=schemas.Character)
async def create_character(character: schemas.CharacterCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_character(db, character)

@app.put("/api/characters/{character_id}", response_model=schemas.Character)
async def update_character(character_id: int, character_update: schemas.CharacterUpdate, db: AsyncSession = Depends(get_db)):
    return await crud.update_character(db, character_id, character_update)

@app.delete("/api/characters/{character_id}")
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_character(db, character_id)

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
