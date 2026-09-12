import os
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types

# Initialize client. Assumes GEMINI_API_KEY is in environment.
client = genai.Client()

class ActionDraft(BaseModel):
    id: int
    type: str # 'stat' or 'item' or 'lore'
    title: str
    desc: str
    context: str
    changes: Optional[Dict[str, Any]] = None # e.g. {"STR": {"new": 14, "delta": "+2"}}
    lore_entity: Optional[Dict[str, Any]] = None # For wiki creation

class TacticalResponse(BaseModel):
    drafts: List[ActionDraft]

class AmbientResponse(BaseModel):
    drafts: List[ActionDraft]

def extract_tactical_drafts(system_box_text: str, context_text: str, current_stats: dict) -> List[ActionDraft]:
    prompt = f"""
    You are an RPG Engine for a LitRPG web novel. The author just wrote a "System Box" notification.
    Analyze the text and extract any explicit character stat changes or new items.

    Current Character Stats:
    {current_stats}

    System Box Text:
    {system_box_text}

    Surrounding Narrative Context:
    {context_text}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TacticalResponse,
                temperature=0.1
            ),
        )
        return response.parsed.drafts if response.parsed else []
    except Exception as e:
        print(f"Tactical AI Error: {e}")
        return []

def extract_ambient_lore(narrative_text: str, wiki_index: list) -> List[ActionDraft]:
    prompt = f"""
    You are a World-Building Assistant. Read the following chapter excerpt and extract ANY new characters, locations, items, or concepts that should be added to the Lore Wiki. Do not duplicate existing entities.

    Existing Wiki Entities:
    {wiki_index}

    Narrative Text:
    {narrative_text}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AmbientResponse,
                temperature=0.2
            ),
        )
        return response.parsed.drafts if response.parsed else []
    except Exception as e:
        print(f"Ambient AI Error: {e}")
        return []
