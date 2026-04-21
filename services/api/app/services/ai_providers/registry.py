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
    
    if provider_name == "gemini":
        if not api_key:
            logger.error("[Registry] Gemini provider requested but no API key configured")
            raise ValueError("Gemini provider requires AI_API_KEY to be configured")
        
        # Lazy import to handle missing dependencies gracefully
        try:
            from .gemini_provider import GeminiProvider
            logger.info("[Registry] Gemini provider loaded successfully")
            return GeminiProvider(api_key=api_key, base_url=base_url)
        except ImportError as e:
            error_msg = f"Gemini provider dependencies not installed: {str(e)}. Install 'requests' package."
            logger.error(f"[Registry] {error_msg}")
            raise NotImplementedError(error_msg)
    
    if provider_name == "claude":
        if not api_key:
            logger.error("[Registry] Claude provider requested but no API key configured")
            raise ValueError("Claude provider requires AI_API_KEY to be configured")
        
        # Lazy import to handle missing dependencies gracefully
        try:
            from .claude_provider import ClaudeProvider
            logger.info("[Registry] Claude provider loaded successfully")
            return ClaudeProvider(api_key=api_key, base_url=base_url)
        except ImportError as e:
            error_msg = f"Claude provider dependencies not installed: {str(e)}. Install 'requests' package."
            logger.error(f"[Registry] {error_msg}")
            raise NotImplementedError(error_msg)
    
    # Other providers not yet implemented
    if provider_name in ["grok"]:
        logger.warning(f"[Registry] Provider '{provider_name}' not implemented yet")
        raise NotImplementedError(f"{provider_name} provider not implemented yet")
    
    logger.error(f"[Registry] Unknown provider: {provider_name}")
    raise ValueError(f"Unknown provider: {provider_name}")
