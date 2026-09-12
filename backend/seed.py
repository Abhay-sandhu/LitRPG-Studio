import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models import Project, Chapter, LoreEntity, Character
from app.database import Base

DATABASE_URL = 'sqlite+aiosqlite:///./litrpg.db'
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession)

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        p = Project(title='The Crypt of the Fallen King')
        db.add(p)
        await db.commit()
        await db.refresh(p)
        
        c1 = Chapter(project_id=p.id, title='Chapter 1: The Crypt of the Fallen King', words=1420, order=1, content='')
        c2 = Chapter(project_id=p.id, title='Chapter 2: The First Catalyst', words=2150, order=2, content='')
        c3 = Chapter(project_id=p.id, title='Chapter 3: Embers in the Gloom', words=890, order=3, content='')
        
        l1 = LoreEntity(
            project_id=p.id, 
            name='Ethan Storm', 
            category='Character', 
            attributes={'icon': 'Users', 'rank': 'Lv. 1 Novice'}
        )
        
        l2 = LoreEntity(
            project_id=p.id, 
            name='Rusty Shortsword', 
            category='Item', 
            attributes={'icon': 'Sword', 'rank': 'Common'}
        )
        
        c_ethan = Character(
            project_id=p.id,
            name='Ethan Storm',
            is_protagonist=True,
            stats={
                "Core Attributes": {"STR": 10, "AGI": 12, "INT": 8, "VIT": 10},
                "Vices": ["Greed"],
                "Inventory": ["Rusty Shortsword", "Worn Dagger"]
            },
            formulas={
                "Max HP": "VIT * 10",
                "Max Mana": "INT * 10"
            }
        )

        db.add_all([c1, c2, c3, l1, l2, c_ethan])
        await db.commit()
        await db.refresh(c_ethan)
        await db.refresh(c1)

        from app.models import Ledger
        ledger_entry = Ledger(
            character_id=c_ethan.id,
            chapter_id=c1.id,
            event_name="Found Rusty Shortsword",
            changes={
                "Inventory": {"new": ["Rusty Shortsword", "Worn Dagger"], "delta": "+ Rusty Shortsword"}
            },
            source_type="System Box"
        )
        db.add(ledger_entry)
        await db.commit()
        
        print('Seeded successfully!')

if __name__ == '__main__':
    asyncio.run(seed())
