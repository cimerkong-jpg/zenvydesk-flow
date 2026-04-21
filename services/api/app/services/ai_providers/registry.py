"""
AI Provider Registry
Central registry for managing AI provider instances
"""

import logging
from typing import Optional
from .base import BaseAIProvider
from .mock_provider import MockAIProvider

logger = logging.getLogger(__name__)


def get_ai_provider(provider_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> BaseAIProvider:
    """
    Get AI provider instance by name
    
    Args:
        provider_name: Name of the provider (mock, openai, gemini, claude, grok)
        api_key: API key for the provider (required for real providers)
        base_url: Optional custom base URL
    
    Returns:
        AI provider instance
    
    Raises:
        ValueError: If provider configuration is invalid
        NotImplementedError: If provider is not yet implemented or dependencies missing
    """
    logger.info(f"[Registry] Requesting provider: {provider_name}")
    
    if provider_name == "mock":
        logger.info("[Registry] Using mock provider")
        return MockAIProvider()
    
    if provider_name == "openai":
        if not api_key:
            logger.error("[Registry] OpenAI provider requested but no API key configured")
            raise ValueError("OpenAI provider requires AI_API_KEY to be configured")
        
        # Lazy import to handle missing dependencies gracefully
        try:
            from .openai_provider import OpenAIProvider
            logger.info("[Registry] OpenAI provider loaded successfully")
            return OpenAIProvider(api_key=api_key, base_url=base_url)
        except ImportError as e:
            error_msg = f"OpenAI provider dependencies not installed: {str(e)}. Install 'requests' package."
            logger.error(f"[Registry] {error_msg}")
            raise NotImplementedError(error_msg)
    
    # Other providers not yet implemented
    if provider_name in ["gemini", "claude", "grok"]:
        logger.warning(f"[Registry] Provider '{provider_name}' not implemented yet")
        raise NotImplementedError(f"{provider_name} provider not implemented yet")
    
    logger.error(f"[Registry] Unknown provider: {provider_name}")
    raise ValueError(f"Unknown provider: {provider_name}")
