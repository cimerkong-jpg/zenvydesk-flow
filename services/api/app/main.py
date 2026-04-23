import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_users_router,
    auth_facebook_router,
    auth_router,
    automation_rules_router,
    automation_runner_router,
    content_library_router,
    creative_router,
    drafts_router,
    facebook_connections_router,
    health_router,
    pages_router,
    post_history_router,
    posting_router,
    products_router,
    schedules_router,
    settings_router,
    test_scheduled_posting_router,
)
from app.core.database import SessionLocal, init_database
from app.db.seed_admin import seed_admin

logger = logging.getLogger(__name__)

app = FastAPI(title="ZenvyDesk API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://zenvydesk.onrender.com",
        "https://zenvydesk-staging.onrender.com",
        "https://zenvydesk.site",
        "https://www.zenvydesk.site",
        "https://api.zenvydesk.site",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router)
app.include_router(auth_facebook_router)
app.include_router(facebook_connections_router)
app.include_router(admin_users_router)
app.include_router(products_router, prefix="/api/v1/products", tags=["products"])
app.include_router(content_library_router, prefix="/api/v1/content-library", tags=["content-library"])
app.include_router(drafts_router, prefix="/api/v1/drafts", tags=["drafts"])
app.include_router(post_history_router, prefix="/api/v1/post-history", tags=["post-history"])
app.include_router(posting_router, prefix="/api/v1/posting", tags=["posting"])
app.include_router(schedules_router, prefix="/api/v1/schedules", tags=["schedules"])
app.include_router(automation_rules_router, prefix="/api/v1/automation-rules", tags=["automation-rules"])
app.include_router(automation_runner_router, prefix="/api/v1/automation-runner", tags=["automation-runner"])
app.include_router(test_scheduled_posting_router)
app.include_router(pages_router)
app.include_router(settings_router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(creative_router, prefix="/api/v1/creative", tags=["creative"])


@app.on_event("startup")
async def startup_tasks():
    logger.info("Starting ZenvyDesk API")
    init_database()
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "ZenvyDesk API"}
