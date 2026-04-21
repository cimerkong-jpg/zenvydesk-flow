# ZenvyDesk Flow

AI-powered social media automation platform for Facebook business pages.

## First-time Setup On A New Machine

Recommended Python version: `3.11`.

```bash
git clone https://github.com/cimerkong-jpg/zenvydesk-flow.git
cd zenvydesk-flow

python3.11 -m venv .venv
source .venv/bin/activate

cd services/api
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

cp .env.example .env
python create_tables.py
uvicorn app.main:app --reload
```

The local development database is `services/api/zenvydesk.db`.

Do not commit `.env`. The repo already ignores it.

## Repository Structure

```
zenvydesk/
├── TASK_PROGRESS.md              - Task progress log
├── README.md                     - This file
├── PROJECT_STRUCTURE.md          - Detailed project structure
├── .gitignore                    - Git ignore rules
├── services/
│   └── api/                      - FastAPI backend service
│       ├── app/                  - Application code
│       │   ├── api/routes/       - API endpoints
│       │   ├── core/             - Core configuration
│       │   ├── models/           - Database models
│       │   ├── schemas/          - Pydantic schemas
│       │   └── services/         - Business logic
│       │       ├── ai_providers/ - AI provider system
│       │       ├── prompt_templates.py
│       │       ├── prompt_builder.py
│       │       └── ai_generation.py
│       ├── tests/                - Automated tests
│       ├── requirements.txt      - Python dependencies
│       ├── pytest.ini            - Pytest configuration
│       └── Documentation/
│           ├── PROMPT_SYSTEM_IMPLEMENTATION.md
│           ├── WORKFLOW_STABILIZATION.md
│           ├── TEST_SUITE_SUMMARY.md
│           └── ...
├── packages/                     - Shared packages
├── apps/                         - Frontend applications
└── infra/                        - Infrastructure code
```

## Recent Work

### AI Provider System
- Lazy import pattern for dependency-safe loading
- Mock provider (always available)
- OpenAI provider (optional)
- Structured error handling

### Prompt Builder
- 4 reusable content-type templates
- Flexible context with optional fields
- Safe fallback for unknown types

### Automated Tests
- 4 integration tests for automation workflow
- In-memory SQLite for fast execution
- Success and failure path coverage

## Quick Start

### Backend API

```bash
cd services/api

# Create and activate a virtual environment if needed
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Copy local config
cp .env.example .env

# Initialize local SQLite tables
python create_tables.py

# Start development server
uvicorn app.main:app --reload
```

### Configuration

Use `services/api/.env.example` as the starting point for `services/api/.env`:

```env
DEBUG=true
AI_PROVIDER=mock
AI_MODEL=mock-v1
AI_API_KEY=replace_with_your_api_key
AI_BASE_URL=
```

Notes:
- `AI_PROVIDER=mock` is the easiest local default and does not require a real API key.
- Leave `AI_BASE_URL` empty unless you are using a custom compatible endpoint.
- The current backend database path is configured in code as `sqlite:///./zenvydesk.db`.

### Run Tests

```bash
cd services/api
pytest tests/test_automation_workflow.py
pytest tests/test_gemini_provider.py
```

## Documentation

See `TASK_PROGRESS.md` for detailed task history and `services/api/` documentation files for technical details.

For backend test scope, merge-readiness, and bundle audit guidance, see `services/api/BACKEND_TEST_MATRIX.md`.

For backend AI handoff details, see `services/api/AI_PROVIDER_HANDOFF.md`.

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Testing:** Pytest, HTTPx
- **AI:** OpenAI API (optional), Mock provider
- **Database:** SQLite (dev), PostgreSQL (prod)

## License

Proprietary
