import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# We will regex match from `@app...` down to the next `@app...`
def extract_route(name):
    # Match `@app.xyz("/api/...")\nasync def name(...):` and the body until the next `@app.` or end of file
    pattern = r"(@app\.(?:get|post|put|delete|patch)\([^\)]+\)\nasync def " + name + r"\((.*?)\):)\n((?:(?: {4}.*?\n)|(?: *\n))*)"
    match = re.search(pattern, main_code)
    if match:
        full_def = match.group(1)
        args_str = match.group(2)
        body = match.group(3)
        return full_def, args_str, body
    return None, None, None

funcs = [
    "get_lore", "create_lore", "update_lore", "delete_lore",
    "get_lore_relationships", "create_lore_relationship", "delete_lore_relationship", "bulk_create_lore_relationships",
    "get_characters", "create_character", "update_character", "delete_character",
    "get_ledgers", "create_ledger", "delete_ledger"
]

crud_code = "\n"
for func in funcs:
    full_def, args, body = extract_route(func)
    if body:
        # Build crud function
        crud_args = args.replace("db: AsyncSession = Depends(get_db)", "db: AsyncSession").replace(", db: AsyncSession", "").replace("db: AsyncSession, ", "")
        
        crud_func = f"async def {func}(db: AsyncSession, {crud_args}):\n{body}" if crud_args else f"async def {func}(db: AsyncSession):\n{body}"
        # Some endpoints use payload instead of specific args, we just keep whatever was there and make sure db is passed
        crud_func = crud_func.replace("db: AsyncSession, payload: BulkLoreRelationshipRequest", "db: AsyncSession, payload: schemas.BulkLoreRelationshipRequest")
        crud_func = crud_func.replace("payload: BulkLoreRelationshipRequest", "payload: schemas.BulkLoreRelationshipRequest")

        crud_code += crud_func + "\n"

        # Replace in main.py
        # Find exactly what arguments need to be passed to crud.
        # It's always db, plus whatever other arguments exist
        arg_names = []
        for arg in args.split(","):
            arg = arg.strip()
            if not arg: continue
            name = arg.split(":")[0].strip()
            if name != "db":
                arg_names.append(name)
        
        pass_args = ["db"] + arg_names
        new_body = f"    return await crud.{func}({', '.join(pass_args)})\n"
        
        main_code = main_code.replace(f"{full_def}\n{body}", f"{full_def}\n{new_body}\n")

# Append to crud.py
with open('backend/app/crud.py', 'a', encoding='utf-8') as f:
    f.write(crud_code)

# Write back to main.py
# Also add BulkLoreRelationshipRequest to schemas
main_code = main_code.replace("class BulkLoreRelationshipRequest(BaseModel):\n    project_id: int\n    relationships: list[dict] # {\"source\": str, \"target\": str, \"type\": str}\n\n", "")
with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
