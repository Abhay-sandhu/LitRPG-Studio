from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime, timezone

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    chapters = relationship('Chapter', back_populates='project', cascade='all, delete-orphan', lazy='selectin')
    lore_entities = relationship('LoreEntity', back_populates='project', cascade='all, delete-orphan', lazy='selectin')
    characters = relationship('Character', back_populates='project', cascade='all, delete-orphan', lazy='selectin')

class Chapter(Base):
    __tablename__ = 'chapters'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    title = Column(String, index=True)
    content = Column(Text, default='')
    words = Column(Integer, default=0)
    order = Column(Integer, default=0)
    project = relationship('Project', back_populates='chapters')
    ledgers = relationship('Ledger', back_populates='chapter', cascade='all, delete-orphan', lazy='selectin')

class LoreEntity(Base):
    __tablename__ = 'lore_entities'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    name = Column(String, index=True)
    category = Column(String)  # Replaced 'type' to avoid python keyword clashes, e.g. "Skill", "Title", "Location"
    description = Column(Text, default='')
    attributes = Column(JSON, default=dict) # For dynamic data instead of hardcoded rank/icon
    is_promoted = Column(Boolean, default=False)
    project = relationship('Project', back_populates='lore_entities')

class Character(Base):
    __tablename__ = 'characters'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    lore_entity_id = Column(Integer, ForeignKey('lore_entities.id', ondelete="SET NULL"), nullable=True) # Link to Wiki
    name = Column(String, index=True)
    is_protagonist = Column(Boolean, default=False)
    stats = Column(JSON, default=dict) # e.g. {"Core": {"STR": 10}, "Titles": ["Dragon Slayer"]}
    formulas = Column(JSON, default=dict) # e.g. {"Max HP": "END * 10"}
    project = relationship('Project', back_populates='characters')
    ledgers = relationship('Ledger', back_populates='character', cascade='all, delete-orphan', lazy='selectin')

class Ledger(Base):
    __tablename__ = 'ledgers'
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey('characters.id', ondelete="CASCADE"))
    chapter_id = Column(Integer, ForeignKey('chapters.id', ondelete="CASCADE"))
    event_name = Column(String)
    changes = Column(JSON, default=dict) # e.g. {"STR": {"old": 10, "new": 12, "delta": "+2"}}
    source_type = Column(String, default="System Box") # 'System Box', 'Manual', 'Initial'
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    character = relationship('Character', back_populates='ledgers')
    chapter = relationship('Chapter', back_populates='ledgers')
