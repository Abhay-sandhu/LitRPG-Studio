from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import noload
from sqlalchemy import func
from . import models, schemas
from fastapi import HTTPException

# --- Projects ---

async def get_projects(db: AsyncSession):
    result = await db.execute(select(models.Project).options(noload('*')).order_by(models.Project.id))
    return result.scalars().all()

async def get_project(db: AsyncSession, project_id: int):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

async def create_project(db: AsyncSession, project: schemas.ProjectCreate):
    trimmed_title = project.title.strip()
    if not trimmed_title:
        raise HTTPException(status_code=400, detail="Project title cannot be empty")
    db_project = models.Project(title=trimmed_title)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

async def delete_project(db: AsyncSession, project_id: int):
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

# --- Chapters ---

async def get_chapters(db: AsyncSession, project_id: int):
    result = await db.execute(
        select(models.Chapter)
        .where(models.Chapter.project_id == project_id)
        .order_by(models.Chapter.order, models.Chapter.id)
    )
    return result.scalars().all()

async def get_chapter(db: AsyncSession, chapter_id: int):
    result = await db.execute(select(models.Chapter).where(models.Chapter.id == chapter_id))
    db_chapter = result.scalars().first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter

async def create_chapter(db: AsyncSession, chapter: schemas.ChapterCreate):
    from sqlalchemy.exc import IntegrityError
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

async def update_chapter(db: AsyncSession, chapter_id: int, chapter_update: schemas.ChapterUpdate):
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

async def delete_chapter(db: AsyncSession, chapter_id: int):
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

async def get_lore(db: AsyncSession, project_id: int):
    result = await db.execute(
        select(models.LoreEntity)
        .where(models.LoreEntity.project_id == project_id)
        .order_by(models.LoreEntity.name)
    )
    return result.scalars().all()


async def create_lore(db: AsyncSession, lore: schemas.LoreEntityCreate):
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


async def update_lore(db: AsyncSession, lore_id: int, lore_update: schemas.LoreEntityUpdate):
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


async def delete_lore(db: AsyncSession, lore_id: int):
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


async def get_lore_relationships(db: AsyncSession, project_id: int):
    result = await db.execute(
        select(models.LoreRelationship)
        .where(models.LoreRelationship.project_id == project_id)
        .order_by(models.LoreRelationship.id)
    )
    return result.scalars().all()


async def create_lore_relationship(db: AsyncSession, rel: schemas.LoreRelationshipCreate):
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


async def delete_lore_relationship(db: AsyncSession, rel_id: int):
    rel = await db.get(models.LoreRelationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Lore relationship not found")
    await db.delete(rel)
    await db.commit()
    return {"status": "ok"}


async def bulk_create_lore_relationships(db: AsyncSession, payload: schemas.BulkLoreRelationshipRequest):
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



async def get_characters(db: AsyncSession, project_id: int):
    result = await db.execute(select(models.Character).where(models.Character.project_id == project_id))
    return result.scalars().all()


async def create_character(db: AsyncSession, character: schemas.CharacterCreate):
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


async def update_character(db: AsyncSession, character_id: int, character_update: schemas.CharacterUpdate):
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


async def delete_character(db: AsyncSession, character_id: int):
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


