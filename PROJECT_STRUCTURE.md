# ZenvyDesk Project Structure

Complete monorepo structure created on 2026-04-20

```
zenvydesk/
├── .git/                           # Git repository
├── .gitignore                      # Git ignore rules
├── README.md                       # Project documentation
│
├── apps/                           # Application layer
│   └── web/                        # React + Vite frontend
│       ├── src/
│       │   ├── pages/              # Page components
│       │   ├── features/           # Feature modules
│       │   ├── components/         # Shared components
│       │   ├── store/              # State management
│       │   ├── lib/                # Libraries
│       │   ├── hooks/              # Custom hooks
│       │   ├── types/              # TypeScript types
│       │   ├── App.tsx             # Root component
│       │   ├── main.tsx            # Entry point
│       │   └── index.css           # Global styles
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
│
├── services/                       # Backend services
│   ├── api/                        # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   └── routes/         # API routes
│   │   │   ├── core/               # Core functionality
│   │   │   ├── domain/             # Domain logic
│   │   │   ├── services/           # Business services
│   │   │   ├── models/             # Database models
│   │   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── repositories/       # Data access layer
│   │   │   ├── __init__.py
│   │   │   └── main.py             # FastAPI app
│   │   ├── .venv/                  # Python virtual env
│   │   └── requirements.txt
│   │
│   └── worker/                     # Background worker
│       └── app/
│           └── main.py             # Worker entry point
│
├── packages/                       # Shared packages
│   ├── ai-core/                    # Core AI functionality
│   │   ├── src/
│   │   └── README.md
│   ├── ai-providers/               # AI provider integrations
│   │   ├── src/
│   │   └── README.md
│   ├── automation-core/            # Automation engine
│   │   ├── src/
│   │   └── README.md
│   ├── domain-core/                # Domain logic
│   │   ├── src/
│   │   └── README.md
│   ├── shared-types/               # Shared TypeScript types
│   │   ├── src/
│   │   └── README.md
│   ├── shared-utils/               # Shared utilities
│   │   ├── src/
│   │   └── README.md
│   └── ui/                         # Shared UI components
│       ├── src/
│       └── README.md
│
├── tools/                          # Development tools
│   └── desktop-bot/                # Desktop automation bot
│
├── docs/                           # Documentation
│   ├── architecture/               # Architecture docs
│   ├── product/                    # Product docs
│   ├── migration/                  # Migration guides
│   ├── api/                        # API documentation
│   └── ai/                         # AI documentation
│
├── infra/                          # Infrastructure
│   ├── docker/                     # Docker configs
│   ├── deployment/                 # Deployment configs
│   ├── scripts/                    # Utility scripts
│   └── env/                        # Environment configs
│
└── landing/                        # Landing page (existing)
    ├── index.html
    ├── privacy-policy.html
    ├── terms-of-service.html
    ├── data-deletion.html
    └── README.md
```

## Status

✅ **Complete** - Clean monorepo structure initialized

### Working Components

1. **Web App** (apps/web)
   - React 18 + TypeScript
   - Vite 5 for build tooling
   - Dependencies installed
   - Ready to run: `npm run dev`

2. **API Service** (services/api)
   - FastAPI + Uvicorn
   - Python virtual environment created
   - Dependencies installed
   - Ready to run: `uvicorn app.main:app --reload`

3. **Worker Service** (services/worker)
   - Basic Python worker
   - Ready to run: `python app/main.py`

4. **Packages**
   - All 7 packages created with src/ folders
   - Empty modules ready for implementation

## Next Steps

1. Implement domain logic in packages/domain-core
2. Build out API routes and services
3. Develop frontend features
4. Add AI integrations
5. Set up automation workflows
6. Configure deployment infrastructure

## Commands

### Web App
```bash
cd apps/web
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
```

### API Service
```bash
cd services/api
.venv\Scripts\activate    # Windows
uvicorn app.main:app --reload --port 8000
```

### Worker Service
```bash
cd services/worker
python app/main.py
```
