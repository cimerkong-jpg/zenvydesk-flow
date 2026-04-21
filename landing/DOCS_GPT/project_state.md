# ZenvyDesk Project State

## Project Overview

ZenvyDesk is an AI-powered Social Commerce Assistant designed to automate content generation, page management, scheduling, and posting for Facebook business pages.

**Core Features:**
- AI-driven content generation for social media posts
- Product catalog management
- Content library and templates
- Draft creation and management
- Post scheduling
- Automated posting workflows
- Post history tracking
- Automation rules for recurring content

## Current Backend Architecture

**Technology Stack:**
- **Framework:** FastAPI (Python)
- **ORM:** SQLAlchemy
- **Database:** SQLite (development)
- **Architecture:** Monorepo structure

**Monorepo Path:**
```
zenvydesk/services/api/
```

## Current Database Models

The system uses 8 core database models:

1. **User** - User accounts and authentication
2. **FacebookPage** - Connected Facebook business pages
3. **Product** - Product catalog for e-commerce
4. **ContentLibrary** - Reusable content templates
5. **Draft** - Post drafts with scheduling support
6. **MediaLibrary** - Media assets management
7. **PostHistory** - Historical record of published posts
8. **AutomationRule** - Automation configuration for recurring posts

## Current API Modules

The API provides 8 workflow modules under `/api/v1/`:

1. **`/products`** - Product catalog CRUD operations
2. **`/content-library`** - Content template management
3. **`/drafts`** - Draft creation and management
4. **`/post-history`** - Post history tracking and retrieval
5. **`/posting`** - Manual posting from drafts
6. **`/schedules`** - Draft scheduling operations
7. **`/automation-rules`** - Automation rule configuration
8. **`/automation-runner`** - Execute automation workflows

## Current AI Layer

**AI Provider Architecture:**

The system implements a provider registry pattern for AI content generation:

**Configuration:**
- `app/core/ai_config.py` - Provider and model configuration
  - Default Provider: `mock`
  - Default Model: `mock-v1`
  - Supported Providers: `mock`, `openai`, `gemini`, `claude`, `grok`

**Service Layer:**
- `app/services/ai_generation.py` - Main AI generation service interface

**Provider Registry:**
- `app/services/ai_providers/base.py` - BaseAIProvider abstract class
- `app/services/ai_providers/mock_provider.py` - Mock provider implementation
- `app/services/ai_providers/registry.py` - Provider registry and factory

**Current Status:**
- Mock provider fully functional
- Real AI providers (OpenAI, Gemini, Claude, Grok) not yet implemented
- Provider switching architecture ready for integration

## Current Working Workflows

**1. Manual Content Creation:**
```
Product + ContentLibrary → Draft → Posting → PostHistory
```

**2. Scheduled Posting:**
```
Draft → Schedule → (Future: Worker execution)
```

**3. Automated Content Generation:**
```
AutomationRule → AutomationRunner → AI Generation → Draft → PostHistory
```

**Workflow Details:**
- Products and content templates can be combined to create drafts
- Drafts can be posted immediately or scheduled for future posting
- Automation rules trigger AI-generated content creation
- AI provider registry selects appropriate provider (currently mock)
- Generated content is saved as drafts and optionally auto-posted
- All posts are tracked in post history

## Current Project Status

**✅ Completed:**
- Core backend API structure
- Database models and relationships
- CRUD operations for all entities
- AI provider registry pattern
- Mock AI provider implementation
- Automation workflow prototype
- Draft scheduling system
- Post history tracking

**⚠️ Not Production-Ready:**
- No real AI provider integrations
- No authentication/authorization
- No user isolation
- No background job processing
- No real Facebook API integration
- No media upload handling
- No frontend integration
- SQLite database (dev only)

## Next Steps Roadmap

**Phase 1: AI Integration**
- [ ] Implement OpenAI provider
- [ ] Implement Gemini provider  
- [ ] Implement Claude provider
- [ ] Implement Grok provider
- [ ] Add prompt engineering system
- [ ] Add prompt templates per content type

**Phase 2: Background Processing**
- [ ] Implement worker service
- [ ] Add job queue (Celery/RQ)
- [ ] Scheduled post execution
- [ ] Retry logic for failed posts

**Phase 3: Facebook Integration**
- [ ] Real Facebook Graph API posting
- [ ] OAuth authentication flow
- [ ] Page access token management
- [ ] Media upload to Facebook
- [ ] Post analytics retrieval

**Phase 4: Authentication & Security**
- [ ] User authentication system
- [ ] JWT token management
- [ ] User isolation and permissions
- [ ] Multi-tenant support
- [ ] API rate limiting

**Phase 5: Media Management**
- [ ] Media upload endpoints
- [ ] Image processing and optimization
- [ ] Cloud storage integration (S3/GCS)
- [ ] Media library UI integration

**Phase 6: Frontend Integration**
- [ ] Connect React frontend to API
- [ ] Dashboard implementation
- [ ] Draft composer UI
- [ ] Automation rule builder
- [ ] Analytics dashboard

**Phase 7: Production Readiness**
- [ ] PostgreSQL migration
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Monitoring and logging
- [ ] Error tracking (Sentry)
- [ ] Performance optimization
- [ ] API documentation (Swagger)

## Development Notes

**Current Development Focus:**
The project is in the prototype phase with a working automation engine. The AI provider registry is implemented and tested with a mock provider. The next priority is integrating real AI providers and implementing the background worker for scheduled posts.

**Testing Status:**
- Manual API testing completed
- Automation workflows verified
- AI provider registry tested
- No automated test suite yet

**Known Limitations:**
- Single-user system (no multi-tenancy)
- Synchronous processing only
- No error recovery mechanisms
- Limited validation and error handling
- No production database setup

---

**Last Updated:** April 20, 2026
**Version:** 0.1.0-alpha
**Status:** Prototype / Development
