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

logger = logging.getLogger(__name__)


def generate_post_content(
    content_type: str, 
    product_name: str,
    product_description: Optional[str] = None,
    selling_points: Optional[list] = None,
    tone: Optional[str] = None,
    output_length: Optional[str] = None,
    emoji_level: Optional[str] = None,
    target_audience: Optional[str] = None,
    cta: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> AIGenerationResult:
    """
    Generate post content using AI provider with prompt templates.
    
    Args:
        content_type: Type of content (product_intro, promotion, engagement, general_post)
        product_name: Name of the product
        product_description: Optional product description
        selling_points: Optional list of key selling points
        tone: Optional tone preset (friendly, professional, urgent, playful)
        output_length: Optional output length preset (short, medium, long)
        emoji_level: Optional emoji preset (none, light, moderate)
        target_audience: Optional target audience description
        cta: Optional call to action
        provider: AI provider to use (defaults to config)
        model: AI model to use (defaults to config)
    
    Returns:
        AIGenerationResult with generated content or error
    """
    # Use config defaults if not provided
    provider = provider or settings.ai_provider
    model = model or settings.ai_model
    
    logger.info(f"AI generation request: provider={provider}, model={model}, content_type={content_type}, product={product_name}")
    
    try:
        # Build prompt context
        context = PromptContext(
            product_name=product_name,
            product_description=product_description,
            selling_points=selling_points,
            tone=tone,
            output_length=output_length,
            emoji_level=emoji_level,
            target_audience=target_audience,
            cta=cta
        )
        
        # Build final prompt from template
        final_prompt, template_used = PromptBuilder.build_prompt(content_type, context)
        
        logger.info(f"Built prompt using template '{template_used}' (requested: '{content_type}')")
        logger.debug(f"Final prompt length: {len(final_prompt)} characters")
        
        # Get provider instance from registry
        ai_provider = get_ai_provider(
            provider_name=provider,
            api_key=settings.ai_api_key,
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
        
        if result.success:
            logger.info(f"AI generation success: provider={result.provider}, model={result.model}, template={template_used}")
        else:
            logger.error(f"AI generation failed: provider={result.provider}, error={result.error}")
        
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
