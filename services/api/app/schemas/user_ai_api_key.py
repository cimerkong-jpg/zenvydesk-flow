from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.core.config import MANAGED_AI_PROVIDERS


ProviderLiteral = Literal["openai", "gemini", "claude", "grok"]


class UserAiApiKeyUpsertRequest(BaseModel):
    api_key: str


class UserAiApiKeyStatusResponse(BaseModel):
    provider: ProviderLiteral
    is_configured: bool
    key_hint: str | None = None
    validation_status: str | None = None
    last_validated_at: datetime | None = None
    source: Literal["user", "env", "missing"]


class UserAiApiKeyListResponse(BaseModel):
    items: list[UserAiApiKeyStatusResponse]


class UserAiApiKeyValidationResponse(BaseModel):
    provider: ProviderLiteral
    validation_status: str
    message: str


class UserAiApiKeyProviderPath(BaseModel):
    provider: ProviderLiteral

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in MANAGED_AI_PROVIDERS:
            raise ValueError("Unsupported provider")
        return normalized
