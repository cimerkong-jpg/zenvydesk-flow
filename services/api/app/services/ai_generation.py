"""
AI Generation Service
Service layer for AI content generation using provider registry
"""

import logging
from typing import Optional

from app.core.config import settings
from app.services.ai_providers.registry import get_ai_provider
from app.services.ai_providers.types import AIGenerationResult
from app.services.prompt_builder import PromptBuilder, PromptContext
from app.services.output_validator import OutputValidator

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
    prompt_override: Optional[str] = None,
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
    
    logger.info(f"AI generation request: provider={provider}, model={model}, content_type={content_type}, product={product_name}")
    
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
        
        logger.info(f"Built prompt using template '{template_used}' (requested: '{content_type}')")
        logger.debug(f"Final prompt length: {len(final_prompt)} characters")
        
        # Get provider instance from registry
        ai_provider = get_ai_provider(
            provider_name=provider,
            api_key=settings.resolved_ai_api_key,
            base_url=settings.ai_base_url
        )
        
        # Generate content using provider with compiled prompt
        result = ai_provider.generate_post_content(
            content_type=content_type,
            product_name=product_name,
            model=model,
            prompt=final_prompt,
            template_used=template_used
        )
        
        # If generation failed, return immediately
        if not result.success:
            logger.error(f"AI generation failed: provider={result.provider}, error={result.error}")
            return result
        
        # Validate and sanitize output
        validation_result = OutputValidator.validate_and_clean(result.content)
        
        if not validation_result.success:
            # Output validation failed - return safe failure
            error_msg = f"AI output validation failed: {validation_result.error}"
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
        
        # Update result with cleaned content
        result.content = validation_result.cleaned_content
        logger.info(f"AI generation success with validated output: provider={result.provider}, model={result.model}, template={template_used}")
        
        return result
        
    except ValueError as e:
        # Configuration error (e.g., missing API key)
        error_msg = f"AI provider configuration error: {str(e)}"
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
