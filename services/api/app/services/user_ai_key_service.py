from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import MANAGED_AI_PROVIDERS
from app.core.crypto import decrypt_secret, encrypt_secret
from app.models.user import User
from app.models.user_ai_api_key import UserAiApiKey


PROVIDER_LABELS = {
    "openai": "OpenAI",
    "gemini": "Gemini",
    "claude": "Claude",
    "grok": "Grok",
}


@dataclass
class KeyValidationResult:
    provider: str
    validation_status: str
    message: str


class UserAiKeyService:
    def __init__(self, db: Session):
        self.db = db

    def list_key_statuses(self, user: User, env_status_provider) -> list[dict]:
        rows = {
            row.provider: row
            for row in self.db.query(UserAiApiKey).filter(UserAiApiKey.user_id == user.id).all()
        }
        items: list[dict] = []
        for provider in MANAGED_AI_PROVIDERS:
            row = rows.get(provider)
            if row and row.is_active:
                items.append(
                    {
                        "provider": provider,
                        "is_configured": True,
                        "key_hint": row.key_hint,
                        "validation_status": row.validation_status or "unknown",
                        "last_validated_at": row.last_validated_at,
                        "source": "user",
                    }
                )
                continue

            env_available = bool(env_status_provider(provider))
            key_hint = None
            if env_available and provider == "openai":
                key_hint = "System fallback available"
            elif not env_available and provider != "openai":
                key_hint = "Personal API key required"
            items.append(
                {
                    "provider": provider,
                    "is_configured": env_available,
                    "key_hint": key_hint,
                    "validation_status": "unknown" if env_available else None,
                    "last_validated_at": None,
                    "source": "env" if env_available else "missing",
                }
            )
        return items

    def upsert_key(self, user: User, provider: str, api_key: str) -> UserAiApiKey:
        provider = self._normalize_provider(provider)
        validation = self.validate_key(provider, api_key)
        if validation.validation_status == "invalid":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.message)

        row = (
            self.db.query(UserAiApiKey)
            .filter(UserAiApiKey.user_id == user.id, UserAiApiKey.provider == provider)
            .first()
        )
        if row is None:
            row = UserAiApiKey(user_id=user.id, provider=provider)
            self.db.add(row)

        row.encrypted_api_key = encrypt_secret(api_key.strip())
        row.key_hint = self.mask_key(api_key)
        row.is_active = True
        row.validation_status = validation.validation_status
        row.last_validated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete_key(self, user: User, provider: str) -> None:
        provider = self._normalize_provider(provider)
        row = (
            self.db.query(UserAiApiKey)
            .filter(UserAiApiKey.user_id == user.id, UserAiApiKey.provider == provider)
            .first()
        )
        if not row:
            return
        self.db.delete(row)
        self.db.commit()

    def get_user_key_record(self, user_id: int, provider: str) -> UserAiApiKey | None:
        provider = self._normalize_provider(provider)
        return (
            self.db.query(UserAiApiKey)
            .filter(
                UserAiApiKey.user_id == user_id,
                UserAiApiKey.provider == provider,
                UserAiApiKey.is_active.is_(True),
            )
            .first()
        )

    def decrypt_key(self, row: UserAiApiKey) -> str:
        return decrypt_secret(row.encrypted_api_key)

    def validate_key(self, provider: str, api_key: str) -> KeyValidationResult:
        provider = self._normalize_provider(provider)
        candidate = api_key.strip()
        if not candidate:
            return KeyValidationResult(provider=provider, validation_status="invalid", message=f"{PROVIDER_LABELS[provider]} API key is required.")

        validators = {
            "openai": lambda value: value.startswith("sk-"),
            "gemini": lambda value: value.startswith("AIza"),
            "claude": lambda value: value.startswith("sk-ant-"),
            "grok": lambda value: value.startswith("xai-"),
        }
        if not validators[provider](candidate):
            return KeyValidationResult(
                provider=provider,
                validation_status="invalid",
                message=f"{PROVIDER_LABELS[provider]} API key format looks invalid.",
            )
        return KeyValidationResult(
            provider=provider,
            validation_status="unknown",
            message=f"{PROVIDER_LABELS[provider]} API key saved. Remote validation is not enabled in this build.",
        )

    @staticmethod
    def mask_key(api_key: str) -> str:
        value = api_key.strip()
        if len(value) <= 8:
            return f"{value[:2]}...{value[-2:]}" if len(value) > 4 else "****"
        return f"{value[:4]}...{value[-4:]}"

    @staticmethod
    def _normalize_provider(provider: str) -> str:
        normalized = (provider or "").strip().lower()
        if normalized not in MANAGED_AI_PROVIDERS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider")
        return normalized
