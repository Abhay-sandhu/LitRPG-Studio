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
        
        content1 = """<h1>Chapter 1: The Crypt of the Fallen King</h1>
<p>The cold stone of the crypt bit into Ethan's palms as he pushed himself off the floor. His lungs burned, the stale air thick with centuries of undisturbed dust. A flickering blue light in the corner of his vision drew his attention.</p>
<p><strong>[SYSTEM INITIATED]</strong></p>
<p><strong>[Welcome to Aethelgard. You are an Outlander.]</strong></p>
<p>"What... what is this?" Ethan muttered, swiping at the text. It didn't vanish. Instead, a new box appeared.</p>
<p><strong>[Quest Triggered: Survive the Crypt]</strong></p>
<p><strong>[Objective: Escape the Crypt of the Fallen King within 1 hour.]</strong></p>
<p><strong>[Reward: 100 EXP, Iron Dagger]</strong></p>
<p><strong>[Failure: Death]</strong></p>
<p>Ethan scrambled to his feet. In the center of the room sat a massive sarcophagus, its lid cracked open. From within, the scraping sound of bone against stone echoed loudly.</p>
<p>A skeletal hand gripped the edge of the tomb.</p>
<p><em>I need a weapon,</em> Ethan thought frantically. He spotted a rusted shortsword lying near a crumbling pillar. Diving for it, he grabbed the hilt just as a Skeletal Guardian hauled itself out of the grave.</p>
<p><strong>[Skeletal Guardian - Lv. 2]</strong></p>
<p>Ethan gripped the sword, the system interface flashing in his vision.</p>
<p><strong>[Item Acquired: Rusty Shortsword (Common)]</strong></p>
<p>He swung wildly as the skeleton lunged, the rusty blade connecting with its ribcage. Bone splintered, and the skeleton hissed, swiping with a rusted blade of its own.</p>
<p>Ethan parried, his arms shaking from the impact, and kicked the skeleton backward into the sarcophagus. It tumbled inside, and Ethan didn't wait to see if it would get back up. He bolted for the heavy oak doors at the end of the room.</p>"""

        content2 = """<h1>Chapter 2: The First Catalyst</h1>
<p>Ethan burst through the heavy oak doors, slamming them shut behind him. He leaned against the wood, gasping for air as the sounds of the undead guardian faded into silence.</p>
<p><strong>[Quest Complete: Survive the Crypt]</strong></p>
<p><strong>[Reward: 100 EXP, Iron Dagger]</strong></p>
<p><strong>[Level Up! You are now Level 2.]</strong></p>
<p><strong>[You have gained 5 Stat Points.]</strong></p>
<p>Ethan felt a sudden surge of energy wash over him, his fatigue vanishing in an instant. He opened his character menu with a thought.</p>
<p>He dumped three points into Strength and two into Agility. The Rusty Shortsword felt noticeably lighter in his grip.</p>
<p>The corridor ahead was lit by flickering torches mounted on stone brackets. Shadows danced along the walls, revealing murals of a golden city falling to a tide of darkness.</p>
<p>"Aethelgard," Ethan whispered, remembering the system's greeting.</p>
<p>At the end of the hall, a pedestal stood bathed in a shaft of moonlight filtering through a crack in the ceiling. Resting on it was a small, glowing crystal.</p>
<p>As Ethan approached, the system chimed.</p>
<p><strong>[Catalyst Shard Detected.]</strong></p>
<p><strong>[Would you like to absorb the Catalyst Shard? (Y/N)]</strong></p>
<p>He reached out, his fingers brushing the smooth surface. "Yes."</p>
<p>A searing pain shot up his arm as the crystal dissolved into pure energy, rushing into his veins. He collapsed to his knees, gritting his teeth.</p>
<p><strong>[Skill Unlocked: Mana Bolt (Lv. 1)]</strong></p>
<p><strong>[Title Acquired: Catalyst Bearer]</strong></p>"""

        c1 = Chapter(project_id=p.id, title='Chapter 1: The Crypt of the Fallen King', words=235, order=1, content=content1)
        c2 = Chapter(project_id=p.id, title='Chapter 2: The First Catalyst', words=239, order=2, content=content2)
        
        l1 = LoreEntity(
            project_id=p.id, 
            name='Ethan Storm', 
            category='Character', 
            attributes={'icon': 'Users', 'rank': 'Lv. 2 Outlander'}
        )
        
        l2 = LoreEntity(
            project_id=p.id, 
            name='Rusty Shortsword', 
            category='Item', 
            attributes={'icon': 'Sword', 'rank': 'Common'}
        )

        l3 = LoreEntity(
            project_id=p.id, 
            name='Aethelgard', 
            category='Location', 
            attributes={'icon': 'Map', 'rank': 'Fallen Kingdom'}
        )

        l4 = LoreEntity(
            project_id=p.id, 
            name='Catalyst Shard', 
            category='Item', 
            attributes={'icon': 'Sparkles', 'rank': 'Epic'}
        )
        
        c_ethan = Character(
            project_id=p.id,
            name='Ethan Storm',
            is_protagonist=True,
            stats={
                "Core Attributes": {"STR": 13, "AGI": 14, "INT": 8, "VIT": 10},
                "Titles": ["Catalyst Bearer"],
                "Inventory": ["Rusty Shortsword", "Iron Dagger"],
                "Skills": ["Mana Bolt (Lv. 1)"]
            },
            formulas={
                "Max HP": "VIT * 10",
                "Max Mana": "INT * 10"
            }
        )

        db.add_all([c1, c2, l1, l2, l3, l4, c_ethan])
        await db.commit()
        await db.refresh(c_ethan)
        await db.refresh(c1)
        await db.refresh(c2)

        from app.models import Ledger
        ledger_entry1 = Ledger(
            character_id=c_ethan.id,
            chapter_id=c1.id,
            event_name="Found Rusty Shortsword",
            changes={
                "Inventory": {"new": ["Rusty Shortsword"], "delta": "+ Rusty Shortsword"}
            },
            source_type="System Box"
        )
        ledger_entry2 = Ledger(
            character_id=c_ethan.id,
            chapter_id=c2.id,
            event_name="Level Up & Catalyst Absorption",
            changes={
                "Level": {"old": 1, "new": 2, "delta": "+1"},
                "STR": {"old": 10, "new": 13, "delta": "+3"},
                "AGI": {"old": 12, "new": 14, "delta": "+2"},
                "Titles": {"new": ["Catalyst Bearer"], "delta": "+ Catalyst Bearer"},
                "Skills": {"new": ["Mana Bolt (Lv. 1)"], "delta": "+ Mana Bolt"},
                "Inventory": {"new": ["Rusty Shortsword", "Iron Dagger"], "delta": "+ Iron Dagger"}
            },
            source_type="System Box"
        )
        db.add_all([ledger_entry1, ledger_entry2])
        await db.commit()
        
        print('Seeded successfully!')

if __name__ == '__main__':
    asyncio.run(seed())
