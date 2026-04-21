# ZenvyDesk Flow

AI-powered social media automation platform for Facebook business pages.

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

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Start development server
uvicorn app.main:app --reload
```

### Configuration

Create `.env` file in `services/api/`:

```env
AI_PROVIDER=mock
AI_MODEL=mock-v1
AI_API_KEY=your_key_here
DATABASE_URL=sqlite:///./zenvydesk.db
```

## Documentation

See `TASK_PROGRESS.md` for detailed task history and `services/api/` documentation files for technical details.

For backend AI handoff details, see `services/api/AI_PROVIDER_HANDOFF.md`.

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Testing:** Pytest, HTTPx
- **AI:** OpenAI API (optional), Mock provider
- **Database:** SQLite (dev), PostgreSQL (prod)

## License

Proprietary
