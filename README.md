# Real-Time Collaborative Code Editor

A real-time collaborative code editor with AI-powered autocomplete, built with FastAPI (backend) and React (frontend). Multiple users can edit code simultaneously with live synchronization and presence indicators.

## Features

- **Real-time Collaboration** - Multiple users can edit the same code simultaneously via WebSockets
- **AI Autocomplete** - Intelligent code suggestions for Python (if/else, loops, functions, etc.)
- **Multi-language Support** - Python, JavaScript, TypeScript, Java, C++
- **Code Execution** - Run code directly in the browser using Piston API
- **Persistent Sessions** - Code and language preferences are automatically saved
- **User Presence** - See who's currently in the room with avatars and indicators
- **Clean UI** - Minimalistic, modern design with responsive layout

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **WebSockets** - Real-time bidirectional communication
- **SQLAlchemy** - Async ORM for database operations
- **PostgreSQL** - Database with asyncpg driver
- **Alembic** - Database migrations
- **Pydantic** - Data validation and settings management

### Frontend
- **React** - UI framework with TypeScript
- **Redux Toolkit** - State management
- **Monaco Editor** - VS Code's editor component
- **WebSocket Client** - Real-time connection management
- **Axios** - HTTP client for API calls

## Architecture & Design Choices

### Real-Time Synchronization
- **WebSocket-based** architecture for low-latency updates
- **Debounced persistence** (2s) to reduce database writes
- **In-memory state** with periodic syncing to database
- **Session-based client identification** to handle multiple tabs

### AI Autocomplete
- **Debounced triggers** (600ms) to avoid excessive API calls
- **Rule-based pattern matching** for Python constructs
- **Monaco inline completion API** for seamless UX
- Ghost text suggestions accepted via `Tab` key

### Database Design
- **Async PostgreSQL** for non-blocking operations
- **Simple schema** - Single `Room` table with code, language, and metadata
- **Alembic migrations** for schema versioning

### State Management
- **Backend** - In-memory `RoomState` per room with debounced DB sync
- **Frontend** - Redux for global state, React hooks for component state
- **WebSocket** - Authoritative state from server, optimistic local updates

## Project Structure

```
tredence/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── db/               # Database models and CRUD
│   │   ├── routers/          # API endpoints (rooms, autocomplete)
│   │   ├── schemas/          # Pydantic models
│   │   └── services/         # Business logic (WebSocket manager)
│   ├── config.py             # Settings from environment variables
│   ├── .env                  # Backend configuration (not in git)
│   └── .env.example          # Template for environment variables
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (Editor, ParticipantList, etc.)
│   │   ├── features/         # Redux slices (user, room)
│   │   ├── hooks/            # Custom React hooks (useRoomSocket)
│   │   ├── pages/            # Page components (Landing, RoomActions, RoomPage)
│   │   ├── services/         # API clients (roomSocket, autocomplete, piston)
│   │   ├── stylesheets/      # CSS files
│   │   └── utils/            # Utility functions
│   ├── .env                  # Frontend configuration (not in git)
│   └── .env.example          # Template for environment variables
└── README.md
```

## Prerequisites

- **Python 3.11+** with `pip` and `venv`
- **Node.js 16+** with `npm`
- **PostgreSQL 13+** database server

## Setup

### 1. Clone Repository
```bash
git clone https://github.com/Chetanvaidada/multi-user-code-editor.git
cd tredence
```

### 2. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE tredence;
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend API URL (default: http://127.0.0.1:8000)
```

## Running the Application

### Start Backend Server
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at `http://127.0.0.1:8000`

### Start Frontend Server
```bash
cd frontend
npm start
```

Frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
HOST=127.0.0.1
PORT=8000
DEBUG=True
SAVE_DEBOUNCE_SECONDS=2.0
```

### Frontend (.env)
```env
REACT_APP_API_BASE=http://127.0.0.1:8000
REACT_APP_WS_BASE=ws://127.0.0.1:8000
```

## Usage

1. **Create/Join Room** - Enter your name on the landing page
2. **Create Room** - Click "Create New Room" to start a new session
3. **Join Room** - Enter a room ID to join an existing session
4. **Code Together** - Edit code in real-time with other participants
5. **AI Suggestions** - Type and pause to see autocomplete suggestions (Tab to accept)
6. **Run Code** - Click "Run" to execute code using Piston API
7. **Change Language** - Select from Python, JavaScript, TypeScript, Java, C++

## API Endpoints

- `POST /rooms` - Create a new room
- `GET /rooms/{room_id}` - Get room details
- `PUT /rooms/{room_id}/code` - Update room code
- `PUT /rooms/{room_id}/language` - Update room language
- `POST /autocomplete` - Get AI code suggestions
- `WS /ws/{room_id}` - WebSocket connection for real-time collaboration

## What I would improve with time

1. Add proper GenAI(llm) integration for auto completion
2. Add proper authentication
3. Add proper authorization
4. Add proper logging

## Limitations

1. Auto completion is only available for Python
2. Not responsive


