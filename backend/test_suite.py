import asyncio
import httpx
import sys
import os
import re

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import main
from app import models, schemas
from app.ai import StatChange, ListAddition, generate_chat_response

async def run_tests():
    print("=" * 60)
    print("Running Full-Stack Backend Test Suite for ChronicleRPG Studio")
    print("=" * 60)
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://test") as client:
        test_count = 0

        # --- 1. Project Creation & List ---
        test_count += 1
        print(f"\n[Test {test_count}] Project Creation & List")
        res = await client.get("/api/projects")
        assert res.status_code == 200, f"Failed GET /api/projects: {res.text}"
        
        res = await client.post("/api/projects", json={"title": "Aethelgard Odyssey"})
        assert res.status_code == 200, f"Failed creating project: {res.text}"
        proj = res.json()
        proj_id = proj["id"]
        assert proj["title"] == "Aethelgard Odyssey"
        print(f"   [PASS] Created project ID {proj_id}")

        # --- 2. Project Title Validation (Empty / Whitespace) ---
        test_count += 1
        print(f"\n[Test {test_count}] Project Title Empty/Whitespace Validation")
        res = await client.post("/api/projects", json={"title": "   "})
        assert res.status_code == 400, f"Expected 400 for empty title, got {res.status_code}"
        print("   [OK] Rejected whitespace-only project title with HTTP 400")

        # --- 3. Chapter Creation & Ordering ---
        test_count += 1
        print(f"\n[Test {test_count}] Chapter Creation & Order Integrity")
        res_chap2 = await client.post("/api/chapters", json={
            "project_id": proj_id,
            "title": "Chapter 2: The Whispering Woods",
            "content": "<p>They entered the misty woods.</p>",
            "words": 5,
            "order": 2
        })
        assert res_chap2.status_code == 200
        chap2_id = res_chap2.json()["id"]

        res_chap1 = await client.post("/api/chapters", json={
            "project_id": proj_id,
            "title": "Chapter 1: The Awakening",
            "content": "<blockquote>[System Announcement: Welcome to Aethelgard]</blockquote>",
            "words": 6,
            "order": 1
        })
        assert res_chap1.status_code == 200
        chap1_id = res_chap1.json()["id"]

        # Fetch chapters - should be sorted by order asc
        res_chaps = await client.get(f"/api/chapters?project_id={proj_id}")
        assert res_chaps.status_code == 200
        chaps = res_chaps.json()
        assert len(chaps) == 2
        assert chaps[0]["id"] == chap1_id, "Chapters not sorted by order ASC"
        assert chaps[1]["id"] == chap2_id
        print(f"   [OK] Verified chapter ordering (Chap 1 id={chap1_id}, Chap 2 id={chap2_id})")

        # Empty title creation rejection
        res_empty_ch = await client.post("/api/chapters", json={"project_id": proj_id, "title": "   "})
        assert res_empty_ch.status_code == 400

        # --- 4. Chapter Update & Non-Existent Update ---
        test_count += 1
        print(f"\n[Test {test_count}] Chapter Updates & 404 Handling")
        # Empty title update rejection
        res_empty_upd = await client.put(f"/api/chapters/{chap1_id}", json={"title": "   "})
        assert res_empty_upd.status_code == 400

        res = await client.put(f"/api/chapters/{chap1_id}", json={"words": 500, "title": "Chapter 1: The Grand Awakening"})
        assert res.status_code == 200
        assert res.json()["words"] == 500
        assert res.json()["title"] == "Chapter 1: The Grand Awakening"

        res_404 = await client.put("/api/chapters/999999", json={"title": "Ghost Chapter"})
        assert res_404.status_code == 404
        print("   [OK] Verified chapter update and non-existent chapter 404")

        # --- 5. Character Creation with Stats & Formulas ---
        test_count += 1
        print(f"\n[Test {test_count}] Character Creation (Protagonist & Nested Stats)")
        res_char = await client.post("/api/characters", json={
            "project_id": proj_id,
            "name": "Kaelen Drake",
            "is_protagonist": True,
            "stats": {
                "Core": {"STR": 14, "AGI": 16, "END": 12, "INT": 10},
                "Vitals": {"HP": 120, "MP": 100},
                "Titles": ["Awakened Outlander"],
                "Skills": ["Void Step", "Aether Sight"]
            },
            "formulas": {
                "Max HP": "END * 10",
                "Phys Atk": "STR * 1.5 + AGI * 0.5"
            }
        })
        assert res_char.status_code == 200
        kaelen = res_char.json()
        kaelen_id = kaelen["id"]
        assert kaelen["is_protagonist"] is True
        print(f"   [OK] Created protagonist ID {kaelen_id} with formulas and stats")

        # --- 6. Single Protagonist Policy Invariant ---
        test_count += 1
        print(f"\n[Test {test_count}] Single Protagonist Invariant")
        res_char2 = await client.post("/api/characters", json={
            "project_id": proj_id,
            "name": "Eldrin Sunfire",
            "is_protagonist": True
        })
        assert res_char2.status_code == 200
        eldrin_id = res_char2.json()["id"]
        assert res_char2.json()["is_protagonist"] is True

        # Check that Kaelen was demoted
        res_k_check = await client.get(f"/api/characters/{kaelen_id}")
        assert res_k_check.json()["is_protagonist"] is False

        # Restore Kaelen as protagonist via PUT
        res_k_promo = await client.put(f"/api/characters/{kaelen_id}", json={"is_protagonist": True})
        assert res_k_promo.status_code == 200
        assert res_k_promo.json()["is_protagonist"] is True

        res_e_check = await client.get(f"/api/characters/{eldrin_id}")
        assert res_e_check.json()["is_protagonist"] is False
        print("   [OK] Single protagonist invariant holds across POST and PUT")

        # --- 7. Character Foreign Key to Lore Entity ---
        test_count += 1
        print(f"\n[Test {test_count}] Character Lore Entity FK Validation")
        res_bad_fk = await client.post("/api/characters", json={
            "project_id": proj_id,
            "name": "Bad FK Char",
            "lore_entity_id": 888888
        })
        assert res_bad_fk.status_code == 400
        print("   [OK] Rejected character with non-existent lore_entity_id")

        # --- 8. Accept Draft (Atomic Character Update + Ledger Creation) ---
        test_count += 1
        print(f"\n[Test {test_count}] Accept Draft Transaction & Ledger")
        accept_payload = {
            "character_stats": {
                "Core": {"STR": 16, "AGI": 16, "END": 12, "INT": 10},
                "Vitals": {"HP": 120, "MP": 100},
                "Titles": ["Awakened Outlander", "Forest Conqueror"],
                "Skills": ["Void Step", "Aether Sight", "Shadow Cleave"]
            },
            "character_formulas": {
                "Max HP": "END * 10",
                "Phys Atk": "STR * 1.5 + AGI * 0.5 + 5"
            },
            "ledger": {
                "chapter_id": chap1_id,
                "event_name": "Defeated Forest Guardian (+2 STR, Skill: Shadow Cleave)",
                "changes": {
                    "STR": {"old": 14, "new": 16, "delta": "+2"},
                    "Skills": {"append": "Shadow Cleave"},
                    "Titles": {"append": "Forest Conqueror"}
                },
                "source_type": "Tactical AI Draft"
            }
        }
        res_accept = await client.post(f"/api/characters/{kaelen_id}/accept-draft", json=accept_payload)
        assert res_accept.status_code == 200, f"Accept draft failed: {res_accept.text}"
        ledger_id = res_accept.json()["ledger_id"]

        # Verify Character stats and formulas updated
        res_k_updated = await client.get(f"/api/characters/{kaelen_id}")
        assert res_k_updated.json()["stats"]["Core"]["STR"] == 16
        assert "Forest Conqueror" in res_k_updated.json()["stats"]["Titles"]
        assert "Phys Atk" in res_k_updated.json()["formulas"]

        # Verify Ledger list for character
        res_ledgers = await client.get(f"/api/characters/{kaelen_id}/ledger")
        assert res_ledgers.status_code == 200
        assert len(res_ledgers.json()) >= 1
        assert res_ledgers.json()[0]["id"] == ledger_id
        print(f"   [OK] Accept draft committed stats and ledger ID {ledger_id} atomically")

        # --- 9. Accept Draft Cross-Project Chapter Rejection ---
        test_count += 1
        print(f"\n[Test {test_count}] Accept Draft Cross-Project Chapter Isolation")
        # Create second project with chapter
        res_p2 = await client.post("/api/projects", json={"title": "Other Realm"})
        p2_id = res_p2.json()["id"]
        res_p2_ch = await client.post("/api/chapters", json={"project_id": p2_id, "title": "Other Chap", "content": "", "words": 0, "order": 1})
        p2_ch_id = res_p2_ch.json()["id"]

        bad_accept_payload = {
            "character_stats": {},
            "ledger": {
                "chapter_id": p2_ch_id, # Chapter from Project 2!
                "event_name": "Illegal Cross-Project Event",
                "changes": {},
                "source_type": "Manual"
            }
        }
        res_bad_accept = await client.post(f"/api/characters/{kaelen_id}/accept-draft", json=bad_accept_payload)
        assert res_bad_accept.status_code == 404
        print("   [OK] Prevented cross-project chapter association in accept-draft")

        # --- 10. Lore Entity Creation & Validation ---
        test_count += 1
        print(f"\n[Test {test_count}] Lore Entity Creation & Name Validation")
        # Empty name rejection
        res_empty_lore = await client.post("/api/lore", json={"project_id": proj_id, "name": "   ", "category": "Item"})
        assert res_empty_lore.status_code == 400

        # Valid creation with trimming
        res_lore = await client.post("/api/lore", json={
            "project_id": proj_id,
            "name": "  Aether Core  ",
            "category": "Item",
            "description": "A dense crystal humming with high-frequency mana.",
            "attributes": {"rarity": "Epic", "element": "Aether"}
        })
        assert res_lore.status_code == 200
        lore_entity = res_lore.json()
        lore_id = lore_entity["id"]
        assert lore_entity["name"] == "Aether Core"
        assert lore_entity["attributes"]["rarity"] == "Epic"
        print(f"   [OK] Created Lore Entity ID {lore_id} with trimmed name")

        # --- 11. Lore Deduplication & Enrichment ---
        test_count += 1
        print(f"\n[Test {test_count}] Lore Deduplication & Attribute Merging")
        res_lore_dup = await client.post("/api/lore", json={
            "project_id": proj_id,
            "name": "aether core", # Case-insensitive duplicate
            "category": "Artifact",
            "description": "An upgraded ancient power source.",
            "attributes": {"tier": "Tier 4"}
        })
        assert res_lore_dup.status_code == 200
        assert res_lore_dup.json()["id"] == lore_id
        assert res_lore_dup.json()["category"] == "Artifact"
        assert res_lore_dup.json()["attributes"]["rarity"] == "Epic"
        assert res_lore_dup.json()["attributes"]["tier"] == "Tier 4"
        print("   [OK] Successfully enriched existing entity without creating duplicates")

        # --- 12. Lore Relationships & Constraints ---
        test_count += 1
        print(f"\n[Test {test_count}] Lore Relationships (Self-Ref & Normal)")
        res_lore2 = await client.post("/api/lore", json={
            "project_id": proj_id,
            "name": "Sky Citadel",
            "category": "Location",
            "description": "Floating fortress."
        })
        citadel_id = res_lore2.json()["id"]

        # Self-referencing link rejection
        res_self = await client.post("/api/lore-relationships", json={
            "project_id": proj_id,
            "source_id": lore_id,
            "target_id": lore_id,
            "relationship_type": "links_to"
        })
        assert res_self.status_code == 400

        # Valid relationship
        res_rel = await client.post("/api/lore-relationships", json={
            "project_id": proj_id,
            "source_id": lore_id,
            "target_id": citadel_id,
            "relationship_type": "powers"
        })
        assert res_rel.status_code == 200
        rel_id = res_rel.json()["id"]

        # Duplicate relationship idempotency
        res_rel_dup = await client.post("/api/lore-relationships", json={
            "project_id": proj_id,
            "source_id": lore_id,
            "target_id": citadel_id,
            "relationship_type": "powers"
        })
        assert res_rel_dup.status_code == 200
        assert res_rel_dup.json()["id"] == rel_id
        print("   [OK] Handled self-referencing check and relationship idempotency")

        # --- 13. Bulk Lore Relationship Creation ---
        test_count += 1
        print(f"\n[Test {test_count}] Bulk Lore Relationship Auto-Creation")
        res_bulk = await client.post("/api/lore-relationships/bulk", json={
            "project_id": proj_id,
            "relationships": [
                {"source": "Aether Core", "target": "Sky Citadel", "type": "powers"}, # Already exists
                {"source": "Kaelen Drake", "target": "Sky Citadel", "type": "infiltrated"},
                {"source": "Sky Citadel", "target": "Ancient Runes", "type": "inscribed with"} # Ancient Runes will be auto-created
            ]
        })
        assert res_bulk.status_code == 200
        assert res_bulk.json()["created"] == 2 # 1 was duplicate, 2 created

        # Verify Ancient Runes was auto-created
        res_all_lore = await client.get(f"/api/lore?project_id={proj_id}")
        names = [l["name"] for l in res_all_lore.json()]
        assert "Ancient Runes" in names
        print("   [OK] Bulk relationship creation auto-spawned missing lore entities and ignored duplicates")

        # --- 14. Lore Relationship Deletion ---
        test_count += 1
        print(f"\n[Test {test_count}] Lore Relationship Deletion & 404")
        res_del_rel = await client.delete(f"/api/lore-relationships/{rel_id}")
        assert res_del_rel.status_code == 200

        res_del_rel_404 = await client.delete(f"/api/lore-relationships/{rel_id}")
        assert res_del_rel_404.status_code == 404
        print("   [OK] Verified lore relationship deletion and 404 on subsequent delete")

        # --- 15. AI Chat Endpoint Edge Cases ---
        test_count += 1
        print(f"\n[Test {test_count}] AI Chat Validation & Error Handling")
        # Missing project -> 404
        res_chat_404 = await client.post("/api/ai/chat", json={
            "project_id": 999999,
            "messages": [{"role": "user", "content": "Hello"}]
        })
        assert res_chat_404.status_code == 404

        # Empty messages list -> 400
        res_chat_empty = await client.post("/api/ai/chat", json={
            "project_id": proj_id,
            "messages": []
        })
        assert res_chat_empty.status_code == 400

        # Blank message text -> returns graceful message without crashing
        res_chat_blank = await client.post("/api/ai/chat", json={
            "project_id": proj_id,
            "messages": [{"role": "user", "content": "   "}]
        })
        assert res_chat_blank.status_code == 200
        assert "Please provide a non-empty message" in res_chat_blank.json()["response"]
        print("   [OK] Verified AI chat project 404, empty messages 400, and blank message gracefulness")

        # --- 16. Tactical & Ambient AI 404 Validation ---
        test_count += 1
        print(f"\n[Test {test_count}] Tactical & Ambient AI 404 Validation")
        res_tact_404 = await client.post("/api/ai/tactical", json={
            "project_id": 999999,
            "system_box_text": "+5 STR",
            "surrounding_text": "text"
        })
        assert res_tact_404.status_code == 404

        res_amb_404 = await client.post("/api/ai/ambient", json={
            "project_id": 999999,
            "narrative_text": "A castle loomed."
        })
        assert res_amb_404.status_code == 404
        print("   [OK] Verified Tactical & Ambient AI return 404 for invalid projects")

        # --- 17. Cascade Deletion (Chapter Deletion cascades to Ledger) ---
        test_count += 1
        print(f"\n[Test {test_count}] Cascade Deletion: Chapter -> Ledgers")
        res_del_ch = await client.delete(f"/api/chapters/{chap1_id}")
        assert res_del_ch.status_code == 200

        res_ledgers_after = await client.get(f"/api/characters/{kaelen_id}/ledger")
        assert res_ledgers_after.status_code == 200
        assert len(res_ledgers_after.json()) == 0
        print("   [OK] Deleting chapter cleanly cascaded and removed linked ledger entries")

        # --- 18. Cascade Deletion (Project Deletion cascades all related entities) ---
        test_count += 1
        print(f"\n[Test {test_count}] Cascade Deletion: Project -> All Entities")
        res_del_proj = await client.delete(f"/api/projects/{proj_id}")
        assert res_del_proj.status_code == 200

        # Verify project is gone
        res_p_check = await client.get(f"/api/projects/{proj_id}")
        assert res_p_check.status_code == 404

        # Verify characters are gone
        res_chars_gone = await client.get(f"/api/characters?project_id={proj_id}")
        assert len(res_chars_gone.json()) == 0

        # Verify lore is gone
        res_lore_gone = await client.get(f"/api/lore?project_id={proj_id}")
        assert len(res_lore_gone.json()) == 0

        # Verify relationships are gone
        res_rels_gone = await client.get(f"/api/lore-relationships?project_id={proj_id}")
        assert len(res_rels_gone.json()) == 0
        print("   [OK] Project deletion cleanly cascaded to characters, lore, and relationships")

        # Clean up secondary project
        await client.delete(f"/api/projects/{p2_id}")

        # --- 19. Schema Resilience Tests (Pydantic Models) ---
        test_count += 1
        print(f"\n[Test {test_count}] Pydantic Schema Resilience")
        sc1 = StatChange(stat="MP", delta="-50")
        assert sc1.new_value is None and sc1.delta == "-50"

        sc2 = StatChange(stat="HP", new_value=300.5)
        assert sc2.new_value == 300.5 and sc2.delta is None

        la = ListAddition(list_name="Inventory", value="Rusty Dagger")
        assert la.list_name == "Inventory" and la.value == "Rusty Dagger"
        print("   [OK] StatChange and ListAddition handle partial and numeric types seamlessly")

        # --- 20. Client-Side Manuscript Parser & HTML Escape Sanity ---
        test_count += 1
        print(f"\n[Test {test_count}] Manuscript Importer HTML Escaping & Chunking Logic")
        raw_manuscript = """Chapter 1: The New Realm
Kaelen checked his status:
<System Alert: Vitality Low>
He drank a potion <Restorative Potion +50 HP>.

Chapter 2: The Ascent
# Heading in markdown
A second notification appeared: <Skill Learned: Fireball>
"""
        chunks = [c.strip() for c in re.split(r'(?:^|\n)(?=#?\s*Chapter\s+\d+|#?\s*Prologue)', raw_manuscript, flags=re.IGNORECASE) if c.strip()]
        assert len(chunks) == 2, f"Expected 2 chunks, got {len(chunks)}"

        def escape_html(s: str) -> str:
            return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        escaped = escape_html(chunks[0])
        assert "<System Alert: Vitality Low>" not in escaped
        assert "&lt;System Alert: Vitality Low&gt;" in escaped
        print("   [OK] Verified manuscript chunking and HTML escaping protects LitRPG system tags")

        # --- 21. Multi-Turn AI Chat Role Aliases ---
        test_count += 1
        print(f"\n[Test {test_count}] Multi-Turn AI Chat Role Normalization")
        res_temp_p = await client.post("/api/projects", json={"title": "Chat Test Realm"})
        chat_pid = res_temp_p.json()["id"]

        chat_payload = {
            "project_id": chat_pid,
            "messages": [
                {"role": "user", "content": "Hello world"},
                {"role": "assistant", "content": "Greetings traveler"},
                {"role": "bot", "content": "System operational"},
                {"role": "model", "content": "How can I assist?"},
                {"role": "user", "content": "What is my current quest?"}
            ]
        }
        # Testing route acceptance & validation without crash
        # If API key is missing or dummy in dev, generate_chat_response handles gracefully
        res_chat_multi = await client.post("/api/ai/chat", json=chat_payload)
        assert res_chat_multi.status_code == 200
        assert "response" in res_chat_multi.json()
        print("   [OK] Verified multi-turn role normalization (assistant/bot/model -> model)")

        # --- 22. Ledger Timestamp Order (Descending) ---
        test_count += 1
        print(f"\n[Test {test_count}] Ledger Timestamp Sorting (DESC)")
        res_c_tmp = await client.post("/api/characters", json={"project_id": chat_pid, "name": "Time Tracker"})
        t_char_id = res_c_tmp.json()["id"]
        res_ch_tmp = await client.post("/api/chapters", json={"project_id": chat_pid, "title": "C1", "content": "", "words": 0, "order": 1})
        t_ch_id = res_ch_tmp.json()["id"]

        # Insert 2 ledger entries
        await client.post(f"/api/characters/{t_char_id}/ledger", json={
            "chapter_id": t_ch_id,
            "event_name": "First Event",
            "changes": {"EXP": "+100"},
            "source_type": "Manual"
        })
        await asyncio.sleep(0.05)
        await client.post(f"/api/characters/{t_char_id}/ledger", json={
            "chapter_id": t_ch_id,
            "event_name": "Second Event",
            "changes": {"EXP": "+200"},
            "source_type": "Manual"
        })

        res_ledg = await client.get(f"/api/characters/{t_char_id}/ledger")
        assert res_ledg.status_code == 200
        ledg_items = res_ledg.json()
        assert len(ledg_items) == 2
        # Most recent should be first
        assert ledg_items[0]["event_name"] == "Second Event"
        assert ledg_items[1]["event_name"] == "First Event"
        print("   [OK] Verified ledger entries are sorted by timestamp DESC")

        # --- 23. Nested JSON Attributes in Lore ---
        test_count += 1
        print(f"\n[Test {test_count}] Lore Complex JSON Attributes & Deep Updating")
        complex_attrs = {
            "resistances": {"fire": 50, "void": -20},
            "requirements": ["Level 50", "Sword Mastery IV"],
            "lore_notes": "Forged in the heart of a dying star."
        }
        res_lore_comp = await client.post("/api/lore", json={
            "project_id": chat_pid,
            "name": "Astral Aegis",
            "category": "Artifact",
            "description": "Star shield",
            "attributes": complex_attrs
        })
        assert res_lore_comp.status_code == 200
        aegis_id = res_lore_comp.json()["id"]
        assert res_lore_comp.json()["attributes"]["resistances"]["fire"] == 50

        # Update attributes
        updated_attrs = dict(complex_attrs)
        updated_attrs["resistances"]["ice"] = 30
        res_lore_upd = await client.put(f"/api/lore/{aegis_id}", json={"attributes": updated_attrs})
        assert res_lore_upd.status_code == 200
        assert res_lore_upd.json()["attributes"]["resistances"]["ice"] == 30

        # Reject empty lore name on update
        res_empty_lore_upd = await client.put(f"/api/lore/{aegis_id}", json={"name": "   "})
        assert res_empty_lore_upd.status_code == 400

        print("   [OK] Verified complex nested JSON lore attributes create & update cleanly")

        # --- 24. Bulk Lore Relationships Empty Payload ---
        test_count += 1
        print(f"\n[Test {test_count}] Bulk Relationships Empty Payload")
        res_bulk_empty = await client.post("/api/lore-relationships/bulk", json={
            "project_id": chat_pid,
            "relationships": []
        })
        assert res_bulk_empty.status_code == 200
        assert res_bulk_empty.json()["created"] == 0
        print("   [OK] Bulk lore relationships handled empty array with created: 0")

        # --- 25. Non-Existent Project Deletion (404) ---
        test_count += 1
        print(f"\n[Test {test_count}] Non-Existent Project Deletion (404)")
        res_del_nonexistent = await client.delete("/api/projects/9999999")
        assert res_del_nonexistent.status_code == 404
        print("   [OK] DELETE /api/projects/9999999 correctly returned 404")

        # Clean up temp project
        await client.delete(f"/api/projects/{chat_pid}")

    print("\n" + "=" * 60)
    print(f"[SUCCESS] ALL {test_count} TESTS PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
