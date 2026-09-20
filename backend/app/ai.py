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

import time

class StatChange(BaseModel):
    stat: str
    new_value: Optional[float] = None
    delta: Optional[str] = None

class ListAddition(BaseModel):
    list_name: str # e.g., 'Skills', 'Inventory', 'Titles'
    value: str # e.g., 'Fireball', 'Rusty Sword'

class LoreAttribute(BaseModel):
    key: str
    value: str

class LoreEntityDraft(BaseModel):
    name: str
    category: str = Field(default="Concept")
    description: str = Field(default="")
    attributes: Optional[List[LoreAttribute]] = None

class ActionDraftModel(BaseModel):
    id: Optional[int] = Field(default=1)
    type: str = Field(default="stat") # 'stat' or 'item' or 'lore' or 'skill'
    title: str = Field(default="Draft")
    desc: str = Field(default="")
    context: str = Field(default="")
    stat_changes: Optional[List[StatChange]] = None
    list_additions: Optional[List[ListAddition]] = None
    lore_entity: Optional[LoreEntityDraft] = None

class TacticalResponse(BaseModel):
    drafts: List[ActionDraftModel]

class LoreRelationshipDraft(BaseModel):
    source_entity_name: str = Field(default="")
    target_entity_name: str = Field(default="")
    relationship_type: str = Field(default="")

class AmbientResponse(BaseModel):
    drafts: List[ActionDraftModel]
    relationships: Optional[List[LoreRelationshipDraft]] = None

def map_drafts_for_frontend(drafts: List[ActionDraftModel], relationships: Optional[List[LoreRelationshipDraft]] = None) -> List[dict]:
    result = []
    # If we have relationships, we can bundle them as a special draft or handle them separately.
    # For now, let's just create a special draft for relationships if we want them in the UI.
    # Alternatively, they can just be saved quietly in the backend. 
    # But this function returns UI drafts. Let's return drafts and a separate dict for relationships, 
    # but the current signature returns a list of dicts. 
    # Let's attach relationships to the FIRST draft, or make a mock draft for them.
    # Actually, returning them as a separate list is better, but since it breaks signature, let's just make a mock draft.
    if relationships:
        rel_draft = {
            "id": int(time.time() * 1000),
            "type": "relationships",
            "title": "New Lore Relationships",
            "desc": f"Discovered {len(relationships)} new relationships in the text.",
            "context": "GraphRAG Update",
            "relationships": [{"source": r.source_entity_name, "target": r.target_entity_name, "type": r.relationship_type} for r in relationships]
        }
        result.append(rel_draft)

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

def extract_tactical_drafts(system_box_text: str, context_text: str, current_stats: Optional[dict] = None) -> List[dict]:
    stats_payload = current_stats if current_stats is not None else {}
    prompt = f"""
    You are an RPG Engine for a LitRPG web novel. The author just wrote a "System Box" notification.
    Analyze the text and extract any explicit character stat changes or new items/skills.

    If the change is numeric (e.g. +2 STR, Max HP increases to 250), put it in `stat_changes`.
    If the change is an acquired ability, title, or item (e.g. "Skill Acquired: Fireball", "You found a Rusty Sword"), put it in `list_additions`. Use appropriate list names that match the character sheet (e.g. 'Skills', 'Inventory', 'Titles', 'Vices').

    Current Character Stats:
    {stats_payload}

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
                http_options=types.HttpOptions(timeout=60000)
            ),
        )
        return map_drafts_for_frontend(response.parsed.drafts) if response.parsed else []
    except Exception as e:
        print(f"Tactical AI Error: {e}")
        return []

def extract_ambient_lore(narrative_text: str, wiki_index: list) -> List[dict]:
    prompt = f"""
    You are a World-Building Assistant. Read the following chapter excerpt and extract ANY new characters, locations, items, or concepts that should be added to the Lore Wiki. Do not duplicate existing entities.
    
    Additionally, extract any distinct RELATIONSHIPS between entities (both new and existing). For example, if 'Elara' travels to 'Oakhaven', create a relationship 'travels to' between them. If 'Arthur' wields 'Excalibur', create a 'wields' relationship.

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
                http_options=types.HttpOptions(timeout=60000)
            ),
        )
        return map_drafts_for_frontend(response.parsed.drafts, response.parsed.relationships) if response.parsed else []
    except Exception as e:
        print(f"Ambient AI Error: {e}")
        return []

def generate_chat_response(system_prompt: str, messages: list) -> str:
    client = get_client()
    if not client:
        return "Error: GEMINI_API_KEY is missing."

    from google.genai import types

    contents = []
    for msg in messages:
        contents.append(
            types.Content(
                role=msg.role,
                parts=[types.Part.from_text(msg.content)]
            )
        )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            ),
        )
        return response.text
    except Exception as e:
        print(f"Chat AI Error: {e}")
        return f"Sorry, an error occurred: {e}"
