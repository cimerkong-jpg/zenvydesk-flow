"""
Prompt Builder Service
Compiles prompts from templates with context
"""

import logging
from typing import Optional
from dataclasses import dataclass

from .prompt_templates import (
    DEFAULT_EMOJI_PRESET,
    DEFAULT_LENGTH_PRESET,
    DEFAULT_TEMPLATE,
    DEFAULT_TONE_PRESET,
    EMOJI_PRESETS,
    LENGTH_PRESETS,
    TONE_PRESETS,
    get_supported_emoji_presets,
    get_supported_length_presets,
    get_supported_tone_presets,
    get_supported_types,
    get_template,
)

logger = logging.getLogger(__name__)


@dataclass
class PromptContext:
    """Context for prompt building"""
    product_name: str
    product_description: Optional[str] = None
    selling_points: Optional[list] = None
    tone: Optional[str] = None
    output_length: Optional[str] = None
    emoji_level: Optional[str] = None
    target_audience: Optional[str] = None
    cta: Optional[str] = None  # Call to action


class PromptBuilder:
    """Builds prompts from templates and context"""

    @staticmethod
    def _resolve_tone_preset(tone: Optional[str]) -> tuple[str, str]:
        """Resolve tone preset with fallback."""
        selected = tone if tone in TONE_PRESETS else DEFAULT_TONE_PRESET
        return selected, TONE_PRESETS[selected]

    @staticmethod
    def _resolve_length_preset(output_length: Optional[str]) -> tuple[str, str]:
        """Resolve output length preset with fallback."""
        selected = output_length if output_length in LENGTH_PRESETS else DEFAULT_LENGTH_PRESET
        return selected, LENGTH_PRESETS[selected]

    @staticmethod
    def _resolve_emoji_preset(emoji_level: Optional[str]) -> tuple[str, str]:
        """Resolve emoji preset with fallback."""
        selected = emoji_level if emoji_level in EMOJI_PRESETS else DEFAULT_EMOJI_PRESET
        return selected, EMOJI_PRESETS[selected]

    @classmethod
    def _build_quality_controls(cls, context: PromptContext) -> str:
        """Build reusable prompt quality controls block."""
        tone_preset, tone_instruction = cls._resolve_tone_preset(context.tone)
        length_preset, length_instruction = cls._resolve_length_preset(context.output_length)
        emoji_preset, emoji_instruction = cls._resolve_emoji_preset(context.emoji_level)

        controls = [
            f"Tone preset ({tone_preset}): {tone_instruction}",
            f"Output length ({length_preset}): {length_instruction}",
            f"Emoji use ({emoji_preset}): {emoji_instruction}",
        ]

        if context.cta:
            controls.append(f'CTA: Include this call to action naturally if it fits: "{context.cta}"')
        else:
            controls.append("CTA: Do not force a call to action if one is not provided.")

        return "\n- ".join(controls)
    
    @staticmethod
    def build_prompt(content_type: str, context: PromptContext) -> tuple[str, str]:
        """
        Build final prompt from template and context.
        
        Args:
            content_type: Type of content to generate
            context: Context with product/content information
            
        Returns:
            Tuple of (final_prompt, selected_template_name)
        """
        # Get template (with fallback)
        template = get_template(content_type)
        selected_template = content_type if content_type in get_supported_types() else DEFAULT_TEMPLATE
        
        if selected_template != content_type:
            logger.info(f"Content type '{content_type}' not found, using fallback '{selected_template}'")
        
        # Build optional sections
        product_description = ""
        if context.product_description:
            product_description = f"Description: {context.product_description}"
        
        selling_points = ""
        if context.selling_points and len(context.selling_points) > 0:
            points = "\n".join([f"- {point}" for point in context.selling_points])
            selling_points = f"Key Points:\n{points}"
        
        target_audience = ""
        if context.target_audience:
            target_audience = f"Target Audience: {context.target_audience}"

        quality_controls = PromptBuilder._build_quality_controls(context)
        
        # Compile final prompt
        final_prompt = template.format(
            product_name=context.product_name,
            product_description=product_description,
            selling_points=selling_points,
            quality_controls=quality_controls,
            target_audience=target_audience,
        )
        
        # Clean up extra whitespace
        final_prompt = "\n".join([line for line in final_prompt.split("\n") if line.strip()])
        
        logger.debug(f"Built prompt using template '{selected_template}' for content_type '{content_type}'")
        
        return final_prompt, selected_template
    
    @staticmethod
    def get_supported_content_types() -> list:
        """Get list of supported content types."""
        return get_supported_types()

    @staticmethod
    def get_supported_tone_presets() -> list:
        """Get supported tone presets."""
        return get_supported_tone_presets()

    @staticmethod
    def get_supported_length_presets() -> list:
        """Get supported length presets."""
        return get_supported_length_presets()

    @staticmethod
    def get_supported_emoji_presets() -> list:
        """Get supported emoji presets."""
        return get_supported_emoji_presets()
