from .health import router as health_router
from .products import router as products_router
from .content_library import router as content_library_router
from .drafts import router as drafts_router
from .post_history import router as post_history_router
from .posting import router as posting_router
from .schedules import router as schedules_router
from .automation_rules import router as automation_rules_router
from .automation_runner import router as automation_runner_router
from .test_scheduled_posting import router as test_scheduled_posting_router
from .auth_facebook_lite import router as auth_facebook_lite_router
from .pages import router as pages_router

__all__ = ["health_router", "products_router", "content_library_router", "drafts_router", "post_history_router", "posting_router", "schedules_router", "automation_rules_router", "automation_runner_router", "test_scheduled_posting_router", "auth_facebook_lite_router", "pages_router"]
