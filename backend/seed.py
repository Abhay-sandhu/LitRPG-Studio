import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models import Project, Chapter, LoreEntity

DATABASE_URL = 'sqlite+aiosqlite:///./litrpg.db'
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession)

async def seed():
    async with AsyncSessionLocal() as db:
        p = Project(title='The Crypt of the Fallen King')
        db.add(p)
        await db.commit()
        await db.refresh(p)
        
        c1 = Chapter(project_id=p.id, title='Chapter 1: The Crypt of the Fallen King', words=1420, order=1, content='')
        c2 = Chapter(project_id=p.id, title='Chapter 2: The First Catalyst', words=2150, order=2, content='')
        c3 = Chapter(project_id=p.id, title='Chapter 3: Embers in the Gloom', words=890, order=3, content='')
        
        l1 = LoreEntity(project_id=p.id, name='Ethan Storm', type='Character', icon='Users', rank='Lv. 1 Novice')
        l2 = LoreEntity(project_id=p.id, name='Rusty Shortsword', type='Item', icon='Sword', rank='Common')
        
        db.add_all([c1, c2, c3, l1, l2])
        await db.commit()
        print('Seeded successfully!')

if __name__ == '__main__':
    asyncio.run(seed())
