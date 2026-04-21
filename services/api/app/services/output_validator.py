"""
AI Output Validation and Sanitization Service
Validates and cleans AI-generated content before persistence.
"""

import re
from typing import Optional

from pydantic import BaseModel


class ValidationResult(BaseModel):
    """Result of output validation."""

    success: bool
    cleaned_content: Optional[str] = None
    error: Optional[str] = None


class OutputValidator:
    """Validates and sanitizes AI-generated output."""

    MIN_CONTENT_LENGTH = 10

    LEADING_META_PATTERNS = [
        r"^\s*here\s+is\s+(?:your|a|the)\s+(?:social\s+media\s+)?post[:\-\s]*",
        r"^\s*certainly[!,]?\s+(?:here(?:'|’)s?|here\s+is)\s+.*?(?:post|caption)[:\-\s]*",
        r"^\s*sure[!,]?\s+(?:here(?:'|’)s?|here\s+is)\s+.*?(?:post|caption)[:\-\s]*",
        r"^\s*i(?:'|’)ll\s+(?:create|generate|write)\s+(?:a\s+)?(?:social\s+media\s+)?post[:\-\s]*",
        r"^\s*let\s+me\s+(?:create|generate|write)\s+(?:a\s+)?(?:social\s+media\s+)?post[:\-\s]*",
    ]
    LEAKAGE_PATTERNS = [
        r"generate\s+a\s+social\s+media\s+post",
        r"create\s+(?:an?\s+)?(?:engaging|promotional|social\s+media)\s+post",
        r"\brequirements:\b",
        r"\bkey points:\b",
        r"\btarget audience:\b",
        r"\btone preset\b",
        r"\bemoji use\b",
        r"\boutput length\b",
        r"\bcall to action:\b",
        r"\bcta:\b",
        r"\bas an ai\b",
        r"\bhere(?:'|’)s?\s+your\s+post\b",
    ]

    @classmethod
    def validate_and_clean(cls, content: str) -> ValidationResult:
        """Validate and sanitize AI output."""
        if content is None:
            return ValidationResult(success=False, error="AI output is None")

        cleaned = cls._sanitize(content)
        if not cleaned:
            return ValidationResult(success=False, error="AI output is empty or whitespace-only")

        cleaned = cls._remove_meta_prefix(cleaned)
        if not cleaned:
            return ValidationResult(success=False, error="AI output is empty after sanitization")

        if len(cleaned) < cls.MIN_CONTENT_LENGTH:
            return ValidationResult(
                success=False,
                error=f"AI output too short (minimum {cls.MIN_CONTENT_LENGTH} characters)",
            )

        if cls._contains_instruction_leakage(cleaned):
            return ValidationResult(
                success=False,
                error="AI output contains prompt echo or instruction leakage",
            )

        return ValidationResult(success=True, cleaned_content=cleaned)

    @classmethod
    def _sanitize(cls, content: str) -> str:
        """Trim whitespace and normalize spacing."""
        content = content.strip()
        content = re.sub(r"\n\s*\n\s*\n+", "\n\n", content)
        content = re.sub(r"[ \t]+\n", "\n", content)
        content = re.sub(r" {2,}", " ", content)
        return content

    @classmethod
    def _contains_instruction_leakage(cls, content: str) -> bool:
        """Check for prompt echo or instruction leakage."""
        for pattern in cls.LEAKAGE_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return True
        return False

    @classmethod
    def _remove_meta_prefix(cls, content: str) -> str:
        """Remove safe, leading meta commentary if present."""
        for pattern in cls.LEADING_META_PATTERNS:
            content = re.sub(pattern, "", content, count=1, flags=re.IGNORECASE | re.DOTALL)
        return cls._sanitize(content)
