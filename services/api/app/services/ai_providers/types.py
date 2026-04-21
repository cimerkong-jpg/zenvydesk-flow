"""
AI Provider Response Types
Standardized response format for all AI providers
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class AIGenerationResult:
    """Standardized AI generation result"""
    success: bool
    content: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
    provider_response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
