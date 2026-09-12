import os
from pydantic import BaseModel, Field
from typing import List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        _client = genai.Client(api_key=api_key)
    return _client

class StatChange(BaseModel):
    stat: str
    new_value: float
    delta: str

class ListAddition(BaseModel):
    list_name: str # e.g., 'Skills', 'Inventory', 'Titles'
    value: str # e.g., 'Fireball', 'Rusty Sword'

class LoreAttribute(BaseModel):
    key: str
    value: str

class LoreEntityDraft(BaseModel):
    name: str
    category: str
    description: str
    attributes: Optional[List[LoreAttribute]] = None

class ActionDraftModel(BaseModel):
    id: int
    type: str # 'stat' or 'item' or 'lore' or 'skill'
    title: str
    desc: str
    context: str
    stat_changes: Optional[List[StatChange]] = None
    list_additions: Optional[List[ListAddition]] = None
    lore_entity: Optional[LoreEntityDraft] = None

class TacticalResponse(BaseModel):
    drafts: List[ActionDraftModel]

class AmbientResponse(BaseModel):
    drafts: List[ActionDraftModel]

def map_drafts_for_frontend(drafts: List[ActionDraftModel]) -> List[dict]:
    result = []
    for d in drafts:
        draft_dict = {
            "id": d.id,
            "type": d.type,
            "title": d.title,
            "desc": d.desc,
            "context": d.context,
        }
        changes = {}
        if d.stat_changes:
            for sc in d.stat_changes:
                changes[sc.stat] = {"new": sc.new_value, "delta": sc.delta}
        if d.list_additions:
            for la in d.list_additions:
                # We indicate it's an append operation
                changes[la.list_name] = {"append": la.value}
                
        if changes:
            draft_dict["changes"] = changes
        if d.lore_entity:
            lore_dict = {
                "name": d.lore_entity.name,
                "category": d.lore_entity.category,
                "description": d.lore_entity.description,
                "attributes": {}
            }
            if d.lore_entity.attributes:
                for attr in d.lore_entity.attributes:
                    lore_dict["attributes"][attr.key] = attr.value
            draft_dict["lore_entity"] = lore_dict
        result.append(draft_dict)
    return result

def extract_tactical_drafts(system_box_text: str, context_text: str, current_stats: dict) -> List[dict]:
    prompt = f"""
    You are an RPG Engine for a LitRPG web novel. The author just wrote a "System Box" notification.
    Analyze the text and extract any explicit character stat changes or new items/skills.

    If the change is numeric (e.g. +2 STR, Max HP increases to 250), put it in `stat_changes`.
    If the change is an acquired ability, title, or item (e.g. "Skill Acquired: Fireball", "You found a Rusty Sword"), put it in `list_additions`. Use appropriate list names that match the character sheet (e.g. 'Skills', 'Inventory', 'Titles', 'Vices').

    Current Character Stats:
    {current_stats}

    System Box Text:
    {system_box_text}

    Surrounding Narrative Context:
    {context_text}
    """
    
    try:
        client = get_client()
        if not client:
            return []
            
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TacticalResponse,
                temperature=0.1,
                http_options=types.HttpOptions(timeout=30)
            ),
        )
        return map_drafts_for_frontend(response.parsed.drafts) if response.parsed else []
    except Exception as e:
        print(f"Tactical AI Error: {e}")
        return []

def extract_ambient_lore(narrative_text: str, wiki_index: list) -> List[dict]:
    prompt = f"""
    You are a World-Building Assistant. Read the following chapter excerpt and extract ANY new characters, locations, items, or concepts that should be added to the Lore Wiki. Do not duplicate existing entities.

    Existing Wiki Entities:
    {wiki_index}

    Narrative Text:
    {narrative_text}
    """
    
    try:
        client = get_client()
        if not client:
            return []
            
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AmbientResponse,
                temperature=0.2,
                http_options=types.HttpOptions(timeout=30)
            ),
        )
        return map_drafts_for_frontend(response.parsed.drafts) if response.parsed else []
    except Exception as e:
        print(f"Ambient AI Error: {e}")
        return []
