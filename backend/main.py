from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from contextlib import asynccontextmanager

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/projects", response_model=list[schemas.Project])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project))
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

@app.get("/api/lore", response_model=list[schemas.LoreEntity])
async def get_lore(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LoreEntity).where(models.LoreEntity.project_id == project_id))
    return result.scalars().all()
