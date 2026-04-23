"""
AI Generation Service
Service layer for AI content generation using provider registry
"""

import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.ai.manager import GPTManagerService
from app.services.ai_key_resolver import resolve_execution_api_key
from app.services.ai_providers.registry import get_ai_provider
from app.services.ai_providers.types import AIGenerationResult
from app.services.prompt_builder import PromptBuilder, PromptContext

logger = logging.getLogger(__name__)


def generate_post_content(
    content_type: str, 
    product_name: str,
    product_description: Optional[str] = None,
    selling_points: Optional[list] = None,
    tone: Optional[str] = None,
    target_audience: Optional[str] = None,
    cta: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    prompt_override: Optional[str] = None,
    db: Session | None = None,
    user: User | None = None,
) -> AIGenerationResult:
    """
    Generate post content using AI provider with prompt templates.
    
    Args:
        content_type: Type of content (product_intro, promotion, engagement, general_post)
        product_name: Name of the product
        product_description: Optional product description
        selling_points: Optional list of key selling points
        tone: Optional tone/style (e.g., "professional", "casual", "enthusiastic")
        target_audience: Optional target audience description
        cta: Optional call to action
        provider: AI provider to use (defaults to config)
        model: AI model to use (defaults to config)
    
    Returns:
        AIGenerationResult with generated content or error
    """
    # Use config defaults if not provided
    provider = provider or settings.resolved_ai_provider
    model = model or settings.ai_model
    manager = GPTManagerService()
    
    logger.info(
        "AI generation request: manager=gpt execution_provider=%s model=%s content_type=%s product=%s",
        provider,
        model,
        content_type,
        product_name,
    )
    
    try:
        # Build prompt context
        context = PromptContext(
            product_name=product_name,
            product_description=product_description,
            selling_points=selling_points,
            tone=tone,
            target_audience=target_audience,
            cta=cta
        )
        
        # Build final prompt from template
        final_prompt, template_used = PromptBuilder.build_prompt(content_type, context)
        if prompt_override:
            final_prompt = prompt_override

        manager_plan = manager.create_plan(
            content_type=content_type,
            product_name=product_name,
            compiled_prompt=final_prompt,
            tone=tone,
            target_audience=target_audience,
            cta=cta,
            execution_provider=provider,
        )
        
        logger.info(f"Built prompt using template '{template_used}' (requested: '{content_type}')")
        logger.debug("Manager execution prompt length: %s characters", len(manager_plan.execution_prompt))
        
        # Get provider instance from registry
        resolved_key = None
        if provider != "mock":
            resolved_key = (
                resolve_execution_api_key(db, provider, user=user)
                if api_key is None
                else None
            )
            logger.info(
                "Execution AI resolved: provider=%s model=%s key_source=%s objective=%s",
                provider,
                model,
                resolved_key.source if resolved_key else "request",
                manager_plan.objective,
            )

        ai_provider = get_ai_provider(
            provider_name=provider,
            api_key=api_key or (resolved_key.api_key if resolved_key else None),
            base_url=base_url or settings.ai_base_url
        )
        
        # Generate content using provider with compiled prompt
        result = ai_provider.generate_post_content(
            content_type=content_type,
            product_name=product_name,
            model=model,
            prompt=manager_plan.execution_prompt,
            template_used=template_used,
        )
        
        # If generation failed, return immediately
        if not result.success:
            logger.error(f"AI generation failed: provider={result.provider}, error={result.error}")
            return result
        
        # Validate and sanitize output
        try:
            result.content = manager.normalize_output(result.content)
        except ValueError as exc:
            error_msg = f"AI output validation failed: {exc}"
            logger.warning(f"{error_msg} (provider={result.provider}, model={result.model})")
            return AIGenerationResult(
                success=False,
                content=None,
                provider=result.provider,
                model=result.model,
                usage=result.usage,
                provider_response=result.provider_response,
                error=error_msg
            )
        logger.info(f"AI generation success with validated output: provider={result.provider}, model={result.model}, template={template_used}")
        
        return result
        
    except (ValueError, HTTPException) as e:
        # Configuration error (e.g., missing API key)
        error_msg = str(e.detail) if isinstance(e, HTTPException) else f"AI provider configuration error: {str(e)}"
        logger.error(error_msg)
        return AIGenerationResult(
            success=False,
            content=None,
            provider=provider,
            model=model,
            usage=None,
            provider_response=None,
            error=error_msg
        )
    except NotImplementedError as e:
        # Provider not implemented
        error_msg = f"AI provider not available: {str(e)}"
        logger.error(error_msg)
        return AIGenerationResult(
            success=False,
            content=None,
            provider=provider,
            model=model,
            usage=None,
            provider_response=None,
            error=error_msg
        )
    except Exception as e:
        # Unexpected error
        error_msg = f"AI generation unexpected error: {str(e)}"
        logger.exception(error_msg)
        return AIGenerationResult(
            success=False,
            content=None,
            provider=provider,
            model=model,
            usage=None,
            provider_response=None,
            error=error_msg
        )
