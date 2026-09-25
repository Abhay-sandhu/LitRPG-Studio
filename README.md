# ChronicleRPG Studio

ChronicleRPG Studio is an AI-powered, local-first writing environment specifically designed for **LitRPG and Progression Fantasy** authors. 

Traditional word processors don't understand character stats, system boxes, or sprawling world-building. ChronicleRPG solves this by actively reading what you write, extracting lore, tracking character progression, and visualizing your world in real-time.

## ✨ Features

- 📝 **Rich Text Editor**: A seamless, block-based writing experience powered by TipTap.
- 🧠 **Tactical AI (System Box Detection)**: Automatically detects when you type `<blockquote>` or system messages. The AI parses the text, calculates the stat changes, and offers to permanently apply them to your character sheet.
- 🔮 **Ambient AI (World-Building)**: Scans your chapters in the background to automatically identify new characters, items, locations, and lore—adding them to your Story Bible without breaking your flow.
- 🌌 **Constellation Map**: A dynamic, interactive force-directed graph that visualizes the relationships between your characters, factions, and items.
- 📊 **Live Character Sheet & Ledgers**: Watch your protagonist's stats update in real-time. Every change (e.g., "+5 Strength") is recorded in a transaction ledger tied to the exact chapter it occurred in.
- 🧘‍♂️ **Zen Mode**: Toggle distraction-free writing with a single click.

## 🏗️ Architecture

ChronicleRPG is built for speed and complete local control:

- **Frontend**: React + Vite + TypeScript. Uses Zustand for global state management and TanStack Query for caching and data fetching. Styled with TailwindCSS.
- **Backend**: FastAPI (Python) serving a fully asynchronous REST API.
- **Database**: Local SQLite database via SQLAlchemy (`aiosqlite`), utilizing a clean Repository Pattern (`crud.py`) for maintainability.
- **AI Integration**: Powered by Google's Gemini AI, utilizing strict JSON Structured Outputs (`response_schema`) for deterministic data extraction.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set your API Key:
   Create a `.env` file in the `backend` directory and add your key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
