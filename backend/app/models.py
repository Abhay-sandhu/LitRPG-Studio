from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    chapters = relationship('Chapter', back_populates='project', cascade='all, delete-orphan')
    lore_entities = relationship('LoreEntity', back_populates='project', cascade='all, delete-orphan')

class Chapter(Base):
    __tablename__ = 'chapters'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    title = Column(String, index=True)
    content = Column(Text, default='')
    words = Column(Integer, default=0)
    order = Column(Integer, default=0)
    project = relationship('Project', back_populates='chapters')

class LoreEntity(Base):
    __tablename__ = 'lore_entities'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"))
    name = Column(String, index=True)
    type = Column(String)
    rank = Column(String)
    icon = Column(String)
    project = relationship('Project', back_populates='lore_entities')
