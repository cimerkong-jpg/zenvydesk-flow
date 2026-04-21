from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health_router, products_router, content_library_router, drafts_router, post_history_router, posting_router, schedules_router, automation_rules_router, automation_runner_router, test_scheduled_posting_router, auth_facebook_lite_router

app = FastAPI(title="ZenvyDesk API", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with versioned prefix
app.include_router(health_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1/products", tags=["products"])
app.include_router(content_library_router, prefix="/api/v1/content-library", tags=["content-library"])
app.include_router(drafts_router, prefix="/api/v1/drafts", tags=["drafts"])
app.include_router(post_history_router, prefix="/api/v1/post-history", tags=["post-history"])
app.include_router(posting_router, prefix="/api/v1/posting", tags=["posting"])
app.include_router(schedules_router, prefix="/api/v1/schedules", tags=["schedules"])
app.include_router(automation_rules_router, prefix="/api/v1/automation-rules", tags=["automation-rules"])
app.include_router(automation_runner_router, prefix="/api/v1/automation-runner", tags=["automation-runner"])
app.include_router(test_scheduled_posting_router)
app.include_router(auth_facebook_lite_router)


@app.get("/")
async def root():
    return {"message": "ZenvyDesk API"}
