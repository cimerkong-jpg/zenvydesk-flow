from contextlib import contextmanager

from app.core.config import settings
from app.models.automation_rule import AutomationRule


def create_automation_rule(
    db,
    *,
    user_id,
    page_id,
    product_id=None,
    content_library_id=None,
    name,
    content_type,
    tone=None,
    language=None,
    style=None,
    auto_post=False,
    scheduled_time="daily",
    is_active=True,
):
    rule = AutomationRule(
        user_id=user_id,
        page_id=page_id,
        product_id=product_id,
        content_library_id=content_library_id,
        name=name,
        content_type=content_type,
        tone=tone,
        language=language,
        style=style,
        auto_post=auto_post,
        scheduled_time=scheduled_time,
        is_active=is_active,
    )
    db.add(rule)
    db.commit()
    return rule


@contextmanager
def override_ai_settings(**overrides):
    original_values = {key: getattr(settings, key) for key in overrides}
    try:
        for key, value in overrides.items():
            setattr(settings, key, value)
        yield
    finally:
        for key, value in original_values.items():
            setattr(settings, key, value)
